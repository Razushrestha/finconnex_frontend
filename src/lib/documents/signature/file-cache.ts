"use client";

import {
  getRequestDocuments,
  type SignatureRequest,
} from "@/lib/documents/signature/types";

const DB_NAME = "fc-signature-files";
const STORE = "files";
const FILE_POINTER_PREFIX = "fc-file://";

type CachedFile =
  | { kind: "url"; value: string }
  | { kind: "blob"; value: Blob };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function cacheKey(requestId: string, documentId: string) {
  return `${requestId}:${documentId}`;
}

async function putCachedFile(key: string, value: CachedFile) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(value, key);
  });
}

async function getCachedFile(key: string): Promise<CachedFile | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () =>
      resolve((req.result as CachedFile | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

function isDurableUrl(url?: string): boolean {
  if (!url) return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("/")
  );
}

export function signatureFilePointer(requestId: string, documentId: string) {
  return `${FILE_POINTER_PREFIX}${requestId}/${documentId}`;
}

export function parseSignatureFilePointer(
  url?: string,
): { requestId: string; documentId: string } | null {
  if (!url?.startsWith(FILE_POINTER_PREFIX)) return null;
  const rest = url.slice(FILE_POINTER_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  return {
    requestId: rest.slice(0, slash),
    documentId: rest.slice(slash + 1),
  };
}

export function persistableSignatureFileUrl(
  requestId: string,
  documentId: string,
  url?: string,
) {
  if (isDurableUrl(url)) return url;
  if (url?.startsWith(FILE_POINTER_PREFIX)) return url;
  return signatureFilePointer(requestId, documentId);
}

async function blobFromCache(cached: CachedFile): Promise<string> {
  if (cached.kind === "url") return cached.value;
  return URL.createObjectURL(cached.value);
}

export async function cacheSignatureDocumentBlob(
  requestId: string,
  documentId: string,
  file: Blob,
) {
  if (typeof indexedDB === "undefined" || !file || file.size === 0) return;
  try {
    await putCachedFile(cacheKey(requestId, documentId), {
      kind: "blob",
      value: file,
    });
  } catch {
    /* quota / private mode */
  }
}

export async function cacheSignatureDocumentFile(
  requestId: string,
  documentId: string,
  url?: string,
) {
  if (!url || typeof indexedDB === "undefined") return;
  const key = cacheKey(requestId, documentId);
  try {
    if (isDurableUrl(url)) {
      await putCachedFile(key, { kind: "url", value: url });
      return;
    }
    if (url.startsWith("blob:")) {
      const res = await fetch(url);
      const blob = await res.blob();
      if (blob.size > 0) {
        await putCachedFile(key, { kind: "blob", value: blob });
      }
    }
  } catch {
    /* quota / private mode */
  }
}

export async function copyCachedSignatureFiles(
  fromRequestId: string,
  toRequestId: string,
  documentIds: string[],
) {
  if (
    !fromRequestId ||
    !toRequestId ||
    fromRequestId === toRequestId ||
    typeof indexedDB === "undefined"
  ) {
    return;
  }
  const ids = Array.from(new Set([...documentIds, "primary"]));
  for (const documentId of ids) {
    try {
      const cached = await getCachedFile(cacheKey(fromRequestId, documentId));
      if (cached) {
        await putCachedFile(cacheKey(toRequestId, documentId), cached);
      }
    } catch {
      /* ignore */
    }
  }
}

export async function loadCachedSignatureFile(
  requestId: string,
  documentId: string,
): Promise<Blob | null> {
  if (!requestId || !documentId || typeof indexedDB === "undefined") return null;
  try {
    const cached = await getCachedFile(cacheKey(requestId, documentId));
    if (!cached) return null;
    if (cached.kind === "blob") return cached.value;
    const res = await fetch(cached.value);
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

export async function resolveSignatureDocumentFileUrl(
  requestId: string,
  documentId: string,
  storedUrl?: string,
): Promise<string | undefined> {
  if (isDurableUrl(storedUrl)) return storedUrl;
  // Keep each document's own object URL. Falling through to the request
  // "primary" cache would attach the first PDF onto every extra file.
  if (storedUrl?.startsWith("blob:")) return storedUrl;
  if (typeof indexedDB === "undefined") {
    return storedUrl?.startsWith(FILE_POINTER_PREFIX) ? undefined : storedUrl;
  }

  const pointer = parseSignatureFilePointer(storedUrl);
  const allowPrimaryFallback =
    documentId === "primary" || pointer?.documentId === "primary";
  const keys = [
    cacheKey(requestId, documentId),
    pointer ? cacheKey(pointer.requestId, pointer.documentId) : null,
    allowPrimaryFallback ? cacheKey(requestId, "primary") : null,
    allowPrimaryFallback && pointer
      ? cacheKey(pointer.requestId, "primary")
      : null,
  ].filter((key): key is string => Boolean(key));

  try {
    for (const key of keys) {
      const cached = await getCachedFile(key);
      if (cached) return blobFromCache(cached);
    }
  } catch {
    return storedUrl?.startsWith(FILE_POINTER_PREFIX) ? undefined : storedUrl;
  }
  return storedUrl?.startsWith(FILE_POINTER_PREFIX) ? undefined : storedUrl;
}

export async function resolveRequestDocumentUrls(
  req: SignatureRequest,
  fallbackUrl?: string,
): Promise<SignatureRequest> {
  const docs = getRequestDocuments(req);
  const nextDocs = await Promise.all(
    docs.map(async (doc) => {
      const resolved = await resolveSignatureDocumentFileUrl(
        req.id,
        doc.id,
        doc.fileUrl,
      );
      const usable =
        resolved && !resolved.startsWith("fc-file://")
          ? resolved
          : doc.id === "primary" || docs.length === 1
            ? fallbackUrl || resolved
            : resolved;
      return { ...doc, fileUrl: usable || doc.fileUrl };
    }),
  );
  const firstUrl =
    nextDocs.find((doc) => doc.fileUrl && !doc.fileUrl.startsWith("fc-file://"))
      ?.fileUrl ||
    fallbackUrl ||
    req.documentFileUrl;
  return {
    ...req,
    documents: nextDocs,
    documentFileUrl: firstUrl,
  };
}
