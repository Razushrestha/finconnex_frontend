import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

function safeFileName(name: string) {
  const base = name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "file";
  return base.slice(0, 180);
}

export type LocalStoredFile = {
  key: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
};

export async function saveLocalUpload(
  form: FormData,
): Promise<LocalStoredFile> {
  const entry = form.get("file") ?? form.get("upload") ?? form.get("document");
  if (!(entry instanceof File) || entry.size <= 0) {
    throw new Error("Choose a file to upload.");
  }
  if (entry.size > 10 * 1024 * 1024) {
    throw new Error("Documents can be at most 10 MB");
  }
  const id = randomUUID();
  const fileName = safeFileName(entry.name || "file");
  const dir = path.join(LOCAL_UPLOAD_DIR, id);
  await mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await entry.arrayBuffer());
  await writeFile(path.join(dir, fileName), bytes);
  return {
    key: `local/${id}/${fileName}`,
    url: `/api/auth/local-files/${id}/${encodeURIComponent(fileName)}`,
    fileName,
    contentType: entry.type || "application/octet-stream",
    size: entry.size,
  };
}

export function localUploadDiskPath(id: string, fileName: string) {
  return path.join(LOCAL_UPLOAD_DIR, id, safeFileName(fileName));
}

export function isStorageUnconfigured(status: number, text: string) {
  if (status !== 503 && status !== 501) return false;
  return /notConfigured|not configured|storage/i.test(text);
}
