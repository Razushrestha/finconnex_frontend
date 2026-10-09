const DB_NAME = "finconnex-portal-docs";
const STORE = "blobs";

type StoredFile = { blob: Blob; mime: string };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open document storage"));
  });
}

export function mimeFromFileName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function isPdfMime(mime: string, name: string) {
  return mime === "application/pdf" || name.toLowerCase().endsWith(".pdf");
}

export async function savePortalDocumentBlob(id: string, file: Blob, mime: string) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ blob: file, mime } satisfies StoredFile, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save document"));
    });
  } finally {
    db.close();
  }
}

export async function loadPortalDocumentBlob(id: string): Promise<StoredFile | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  try {
    const row = await new Promise<StoredFile | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result as StoredFile | undefined);
      request.onerror = () => reject(request.error ?? new Error("Could not read document"));
    });
    return row ?? null;
  } finally {
    db.close();
  }
}

export async function deletePortalDocumentBlob(id: string) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not delete document"));
    });
  } finally {
    db.close();
  }
}
