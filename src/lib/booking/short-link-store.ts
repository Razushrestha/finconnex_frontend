import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

type ShortRow = { target: string; once: boolean; openedAt?: number };

/** Long enough for the browser's duplicate load, short enough to stay one use. */
const ONCE_GRACE_MS = 60_000;

const memory = new Map<string, ShortRow>();
let loaded = false;

const CODE_RE = /^[a-z0-9]{6,16}$/;

function filePath() {
  return path.join(tmpdir(), "crmaus-public-book", "short-links.json");
}

async function readDisk() {
  try {
    const raw = await readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw) as Record<string, ShortRow>;
    for (const [code, row] of Object.entries(parsed)) {
      if (CODE_RE.test(code) && row && typeof row.target === "string") {
        const prev = memory.get(code);
        const openedAt = Math.max(
          prev?.openedAt ?? 0,
          typeof row.openedAt === "number" ? row.openedAt : 0,
        );
        memory.set(code, {
          target: row.target,
          once: Boolean(row.once),
          openedAt: openedAt || undefined,
        });
      }
    }
  } catch {
    /* first link, or tmp is unreadable */
  }
}

async function load() {
  if (loaded) return;
  loaded = true;
  await readDisk();
}

async function persist() {
  const data = Object.fromEntries(memory);
  try {
    await mkdir(path.dirname(filePath()), { recursive: true });
    await writeFile(filePath(), JSON.stringify(data), "utf8");
  } catch {
    /* tmp may be read-only; the in-memory map still serves this process */
  }
}

export function isShortCode(code: string) {
  return CODE_RE.test(code);
}

/** Only in-app public booking paths. Blocks open redirects. */
export function safeBookTarget(target: string): string | null {
  const pathName = target.trim();
  if (!pathName.startsWith("/book/")) return null;
  if (pathName.length < 7 || pathName.length > 200) return null;
  if (/[\\?#\s]|\.\./.test(pathName)) return null;
  return pathName;
}

export async function saveBookingShortLink(
  code: string,
  target: string,
  once: boolean,
) {
  await load();
  const key = code.trim().toLowerCase();
  if (!isShortCode(key)) {
    throw new Error("Invalid short code");
  }
  const safe = safeBookTarget(target);
  if (!safe) {
    throw new Error("Short links can only open a booking page");
  }
  if (memory.has(key)) {
    throw new Error("That short link already exists");
  }
  memory.set(key, { target: safe, once });
  await persist();
  return { code: key, target: safe, once };
}

/**
 * Permanent links stay.
 * A one-time link redirects on the first open. A second request in that same
 * visit still redirects; a later visit does not.
 */
export async function openBookingShortLink(code: string): Promise<string | null> {
  await load();
  const key = code.trim().toLowerCase();
  if (!memory.has(key)) await readDisk();
  const row = memory.get(key);
  if (!row) return null;
  const target = safeBookTarget(row.target);
  if (!target) return null;
  if (!row.once) return target;

  const now = Date.now();
  if (row.openedAt && now - row.openedAt > ONCE_GRACE_MS) {
    memory.delete(key);
    await persist();
    return null;
  }
  if (!row.openedAt) {
    memory.set(key, { ...row, target, openedAt: now });
    await persist();
  }
  return target;
}
