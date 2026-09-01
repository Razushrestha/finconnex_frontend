import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmErrorMessage, unwrapCrmData } from "@/lib/crm/request";

export type CrmStorageObject = {
  key: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function storageUploadPath(): string {
  return "/v1/storage/upload";
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

export function normalizeCrmStorageObject(
  raw: unknown,
  fallbackName = "file",
): CrmStorageObject {
  const rec =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const nested =
    rec.file && typeof rec.file === "object"
      ? (rec.file as Record<string, unknown>)
      : rec.object && typeof rec.object === "object"
        ? (rec.object as Record<string, unknown>)
        : rec;
  const fileName = pickStr(
    nested.fileName,
    nested.filename,
    nested.name,
    rec.fileName,
    fallbackName,
  );
  const url = pickStr(
    nested.url,
    nested.storageUrl,
    nested.href,
    nested.location,
    rec.url,
    rec.storageUrl,
  );
  const key = pickStr(
    nested.key,
    nested.storageKey,
    nested.objectKey,
    nested.fileKey,
    rec.key,
    rec.storageKey,
    url,
  );
  return {
    key,
    url: url || key,
    fileName,
    contentType: pickStr(
      nested.contentType,
      nested.mimeType,
      rec.contentType,
      "application/octet-stream",
    ),
    size: pickNum(nested.size ?? nested.byteSize ?? rec.size ?? rec.byteSize),
  };
}

async function sendUpload(
  auth: { baseUrl: string; accessToken: string },
  form: FormData,
) {
  const res = await fetch(`${auth.baseUrl}${storageUploadPath()}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
    },
    body: form,
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

export async function uploadCrmStorageFile(
  file: File,
): Promise<CrmStorageObject> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to upload a file");
  const form = new FormData();
  form.append("file", file);
  form.append("filename", file.name);
  form.append("name", file.name);

  let { res, json } = await sendUpload(auth, form);
  if ([401, 403].includes(res.status)) {
    const retried = await resolveAuth();
    if (retried?.accessToken && retried.accessToken !== auth.accessToken) {
      ({ res, json } = await sendUpload(retried, form));
    }
  }
  if (!res.ok) {
    throw new Error(crmErrorMessage(json, `Upload failed (${res.status})`));
  }
  return normalizeCrmStorageObject(unwrapCrmData(json) ?? json, file.name);
}

export async function tryCrmStorage<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
