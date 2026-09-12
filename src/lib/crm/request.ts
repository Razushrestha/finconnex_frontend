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
  "reminder.error.parentRequired":
    "Link this reminder to a live Task, Call, or Meeting.",
  "reminder.error.invalidRemindAt":
    "Reminder time must be a valid date and time.",
  "workspace.error.invitationDeliveryFailed":
    "Workspace invitation was created, but the invite email could not be queued. Sending from FinConnex mail instead.",
  "workspace.error.roleRequired":
    "Choose a workspace role before sending the invite.",
  "message.error.invalidRecipient":
    "CRM SMS needs a live contact, or Nest with TWILIO_SMS_TO set.",
  "lead.error.conversationPhoneRequired":
    "This CRM lead has no phone number, so Twilio did not send.",
  "call.error.relatedTypeMismatch":
    "Link this call to a live CRM lead, contact, company, or deal — or omit the related record.",
  "call.error.voiceDispatchUnavailable":
    "CRM cannot place this Twilio Voice call. It must be outbound, have an E.164 phone, and not already be dispatched.",
  "sms.error.voiceNotConfigured":
    "Hosted CRM is missing Twilio Voice env (TWIML URL, from-number, or status callback). FinConnex can place the call from local Twilio settings if those are set.",
  "sms.error.voiceFromNotConfigured":
    "Set TWILIO_VOICE_FROM to an E.164 number (the Twilio Voice caller ID).",
  "sms.error.voiceTwimlNotConfigured":
    "Set TWILIO_VOICE_TWIML_URL to an https TwiML URL, then restart the CRM API.",
  "sms.error.voiceStatusCallbackNotConfigured":
    "Set TWILIO_VOICE_STATUS_CALLBACK_URL to an https webhook, then restart the CRM API.",
  "sms.error.voiceRecipientInvalid":
    "The destination number is not valid E.164 for Twilio Voice.",
  "call.error.voiceDispatchUnknown":
    "Twilio accepted the dial request, but CRM could not record the Call SID. Check the call again before retrying.",
  "call.error.invalidTransition":
    "This call is not in a state that can be started.",
  "storage.error.notConfigured":
    "File storage is not configured on the CRM server. Set DigitalOcean Spaces (DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_BUCKET) on that API.",
  "storage.error.invalidFile":
    "That file type or size is not allowed. Use PDF, Word, image, or spreadsheet files.",
  "sms.error.phoneNumberNotConfigured":
    "Twilio from-number is missing on the CRM server.",
  "calendly.error.notConfigured":
    "Calendly OAuth is not configured on the CRM server. Use a personal access token, or set Calendly client id/secret on that API.",
  "calendar.error.notConfigured":
    "Google/Outlook calendar OAuth is not configured on the CRM server.",
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
    if (base) {
      if (/enoent|mkdir ['"]?\/var\/task|erofs|read-only file system/i.test(base)) {
        return "File storage cannot write on this host. Retry the upload — FinConnex will keep the file without using /var/task/data.";
      }
      return base;
    }
    const status = rec.statusCode;
    if (status === 503) {
      return "This integration is not configured on the CRM server yet.";
    }
    if (status === 400) {
      return "CRM rejected this request. Check the token or connection settings.";
    }
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
    const { refreshCrmSession } = await import("@/lib/activity-timeline/auth");
    const next = await refreshCrmSession();
    if (next?.accessToken && next.accessToken !== session.accessToken) {
      ({ res, json } = await sendCrm(
        { ...next, baseUrl: session.baseUrl },
        path,
        init,
      ));
    } else if (res.status === 401) {
      throw new Error("CRM request was not authorized. Try again, or sign in again if this continues.");
    }
  }

  if (!res.ok) {
    throw new Error(crmErrorMessage(json, `CRM request failed (${res.status})`));
  }

  return unwrapCrmData<T>(json);
}
