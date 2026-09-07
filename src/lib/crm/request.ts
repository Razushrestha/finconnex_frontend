import type { CrmSession } from "@/lib/activity-timeline/auth";

type Envelope<T> = {
  statusCode?: number;
  message?: string | string[];
  /** Some endpoints (e.g. automation validate/publish) throw
   * `UnprocessableEntityException({ message, errors })` — a per-field
   * breakdown alongside the generic message. Surface it when present so a
   * validation failure reads as more than one opaque i18n key. */
  errors?: string[];
  data?: T;
};

const FRIENDLY_MESSAGE_KEYS: Record<string, string> = {
  "email.error.relatedTypeMismatch":
    "CRM parent record must be a live UUID. Send without linking this local/demo record.",
  "email.error.unsafeHtml":
    "CRM rejected HTML in the email body. Send as plain text.",
  "email.error.singleToRequired":
    "CRM allows one To address. Extra recipients must go in Cc.",
  "email.error.invalidRecipient": "Recipient is not a valid email address.",
  "meeting.error.relatedTypeMismatch":
    "Related entity and record do not match. Pick the record again, then send invites.",
  "meeting.error.invalidRange":
    "Meeting end time must be after the start time.",
  "meeting.error.invalidTimezone":
    "That timezone is not valid for CRM meetings.",
  "note.error.relatedTypeMismatch":
    "Related entity and record do not match. Pick a live CRM record.",
  "workspace.error.invitationDeliveryFailed":
    "Workspace invitation was created, but the invite email could not be queued. Sending from FinConnex mail instead.",
  "workspace.error.roleRequired":
    "Choose a workspace role before sending the invite.",
};

export function crmErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object") {
    const rec = json as Record<string, unknown>;
    const msg = rec.message;
    const base = Array.isArray(msg) && msg.length
      ? msg.map(String).join(", ")
      : typeof msg === "string" && msg.trim()
        ? FRIENDLY_MESSAGE_KEYS[msg.trim()] ??
          (msg.trim().toLowerCase() !== "bad request" ? msg.trim() : null)
        : null;
    const detail = Array.isArray(rec.errors) && rec.errors.length
      ? rec.errors
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "message" in item) {
              return String((item as { message: unknown }).message);
            }
            return JSON.stringify(item);
          })
          .join(", ")
      : null;
    if (base && detail && base !== detail) return `${base}: ${detail}`;
    if (detail) return detail;
    if (base) return base;
  }
  return fallback;
}

export function unwrapCrmData<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as Envelope<T>).data as T;
  }
  return json as T;
}

async function sendCrm(
  session: Pick<CrmSession, "baseUrl" | "accessToken">,
  path: string,
  init?: RequestInit,
) {
  const res = await fetch(`${session.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { res, json };
}

export async function crmBffFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!path.startsWith("/v1/")) {
    throw new Error(`CRM path must start with /v1/: ${path}`);
  }
  const res = await fetch(`/api/auth/crm${path.slice(3)}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    throw new Error(crmErrorMessage(json, `CRM request failed (${res.status})`));
  }
  return unwrapCrmData<T>(json);
}

/**
 * True once a hard sign-out redirect has been kicked off, so a page full of
 * components each hitting a dead session don't all separately clear cookies
 * and race each other to redirect.
 */
let signOutInFlight = false;

/**
 * The CRM backend revokes a refresh token's whole session on reuse (an
 * anti-theft guard) — once that happens, `ensureCrmSession()` keeps handing
 * back the same locally-still-unexpired access token forever, because it
 * only checks the JWT's own `exp` claim, which knows nothing about a
 * server-side revocation. That token is dead no matter how many times it's
 * retried, so every request that touches it (deals, leads, automations —
 * anything using crmFetch/httpRequest) fails with the raw backend error
 * string surfaced as-is. Force a real sign-out instead of looping on it.
 */
export async function forceSignOutForDeadSession(): Promise<void> {
  if (signOutInFlight || typeof window === "undefined") return;
  signOutInFlight = true;
  try {
    const { clearCrmTokens } = await import("@/lib/activity-timeline/auth");
    clearCrmTokens();
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
  } finally {
    window.location.href = "/login?reason=session_expired";
  }
}

export async function crmFetch<T>(
  session: Pick<CrmSession, "baseUrl" | "accessToken">,
  path: string,
  init?: RequestInit,
): Promise<T> {
  let { res, json } = await sendCrm(session, path, init);

  if ([401, 403, 404, 405].includes(res.status)) {
    const { ensureCrmSession } = await import("@/lib/activity-timeline/auth");
    const next = await ensureCrmSession();
    if (next?.accessToken && next.accessToken !== session.accessToken) {
      ({ res, json } = await sendCrm(
        { ...next, baseUrl: session.baseUrl },
        path,
        init,
      ));
    } else if (res.status === 401) {
      // Retrying handed back the exact same (locally-valid-looking) token —
      // the session itself is revoked server-side, not just momentarily
      // stale. No further retry can fix this; force a clean re-login.
      void forceSignOutForDeadSession();
      throw new Error("Your session has expired. Signing you out — please sign in again.");
    }
  }

  if (!res.ok) {
    throw new Error(crmErrorMessage(json, `CRM request failed (${res.status})`));
  }

  return unwrapCrmData<T>(json);
}
