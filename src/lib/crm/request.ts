import type { CrmSession } from "@/lib/activity-timeline/auth";

type Envelope<T> = {
  statusCode?: number;
  message?: string | string[];
  data?: T;
};

export function crmErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object" && "message" in json) {
    const msg = (json as Envelope<unknown>).message;
    if (typeof msg === "string" && msg.trim()) return msg;
    if (Array.isArray(msg) && msg.length) return msg.map(String).join(", ");
  }
  return fallback;
}

export function unwrapCrmData<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as Envelope<T>).data as T;
  }
  return json as T;
}

export async function crmFetch<T>(
  session: Pick<CrmSession, "baseUrl" | "accessToken">,
  path: string,
  init?: RequestInit,
): Promise<T> {
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

  if (!res.ok) {
    throw new Error(crmErrorMessage(json, `CRM request failed (${res.status})`));
  }

  return unwrapCrmData<T>(json);
}
