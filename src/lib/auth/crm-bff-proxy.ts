import { NextResponse } from "next/server";
import {
  accessTokenFromRequest,
  crmBaseUrl,
  isHostedMissingCrmGet,
  normalizeCrmProxyPath,
  tryMissingCrmFallback,
} from "@/lib/auth/crm-bff-helpers";
import { getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  decodeJwtPayload,
  isCrmJwtExpired,
  refreshCrmTokens,
  resolveLiveCrmAuth,
} from "@/lib/auth/crm-server";
import { sessionRememberMe } from "@/lib/auth/constants";
import { isPlatformAdminRole } from "@/lib/auth/platform";
import {
  createTwilioVoiceCall,
  parseDialPath,
  pickCallPhone,
  twilioVoiceFromNextEnv,
} from "@/lib/calls/twilio-voice-fallback";
import {
  catalogFromPatchBody,
  mergeFallbackCatalog,
  pageValuesFromPutBody,
  readFallbackCatalog,
  settingsGetFallbackPayload,
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
  "booking",
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
  "field-permissions",
  "workspace-backups",
  "security",
  "audit-logs",
  "recycle-bin",
  "custom-fields",
  "lead-assignment-rules",
  "automations",
  "automation-runs",
  "notification-preferences",
  "notifications",
  "admin",
  "client-portals",
  "reports",
  "campaigns",
  "forms",
  "segments",
  "inbox",
  "templates",
  "estimates",
  "quotes",
  "invoices",
  "payments",
  "products",
  "credit-notes",
]);

function isAllowed(path: string[]): boolean {
  const root = path[0];
  if (!root) return false;
  if (root === "workspaces") {
    return (
      path.includes("calls") ||
      path.includes("emails") ||
      path.includes("tasks") ||
      path.includes("meetings") ||
      path.includes("booking") ||
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
      path.includes("pipelines") ||
      path.includes("tickets") ||
      path.includes("contacts") ||
      path.includes("notification-preferences") ||
      path.includes("preferences") ||
      path.includes("reports") ||
      path.includes("report-executions") ||
      path[2] === "members" ||
      path[2] === "members-summary" ||
      path[2] === "members-admin" ||
      path[2] === "ownership-transfer" ||
      path[2] === "work-queue"
    );
  }
  if (root === "admin") {
    return (
      (path[1] === "workspaces" && path.length === 2) ||
      (path[1] === "user" && path.length === 3)
    );
  }
  if (!ALLOWED_ROOTS.has(root)) return false;
  if (root === "public") {
    return (
      path[1] === "smart-hubs" ||
      path[1] === "smart-short-links" ||
      path[1] === "forms" ||
      path[1] === "sales"
    );
  }
  return true;
}

function withCrmCookies(
  response: NextResponse,
  auth: Awaited<ReturnType<typeof resolveLiveCrmAuth>>,
  rememberMe: boolean,
) {
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

export async function proxyCrmV1(
  request: Request,
  rawPath: string[] | string | undefined,
): Promise<NextResponse> {
  const path = normalizeCrmProxyPath(rawPath);
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
  let sessionWorkspaceId: string | null = null;

  if (!isPublic) {
    const session = await getSession();
    rememberMe = sessionRememberMe(session);
    sessionWorkspaceId = session?.tenantId?.trim() || null;

    if (path[0] === "admin") {
      if (!session) {
        return NextResponse.json(
          { message: "Sign in to continue" },
          { status: 401 },
        );
      }
      if (!isPlatformAdminRole(session.role)) {
        return NextResponse.json(
          { message: "Platform admin access required" },
          { status: 403 },
        );
      }
    }

    auth = await resolveLiveCrmAuth();
    const headerToken = accessTokenFromRequest(request);
    // Prefer the browser Bearer token. Access JWTs often cannot fit in cookies,
    // so localStorage + Authorization is the live session. Keep an expired
    // header token so we can refresh it instead of treating the user as logged out.
    if (headerToken) {
      auth = {
        accessToken: headerToken,
        refreshToken: auth?.refreshToken ?? null,
      };
    }

    if (
      auth?.accessToken &&
      isCrmJwtExpired(auth.accessToken) &&
      auth.refreshToken
    ) {
      try {
        const rotated = await refreshCrmTokens(auth.refreshToken);
        auth = {
          accessToken: rotated.accessToken,
          refreshToken: rotated.refreshToken,
        };
      } catch {
        /* keep the header/cookie access token */
      }
    }

    if (!session && !auth?.accessToken) {
      const empty = tryMissingCrmFallback(path, request.method.toUpperCase());
      if (empty) return empty;
      return NextResponse.json(
        { message: "Session has expired. Sign in again." },
        { status: 401 },
      );
    }

    const settingsKindEarly = settingsProxyKind(path);
    if (!auth?.accessToken) {
      if (
        session &&
        settingsKindEarly &&
        request.method.toUpperCase() === "GET"
      ) {
        const workspaceKey = sessionWorkspaceId || session.userId || "local";
        const catalog = await readFallbackCatalog(workspaceKey);
        return new NextResponse(
          settingsGetFallbackPayload(settingsKindEarly, workspaceKey, catalog),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      const storageUploadEarly =
        request.method === "POST" &&
        path[0] === "storage" &&
        path[1] === "upload";
      if (session && storageUploadEarly) {
        try {
          const stored = await saveLocalUpload(await request.formData());
          return NextResponse.json(
            {
              statusCode: 201,
              message: "Stored on FinConnex while the CRM token refreshes.",
              data: stored,
            },
            { status: 201 },
          );
        } catch (err) {
          const raw =
            err instanceof Error
              ? err.message
              : "Could not store the file locally.";
          return NextResponse.json({ message: raw }, { status: 502 });
        }
      }
      const empty = tryMissingCrmFallback(path, request.method.toUpperCase());
      if (empty) return empty;
      return NextResponse.json(
        {
          message:
            "CRM session token unavailable. Sign out and sign in again so email sending can refresh your token.",
        },
        { status: 401 },
      );
    }
  }

  const method = request.method.toUpperCase();
  if (isHostedMissingCrmGet(path, method)) {
    const empty = tryMissingCrmFallback(path, method);
    if (empty) return withCrmCookies(empty, auth, rememberMe);
  }

  const settingsKindSkip = settingsProxyKind(path);
  if (settingsKindSkip && method === "GET") {
    const workspaceKey = sessionWorkspaceId || "local";
    const catalog = await readFallbackCatalog(workspaceKey);
    return withCrmCookies(
      new NextResponse(
        settingsGetFallbackPayload(settingsKindSkip, workspaceKey, catalog),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
      auth,
      rememberMe,
    );
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

  if (status === 401 && auth?.refreshToken) {
    try {
      const rotated = await refreshCrmTokens(auth.refreshToken);
      auth = {
        accessToken: rotated.accessToken,
        refreshToken: rotated.refreshToken,
      };
      headers.Authorization = `Bearer ${rotated.accessToken}`;
      const retried = await fetch(target, {
        method: request.method,
        headers,
        body,
      });
      text = await retried.text();
      status = retried.status;
    } catch {
      /* keep the original 401 */
    }
  }

  if (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 405 ||
    status === 501
  ) {
    const empty = tryMissingCrmFallback(path, method);
    if (empty) return withCrmCookies(empty, auth, rememberMe);
  }

  if (
    storageFallbackReq &&
    (isStorageUnconfigured(status, text) ||
      (status >= 500 && status < 600) ||
      ((status === 401 || status === 403) && Boolean(sessionWorkspaceId)))
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
  const workspaceId =
    (auth?.accessToken
      ? (() => {
          const id = decodeJwtPayload(auth.accessToken)?.workspaceId;
          return typeof id === "string" && id ? id : null;
        })()
      : null) ||
    sessionWorkspaceId ||
    "local";

  if (settingsKind && method === "GET") {
    const localCatalog = await readFallbackCatalog(workspaceId);
    if (status >= 400) {
      text = settingsGetFallbackPayload(settingsKind, workspaceId, localCatalog);
      status = 200;
    } else if (settingsKind.kind === "root" || settingsKind.kind === "pages") {
      text = withCatalogOnSettings(text, localCatalog);
    }
  }

  if (settingsKind?.kind === "root" && auth && method === "PATCH") {
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

  if (settingsKind?.kind === "page" && auth && method === "PUT" && status >= 400) {
    const pageKey = `${settingsKind.category}/${settingsKind.subpage}`;
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
