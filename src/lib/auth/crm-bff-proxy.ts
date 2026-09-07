import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  resolveLiveCrmAuth,
} from "@/lib/auth/crm-server";
import {
  createTwilioVoiceCall,
  parseDialPath,
  pickCallPhone,
  twilioVoiceFromNextEnv,
} from "@/lib/calls/twilio-voice-fallback";

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
  "messages",
  "notes",
  "reminders",
  "dashboard",
  "public",
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

  if (!isPublic) {
    const session = await getSession();
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

  const search = new URL(request.url).search;
  const target = `${base}/v1/${path.map(encodeURIComponent).join("/")}${search}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  const incomingType = request.headers.get("content-type");
  if (incomingType) headers["Content-Type"] = incomingType;

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: body || undefined,
  });

  let text = await upstream.text();
  let status = upstream.status;

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

  const response = new NextResponse(text, {
    status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "application/json",
    },
  });

  if (auth?.accessToken) {
    applyCrmTokenCookies(response, {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    });
  }

  return response;
}
