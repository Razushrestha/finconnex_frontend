import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  isPackedPublicSignToken,
  openPublicSignSession,
} from "@/lib/documents/signature/public-sign-envelope";

export type PublicSignSession = {
  documentName?: string;
  recipientName?: string;
  role?: string;
  status?: string;
  viewedAt?: string;
  signedAt?: string;
  consumed?: boolean;
  requestId?: string;
  signerId?: string;
  signerEmail?: string;
  fields?: unknown[];
  documentUrl?: string | null;
  sourceDocumentUrl?: string | null;
  fileToken?: string;
};

const memoryMeta = new Map<string, PublicSignSession>();
const memoryFiles = new Map<string, { bytes: Buffer; contentType: string }>();

function isServerlessHost() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

function storeDir() {
  if (isServerlessHost()) {
    return path.join(/* turbopackIgnore: true */ tmpdir(), "finconnex-public-sign");
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "public-sign",
  );
}

export function safePublicSignToken(token: string) {
  const trimmed = token.trim();
  if (isPackedPublicSignToken(trimmed) || trimmed.length > 120) {
    return createHash("sha256").update(trimmed).digest("hex").slice(0, 40);
  }
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120);
}

function sessionKeys(token: string, session?: PublicSignSession | null) {
  const keys = new Set<string>();
  const packed = session ?? openPublicSignSession(token);
  const fileToken = packed?.fileToken?.trim();
  if (fileToken) keys.add(safePublicSignToken(fileToken));
  const hashed = safePublicSignToken(token);
  if (hashed) keys.add(hashed);
  return [...keys];
}

function metaPath(token: string) {
  return path.join(/* turbopackIgnore: true */ storeDir(), `${safePublicSignToken(token)}.json`);
}

function filePath(token: string) {
  return path.join(/* turbopackIgnore: true */ storeDir(), `${safePublicSignToken(token)}.bin`);
}

function mergeSession(
  base: PublicSignSession | null,
  overlay: PublicSignSession | null,
): PublicSignSession | null {
  if (!base && !overlay) return null;
  return { ...(base ?? {}), ...(overlay ?? {}) };
}

async function readStoredSession(key: string): Promise<PublicSignSession | null> {
  if (!key) return null;
  try {
    const parsed = JSON.parse(
      await readFile(metaPath(key), "utf8"),
    ) as PublicSignSession;
    memoryMeta.set(key, parsed);
    return parsed;
  } catch {
    return memoryMeta.get(key) ?? null;
  }
}

export async function readPublicSignSession(
  token: string,
): Promise<PublicSignSession | null> {
  const packed = openPublicSignSession(token);
  let stored: PublicSignSession | null = null;
  for (const key of sessionKeys(token, packed)) {
    stored = mergeSession(stored, await readStoredSession(key));
  }
  return mergeSession(packed, stored);
}

export async function writePublicSignSession(
  token: string,
  session: PublicSignSession,
) {
  const next = { ...session };
  const keys = sessionKeys(token, next);
  if (!keys.length) return;
  for (const key of keys) memoryMeta.set(key, next);
  try {
    await mkdir(storeDir(), { recursive: true });
    await writeFile(metaPath(keys[0]!), JSON.stringify(next));
  } catch {
    /* memory is enough on a read-only host */
  }
}

export async function writePublicSignDocument(
  token: string,
  bytes: Buffer,
  contentType: string,
) {
  const keys = sessionKeys(token);
  if (!keys.length) return;
  const file = { bytes, contentType };
  for (const key of keys) memoryFiles.set(key, file);
  try {
    await mkdir(storeDir(), { recursive: true });
    await writeFile(filePath(keys[0]!), bytes);
    await writeFile(
      `${filePath(keys[0]!)}.type`,
      contentType || "application/pdf",
      "utf8",
    );
  } catch {
    /* memory is enough on a read-only host */
  }
}

async function readStoredDocument(key: string): Promise<{
  bytes: Buffer;
  contentType: string;
} | null> {
  if (!key) return null;
  try {
    const bytes = await readFile(filePath(key));
    const contentType = await readFile(`${filePath(key)}.type`, "utf8").catch(
      () => "application/pdf",
    );
    const file = { bytes, contentType: contentType.trim() || "application/pdf" };
    memoryFiles.set(key, file);
    return file;
  } catch {
    return memoryFiles.get(key) ?? null;
  }
}

async function fetchRemoteDocument(url: string): Promise<{
  bytes: Buffer;
  contentType: string;
} | null> {
  if (!/^https?:\/\//i.test(url) || url.includes("/api/sign/")) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < 1) return null;
    return {
      bytes,
      contentType: res.headers.get("content-type") || "application/pdf",
    };
  } catch {
    return null;
  }
}

export async function readPublicSignDocument(token: string): Promise<{
  bytes: Buffer;
  contentType: string;
} | null> {
  const session = await readPublicSignSession(token);
  for (const key of sessionKeys(token, session)) {
    const stored = await readStoredDocument(key);
    if (stored) return stored;
  }
  const remote =
    session?.sourceDocumentUrl ||
    (typeof session?.documentUrl === "string" ? session.documentUrl : "");
  if (remote) return fetchRemoteDocument(remote);
  return null;
}

export async function listPublicSignSessions(filter?: {
  requestId?: string;
  tokens?: string[];
}): Promise<Array<PublicSignSession & { token: string }>> {
  const wantedRaw = (filter?.tokens ?? [])
    .map((token) => String(token || "").trim())
    .filter(Boolean);
  const wantedTokens = new Set(
    wantedRaw.map((token) => safePublicSignToken(token)).filter(Boolean),
  );
  const requestId = filter?.requestId?.trim();
  const found = new Map<string, PublicSignSession & { token: string }>();

  const take = (token: string, session: PublicSignSession) => {
    const key = safePublicSignToken(token);
    if (!key) return;
    const tokenMatch = !wantedTokens.size || wantedTokens.has(key);
    const requestMatch = Boolean(requestId) && session.requestId === requestId;
    if (!tokenMatch && !requestMatch) return;
    found.set(key, { ...session, token: key });
  };

  for (const [token, session] of memoryMeta.entries()) take(token, session);
  try {
    const names = await readdir(storeDir());
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const token = name.slice(0, -5);
      try {
        const parsed = JSON.parse(
          await readFile(path.join(storeDir(), name), "utf8"),
        ) as PublicSignSession;
        memoryMeta.set(token, parsed);
        take(token, parsed);
      } catch {
        /* skip bad files */
      }
    }
  } catch {
    /* directory missing */
  }

  if (wantedRaw.length) {
    for (const token of wantedRaw) {
      const session = await readPublicSignSession(token);
      if (session) take(session.fileToken || token, session);
    }
  }

  return [...found.values()];
}

export function publicSignDocumentPath(token: string) {
  return `/api/sign/${encodeURIComponent(token)}/document`;
}
