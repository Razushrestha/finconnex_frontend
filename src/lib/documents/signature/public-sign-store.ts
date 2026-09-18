import "server-only";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

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
  return token.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120);
}

function metaPath(token: string) {
  return path.join(/* turbopackIgnore: true */ storeDir(), `${safePublicSignToken(token)}.json`);
}

function filePath(token: string) {
  return path.join(/* turbopackIgnore: true */ storeDir(), `${safePublicSignToken(token)}.bin`);
}

export async function readPublicSignSession(
  token: string,
): Promise<PublicSignSession | null> {
  const key = safePublicSignToken(token);
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

export async function writePublicSignSession(
  token: string,
  session: PublicSignSession,
) {
  const key = safePublicSignToken(token);
  if (!key) return;
  const next = { ...session };
  memoryMeta.set(key, next);
  try {
    await mkdir(storeDir(), { recursive: true });
    await writeFile(metaPath(key), JSON.stringify(next));
  } catch {
    /* memory is enough on a read-only host */
  }
}

export async function writePublicSignDocument(
  token: string,
  bytes: Buffer,
  contentType: string,
) {
  const key = safePublicSignToken(token);
  if (!key) return;
  memoryFiles.set(key, { bytes, contentType });
  try {
    await mkdir(storeDir(), { recursive: true });
    await writeFile(filePath(key), bytes);
    await writeFile(
      `${filePath(key)}.type`,
      contentType || "application/pdf",
      "utf8",
    );
  } catch {
    /* memory is enough on a read-only host */
  }
}

export async function readPublicSignDocument(token: string): Promise<{
  bytes: Buffer;
  contentType: string;
} | null> {
  const key = safePublicSignToken(token);
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

export async function listPublicSignSessions(filter?: {
  requestId?: string;
  tokens?: string[];
}): Promise<Array<PublicSignSession & { token: string }>> {
  const wantedTokens = new Set(
    (filter?.tokens ?? []).map((token) => safePublicSignToken(token)).filter(Boolean),
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

  if (wantedTokens.size) {
    for (const token of wantedTokens) {
      if (found.has(token)) continue;
      const session = await readPublicSignSession(token);
      if (session) take(token, session);
    }
  }

  return [...found.values()];
}

export function publicSignDocumentPath(token: string) {
  return `/api/sign/${encodeURIComponent(token)}/document`;
}
