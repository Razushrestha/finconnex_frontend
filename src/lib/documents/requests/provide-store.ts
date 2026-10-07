import "server-only";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type {
  ClientProvideBundle,
  ClientProvideFile,
} from "@/lib/documents/requests/provide-overlay";

type StoredFile = ClientProvideFile & { storedName: string };

type ProvideManifest = {
  requestId: string;
  requestedCount: number;
  files: StoredFile[];
};

const memory = new Map<string, ProvideManifest>();
const memoryBytes = new Map<string, Buffer>();

function isServerlessHost() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

function storeDir() {
  // Vercel runs the function from /var/task, which is read-only.
  // mkdir '/var/task/data' throws ENOENT. /tmp is the writable disk.
  if (isServerlessHost()) {
    return path.join(/* turbopackIgnore: true */ tmpdir(), "finconnex-document-provide");
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "document-provide",
  );
}

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
}

function requestDir(requestId: string) {
  return path.join(/* turbopackIgnore: true */ storeDir(), safeName(requestId));
}

function manifestPath(requestId: string) {
  return path.join(requestDir(requestId), "manifest.json");
}

async function readManifest(requestId: string): Promise<ProvideManifest | null> {
  const key = safeName(requestId);
  if (!key) return null;
  const cached = memory.get(key);
  if (cached) return cached;
  try {
    const parsed = JSON.parse(await readFile(manifestPath(key), "utf8")) as ProvideManifest;
    if (!parsed?.requestId || !Array.isArray(parsed.files)) return null;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function saveProvideFiles(input: {
  requestId: string;
  requestedCount: number;
  files: Array<ClientProvideFile & { bytes: Buffer }>;
}) {
  const key = safeName(input.requestId);
  if (!key) throw new Error("Missing document request id");
  const dir = requestDir(key);
  const existing = await readManifest(key);
  const files = new Map((existing?.files ?? []).map((file) => [file.itemId, file]));
  for (const file of input.files) {
    const storedName = `${safeName(file.itemId) || "file"}-${safeName(file.fileName) || "upload"}`;
    memoryBytes.set(`${key}/${storedName}`, file.bytes);
    files.set(file.itemId, {
      itemId: file.itemId,
      title: file.title,
      fileName: file.fileName,
      contentType: file.contentType,
      uploadedAt: file.uploadedAt,
      storedName,
    });
  }
  const manifest: ProvideManifest = {
    requestId: input.requestId,
    requestedCount: input.requestedCount,
    files: [...files.values()],
  };
  memory.set(key, manifest);
  try {
    await mkdir(dir, { recursive: true });
    for (const file of manifest.files) {
      const bytes = memoryBytes.get(`${key}/${file.storedName}`);
      if (bytes) await writeFile(path.join(dir, file.storedName), bytes);
    }
    await writeFile(manifestPath(key), JSON.stringify(manifest));
  } catch (error) {
    if (!isServerlessHost()) {
      const detail = error instanceof Error ? error.message : "";
      throw new Error(
        /ENOENT|EACCES|EROFS|read-only/i.test(detail)
          ? "The server could not store these documents. Try again."
          : detail || "Could not save the documents.",
      );
    }
  }
  return manifest;
}

export async function listProvideBundles(): Promise<ClientProvideBundle[]> {
  const dir = storeDir();
  const byId = new Map<string, ProvideManifest>();
  for (const manifest of memory.values()) byId.set(manifest.requestId, manifest);
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    names = [];
  }
  for (const name of names) {
    const manifest = await readManifest(name);
    if (manifest) byId.set(manifest.requestId, manifest);
  }
  return [...byId.values()].map(toBundle);
}

function toBundle(manifest: ProvideManifest): ClientProvideBundle {
  return {
    requestId: manifest.requestId,
    requestedCount: manifest.requestedCount,
    files: manifest.files.map((file) => ({
      itemId: file.itemId,
      title: file.title,
      fileName: file.fileName,
      contentType: file.contentType,
      uploadedAt: file.uploadedAt,
    })),
  };
}

export async function readProvideFile(
  requestId: string,
  itemId: string,
  title?: string,
) {
  const manifest = await readManifest(requestId);
  const wanted = title?.trim().toLowerCase();
  const file =
    manifest?.files.find((row) => row.itemId === itemId) ??
    manifest?.files.find(
      (row) => wanted && row.title.trim().toLowerCase() === wanted,
    );
  if (!file) return null;
  const key = safeName(requestId);
  const cached = key ? memoryBytes.get(`${key}/${file.storedName}`) : undefined;
  if (cached) return { file, bytes: cached };
  const dir = path.resolve(requestDir(requestId));
  const full = path.resolve(dir, file.storedName);
  if (!full.startsWith(`${dir}${path.sep}`)) return null;
  try {
    const bytes = await readFile(full);
    if (key) memoryBytes.set(`${key}/${file.storedName}`, bytes);
    return { file, bytes };
  } catch {
    return null;
  }
}
