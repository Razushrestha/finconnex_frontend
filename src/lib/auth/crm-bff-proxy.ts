import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  decodeJwtPayload,
  resolveLiveCrmAuth,
} from "@/lib/auth/crm-server";
import { sessionRememberMe } from "@/lib/auth/constants";
import {
  createTwilioVoiceCall,
  parseDialPath,
  pickCallPhone,
  twilioVoiceFromNextEnv,
} from "@/lib/calls/twilio-voice-fallback";
import {
  catalogFromPatchBody,
  mergeFallbackCatalog,
  pagePayload,
  pageValuesFromPutBody,
  pagesListPayload,
  readFallbackCatalog,
  settingsProxyKind,
  stripCatalogFromPatchBody,
  withCatalogOnSettings,
  writeFallbackPage,
} from "@/lib/settings/catalog-fallback";
import {
  isStorageUnconfigured,
  saveLocalUpload,
} from "@/lib/storage/local-fallback";

const ALLOWED_ROOTS = new Set([
  "leads",
  "deals",
  "calls",
  "companies",
  "contacts",
  "smart-hubs",
  "smart-short-links",
  "emails",
  "tasks",
  "meetings",
  "calendly",
  "calendar-sync",
  "integrations",
  "documents",
  "document-requests",
  "messages",
  "notes",
  "reminders",
  "dashboard",
  "public",
  "storage",
  "signature-requests",
  "signature-templates",
  "settings",
  "calculations",
  "user",
]);

function crmBaseUrl(): string | null {
  const raw =
    process.env.CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "https://finconnex.payperless.app";
  return raw.replace(/\/$/, "") || null;
}

function isAllowed(path: string[]): boolean {
  const root = path[0];
  if (!root) return false;
  if (root === "workspaces") {
    return (
      path.includes("calls") ||
      path.includes("emails") ||
      path.includes("tasks") ||
      path.includes("meetings") ||
      path.includes("calendly") ||
      path.includes("integrations") ||
      path.includes("documents") ||
      path.includes("document-requests") ||
      path.includes("signature-requests") ||
      path.includes("signature-templates") ||
      path.includes("messages") ||
      path.includes("notes") ||
      path.includes("reminders") ||
      path.includes("dashboard") ||
      path[2] === "members" ||
      path[2] === "members-summary" ||
      path[2] === "members-admin" ||
      path[2] === "ownership-transfer"
    );
  }
  if (!ALLOWED_ROOTS.has(root)) return false;
  if (root === "public") {
    return path[1] === "smart-hubs" || path[1] === "smart-short-links";
  }
  return true;
}

export async function proxyCrmV1(
  request: Request,
  path: string[],
): Promise<NextResponse> {
  if (!isAllowed(path)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const base = crmBaseUrl();
  if (!base) {
    return NextResponse.json(
      { message: "CRM API URL is not configured" },
      { status: 503 },
    );
  }

  const isPublic = path[0] === "public";
  let auth: Awaited<ReturnType<typeof resolveLiveCrmAuth>> = null;
  let rememberMe = false;

  if (!isPublic) {
    const session = await getSession();
    rememberMe = sessionRememberMe(session);
    if (!session) {
      return NextResponse.json(
        { message: "Sign in to continue" },
        { status: 401 },
      );
    }
    auth = await resolveLiveCrmAuth();
    if (!auth?.accessToken) {
      return NextResponse.json(
        { message: "Invalid or missing access token" },
        { status: 401 },
      );
    }
  }

  const storageUpload =
    request.method === "POST" &&
    path[0] === "storage" &&
    path[1] === "upload";
  const storageFallbackReq = storageUpload ? request.clone() : null;

  const search = new URL(request.url).search;
  const target = `${base}/v1/${path.map(encodeURIComponent).join("/")}${search}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  const incomingType = request.headers.get("content-type");
  if (incomingType) headers["Content-Type"] = incomingType;

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const isMultipart = incomingType?.includes("multipart/form-data") === true;
  const body = !hasBody
    ? undefined
    : isMultipart
      ? await request.arrayBuffer()
      : (await request.text()) || undefined;

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body,
  });

  let text = await upstream.text();
  let status = upstream.status;

  if (
    storageFallbackReq &&
    (isStorageUnconfigured(status, text) || (status >= 500 && status < 600))
  ) {
    try {
      const stored = await saveLocalUpload(await storageFallbackReq.formData());
      text = JSON.stringify({
        statusCode: 201,
        message: "Stored on FinConnex while CRM file storage is offline.",
        data: stored,
      });
      status = 201;
      } catch (err) {
        const raw =
          err instanceof Error ? err.message : "Could not store the file locally after CRM storage failed.";
        text = JSON.stringify({
          message: /enoent|mkdir ['"]?\/var\/task|erofs/i.test(raw)
            ? "Could not save the file on this host. Retry the upload."
            : raw,
        });
      status = 502;
    }
  }

  const dial = parseDialPath(path);
  if (request.method === "POST" && dial && status >= 500 && auth?.accessToken) {
    const cfg = twilioVoiceFromNextEnv();
    if (!cfg) {
      text = JSON.stringify({
        message:
          "Hosted CRM Voice is not configured, and local Twilio Voice env is incomplete (need account, from-number, and TwiML URL).",
      });
    } else {
      const callPath = dial.workspaceId
        ? `${base}/v1/workspaces/${encodeURIComponent(dial.workspaceId)}/calls/${encodeURIComponent(dial.callId)}`
        : `${base}/v1/calls/${encodeURIComponent(dial.callId)}`;
      try {
        const callRes = await fetch(callPath, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${auth.accessToken}`,
          },
        });
        const callText = await callRes.text();
        const callJson = callRes.ok ? JSON.parse(callText) : null;
        const to = pickCallPhone(callJson);
        if (!to) {
          text = JSON.stringify({
            message:
              "CRM call has no E.164 phone. Set a number on the call, or TWILIO_SMS_TO in .env.local.",
          });
        } else {
          const placed = await createTwilioVoiceCall(to);
          const envelope =
            callJson && typeof callJson === "object"
              ? (callJson as Record<string, unknown>)
              : { data: {} };
          const data =
            envelope.data && typeof envelope.data === "object"
              ? (envelope.data as Record<string, unknown>)
              : envelope;
          data.voiceProviderSid = placed.sid;
          data.voiceProviderStatus = placed.status;
          envelope.data = data;
          envelope.message = "Twilio Voice queued from FinConnex.";
          text = JSON.stringify(envelope);
          status = 201;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Twilio Voice fallback failed.";
        text = JSON.stringify({ message });
        status = 502;
      }
    }
  }

  const settingsKind = settingsProxyKind(path);
  const workspaceId = auth?.accessToken
    ? (() => {
        const id = decodeJwtPayload(auth.accessToken)?.workspaceId;
        return typeof id === "string" && id ? id : null;
      })()
    : null;

  if (settingsKind && workspaceId && auth) {
    const localCatalog = await readFallbackCatalog(workspaceId);

    if (settingsKind.kind === "root" && method === "GET" && status < 400) {
      text = withCatalogOnSettings(text, localCatalog);
    }

    if (settingsKind.kind === "root" && method === "PATCH") {
      const incoming = catalogFromPatchBody(
        typeof body === "string" ? body : undefined,
      );
      if (Object.keys(incoming).length) {
        await mergeFallbackCatalog(workspaceId, incoming);
      }
      if (status >= 400 && Object.keys(incoming).length) {
        const stripped = stripCatalogFromPatchBody(
          typeof body === "string" ? body : undefined,
        );
        const retry = await fetch(`${base}/v1/settings`, {
          method: "PATCH",
          headers,
          body: stripped,
        });
        const retryText = await retry.text();
        const merged = await readFallbackCatalog(workspaceId);
        if (retry.ok) {
          status = retry.status;
          text = withCatalogOnSettings(retryText, merged);
        } else {
          const fresh = await fetch(`${base}/v1/settings`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: headers.Authorization,
            },
          });
          text = withCatalogOnSettings(await fresh.text(), merged);
          status = 200;
        }
      } else if (status < 400) {
        text = withCatalogOnSettings(
          text,
          await readFallbackCatalog(workspaceId),
        );
      }
    }

    if (settingsKind.kind === "pages" && method === "GET") {
      const merged = await readFallbackCatalog(workspaceId);
      if (status >= 400) {
        text = pagesListPayload(merged);
        status = 200;
      } else {
        text = withCatalogOnSettings(text, merged);
      }
    }

    if (settingsKind.kind === "page") {
      const pageKey = `${settingsKind.category}/${settingsKind.subpage}`;
      if (method === "GET") {
        const merged = await readFallbackCatalog(workspaceId);
        if (status >= 400) {
          text = pagePayload(pageKey, merged[pageKey] ?? {});
          status = 200;
        }
      }
      if (method === "PUT" && status >= 400) {
        const values = pageValuesFromPutBody(
          typeof body === "string" ? body : undefined,
        );
        const merged = await writeFallbackPage(workspaceId, pageKey, values);
        const fresh = await fetch(`${base}/v1/settings`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: headers.Authorization,
          },
        });
        text = withCatalogOnSettings(await fresh.text(), merged, {
          key: pageKey,
          values,
        });
        status = 200;
      }
    }
  }

  const response = new NextResponse(text, {
    status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "application/json",
    },
  });

  if (auth?.accessToken) {
    applyCrmTokenCookies(
      response,
      {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
      },
      rememberMe,
    );
  }

  return response;
}
