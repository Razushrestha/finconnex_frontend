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

export function crmErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object" && "message" in json) {
    const envelope = json as Envelope<unknown>;
    const msg = envelope.message;
    const base = typeof msg === "string" && msg.trim()
      ? msg
      : Array.isArray(msg) && msg.length
        ? msg.map(String).join(", ")
        : null;
    const detail = Array.isArray(envelope.errors) && envelope.errors.length
      ? envelope.errors.join(", ")
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
      ({ res, json } = await sendCrm(next, path, init));
    }
  }

  if (!res.ok) {
    throw new Error(crmErrorMessage(json, `CRM request failed (${res.status})`));
  }

  return unwrapCrmData<T>(json);
}
