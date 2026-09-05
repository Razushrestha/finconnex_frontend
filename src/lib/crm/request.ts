import type { CrmSession } from "@/lib/activity-timeline/auth";

type Envelope<T> = {
  statusCode?: number;
  message?: string | string[];
  data?: T;
};

export function crmErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object") {
    const rec = json as Record<string, unknown>;
    const msg = rec.message;
    if (Array.isArray(msg) && msg.length) {
      return msg.map(String).join(", ");
    }
    if (typeof msg === "string" && msg.trim()) {
      const text = msg.trim();
      if (text.toLowerCase() !== "bad request") return text;
    }
    if (Array.isArray(rec.errors) && rec.errors.length) {
      return rec.errors
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "message" in item) {
            return String((item as { message: unknown }).message);
          }
          return JSON.stringify(item);
        })
        .join(", ");
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
    }
  }

  if (!res.ok) {
    throw new Error(crmErrorMessage(json, `CRM request failed (${res.status})`));
  }

  return unwrapCrmData<T>(json);
}
