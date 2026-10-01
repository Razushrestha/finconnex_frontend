import "server-only";

import { crmBaseUrl } from "@/lib/auth/crm-bff-helpers";
import { resolveLiveCrmAuth } from "@/lib/auth/crm-server";
import type { SavedEmailSignature } from "@/lib/emails/signature-store";

const PATH = "emails/compose-signatures";

type CrmRow = {
  id?: string;
  name?: string;
  mime?: string;
  createdAt?: string;
  imageBase64?: string;
};

function unwrap(json: unknown): unknown {
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: unknown }).data;
  }
  return json;
}

function asRow(value: unknown): SavedEmailSignature | null {
  if (!value || typeof value !== "object") return null;
  const row = value as CrmRow;
  if (!row.id || !row.mime) return null;
  return {
    id: row.id,
    name: row.name?.trim() || "Signature",
    mime: row.mime,
    createdAt: row.createdAt || new Date().toISOString(),
  };
}

async function crm(path: string, init?: RequestInit): Promise<Response | null> {
  const base = crmBaseUrl();
  const auth = await resolveLiveCrmAuth();
  if (!base || !auth?.accessToken) return null;
  try {
    return await fetch(`${base}/v1/${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${auth.accessToken}`,
      },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return null;
  }
}

/** Null means the CRM route is not available yet, so the caller keeps the local file. */
export async function listCrmComposeSignatures(): Promise<SavedEmailSignature[] | null> {
  const res = await crm(PATH);
  if (!res || !res.ok) return null;
  const json = unwrap(await res.json().catch(() => null));
  if (!Array.isArray(json)) return null;
  return json.flatMap((item) => {
    const row = asRow(item);
    return row ? [row] : [];
  });
}

export async function saveCrmComposeSignature(
  file: File,
): Promise<SavedEmailSignature | null> {
  const body = new FormData();
  body.set("file", file);
  const res = await crm(PATH, { method: "POST", body });
  if (!res || res.status === 404 || res.status === 401 || res.status >= 500) {
    return null;
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "message" in json
        ? String((json as { message: unknown }).message)
        : "Could not save the signature.";
    throw new Error(message);
  }
  const row = asRow(unwrap(json));
  if (!row) throw new Error("Could not save the signature.");
  return row;
}

export async function readCrmComposeSignature(
  id: string,
): Promise<{ mime: string; bytes: Buffer } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const res = await crm(`${PATH}/${encodeURIComponent(id)}`);
  if (!res?.ok) return null;
  const data = unwrap(await res.json().catch(() => null)) as CrmRow | null;
  if (!data?.imageBase64 || !data.mime) return null;
  const bytes = Buffer.from(data.imageBase64, "base64");
  if (!bytes.length) return null;
  return { mime: data.mime, bytes };
}
