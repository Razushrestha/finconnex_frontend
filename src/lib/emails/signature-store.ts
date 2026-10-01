import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type SavedEmailSignature = {
  id: string;
  name: string;
  mime: string;
  createdAt: string;
};

const MAX_BYTES = 1_500_000;
const TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function userDir(userId: string) {
  return path.join(process.cwd(), "data", "email-signatures", safeId(userId));
}

function indexPath(userId: string) {
  return path.join(userDir(userId), "index.json");
}

async function readIndex(userId: string): Promise<SavedEmailSignature[]> {
  try {
    const raw = await readFile(indexPath(userId), "utf8");
    const parsed = JSON.parse(raw) as SavedEmailSignature[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(userId: string, rows: SavedEmailSignature[]) {
  await mkdir(userDir(userId), { recursive: true });
  await writeFile(indexPath(userId), JSON.stringify(rows), "utf8");
}

export async function listEmailSignatures(userId: string) {
  const rows = await readIndex(userId);
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function saveEmailSignature(userId: string, file: File) {
  const ext = TYPES.get(file.type);
  if (!ext) {
    throw new Error("Upload a PNG, JPG, WEBP, or GIF signature.");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("Signature images must be under 1.5 MB.");
  }
  const id = `sig-${Date.now().toString(36)}`;
  const name = file.name.replace(/\.[^.]+$/, "").trim().slice(0, 80) || "Signature";
  const row: SavedEmailSignature = {
    id,
    name,
    mime: file.type,
    createdAt: new Date().toISOString(),
  };
  await mkdir(userDir(userId), { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(userDir(userId), `${id}.${ext}`), bytes);
  const rows = await readIndex(userId);
  rows.unshift(row);
  await writeIndex(userId, rows);
  return row;
}

export async function readEmailSignatureFile(userId: string, id: string) {
  const key = safeId(id);
  const row = (await readIndex(userId)).find((item) => item.id === key);
  if (!row) return null;
  const ext = TYPES.get(row.mime);
  if (!ext) return null;
  try {
    const bytes = await readFile(path.join(userDir(userId), `${key}.${ext}`));
    return { row, bytes };
  } catch {
    return null;
  }
}
