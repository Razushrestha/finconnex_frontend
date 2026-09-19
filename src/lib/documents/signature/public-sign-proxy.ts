export function isPackedSignToken(token: string) {
  const parts = token.trim().split(".");
  return parts.length === 3 && parts[0] === "sigp1" && Boolean(parts[1] && parts[2]);
}

export function isLocalSignToken(token: string) {
  const value = token.trim();
  return (
    isPackedSignToken(value) || /^sig-[a-zA-Z0-9._-]{1,180}$/i.test(value)
  );
}

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function crmPublicBase() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.CRM_API_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
}

export function unwrapCrmPayload(json: unknown): Record<string, unknown> {
  if (!json || typeof json !== "object") return {};
  const rec = json as Record<string, unknown>;
  if (rec.data && typeof rec.data === "object" && !Array.isArray(rec.data)) {
    return rec.data as Record<string, unknown>;
  }
  return rec;
}

export async function fetchPublicSignature(
  token: string,
  init?: RequestInit,
  suffix = "",
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const base = crmPublicBase();
  if (!base) {
    return { ok: false, status: 503, data: {} };
  }
  try {
    const res = await fetch(
      `${base}/v1/public/signatures/${encodeURIComponent(token)}${suffix}`,
      {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
        cache: "no-store",
      },
    );
    const json = (await res.json().catch(() => ({}))) as unknown;
    return { ok: res.ok, status: res.status, data: unwrapCrmPayload(json) };
  } catch {
    return { ok: false, status: 502, data: {} };
  }
}

export function publicDocumentUrl(data: Record<string, unknown>): string {
  return pickStr(
    data.documentUrl,
    data.fileUrl,
    data.url,
    data.documentFileUrl,
  );
}
