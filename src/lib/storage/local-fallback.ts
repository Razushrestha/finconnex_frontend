import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

function isServerlessHost() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

/** Vercel/Lambda can only write under /tmp. `process.cwd()` is /var/task (read-only). */
export function getLocalUploadDir() {
  if (isServerlessHost()) {
    return path.join(/* turbopackIgnore: true */ tmpdir(), "finconnex-uploads");
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "uploads",
  );
}

/** @deprecated use getLocalUploadDir() — cwd/data is not writable on Vercel. */
export const LOCAL_UPLOAD_DIR = getLocalUploadDir();

const memoryFiles = new Map<string, Buffer>();

function safeFileName(name: string) {
  const base = name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "file";
  return base.slice(0, 180);
}

function memoryKey(id: string, fileName: string) {
  return `${id}/${safeFileName(fileName)}`;
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
  const bytes = Buffer.from(await entry.arrayBuffer());
  memoryFiles.set(memoryKey(id, fileName), bytes);

  const dir = path.join(/* turbopackIgnore: true */ getLocalUploadDir(), id);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(/* turbopackIgnore: true */ dir, fileName),
      bytes,
    );
  } catch {
    if (!isServerlessHost()) {
      throw new Error(
        "Could not save the file on this server. Check that the data/uploads folder is writable.",
      );
    }
    /* Serverless: in-memory copy is enough for this instance. */
  }

  return {
    key: `local/${id}/${fileName}`,
    url: `/api/auth/local-files/${id}/${encodeURIComponent(fileName)}`,
    fileName,
    contentType: entry.type || "application/octet-stream",
    size: entry.size,
  };
}

export function localUploadDiskPath(id: string, fileName: string) {
  return path.join(
    /* turbopackIgnore: true */ getLocalUploadDir(),
    id,
    safeFileName(fileName),
  );
}

export async function readLocalUpload(
  id: string,
  fileName: string,
): Promise<Buffer> {
  const fromMemory = memoryFiles.get(memoryKey(id, fileName));
  if (fromMemory) return fromMemory;
  return readFile(localUploadDiskPath(id, fileName));
}

export function isStorageUnconfigured(status: number, text: string) {
  const body = text.toLowerCase();
  if (
    /enoent|erofs|read-only file system|mkdir ['"]?\/var\/task|eacces/.test(
      body,
    )
  ) {
    return status >= 400;
  }
  if (status !== 503 && status !== 501 && status !== 500) return false;
  return /notconfigured|not configured|storage/.test(body);
}
