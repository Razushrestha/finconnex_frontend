import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
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

export function storageUploadBffPath(): string {
  return "/api/auth/crm/storage/upload";
}

function toFormData(file: File): FormData {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("filename", file.name);
  form.append("name", file.name);
  return form;
}

async function parseUploadResponse(res: Response) {
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

async function sendDirectUpload(
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
  return parseUploadResponse(res);
}

async function sendBffUpload(form: FormData) {
  const res = await fetch(storageUploadBffPath(), {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
    body: form,
  });
  return parseUploadResponse(res);
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

export async function uploadCrmStorageFile(
  file: File,
): Promise<CrmStorageObject> {
  const form = toFormData(file);

  try {
    // Always go through the same-origin BFF so Vercel can fall back to /tmp
    // when CRM disk storage returns ENOENT (/var/task/data is read-only).
    let parsed = await sendBffUpload(form);
    if ([401, 403].includes(parsed.res.status) && isBoundCrmSession()) {
      const auth = await resolveAuth();
      if (auth) parsed = await sendDirectUpload(auth, form);
    }

    const { res, json } = parsed;
    if (!res.ok) {
      throw new Error(crmErrorMessage(json, `Upload failed (${res.status})`));
    }
    const stored = normalizeCrmStorageObject(unwrapCrmData(json) ?? json, file.name);
    if (!stored.key) {
      throw new Error("Upload succeeded but CRM did not return a storage key");
    }
    return stored;
  } catch (err) {
    if (err instanceof Error && err.message && err.message !== "Failed to fetch") {
      throw err;
    }
    throw new Error(
      "Could not upload the file to CRM storage. Stay signed in and try again.",
    );
  }
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
