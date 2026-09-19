import "server-only";

import { crmBaseUrl } from "@/lib/auth/crm-bff-helpers";
import { unwrapCrmData } from "@/lib/crm/request";
import {
  isLocalStorageKey,
  normalizeCrmStorageObject,
} from "@/lib/storage/api";

function asBlobPart(bytes: Buffer) {
  return Uint8Array.from(bytes) as unknown as BlobPart;
}

/** Persist the signing PDF somewhere a later Vercel instance can fetch. */
export async function uploadPublicSignDocumentDurable(input: {
  bytes: Buffer;
  fileName: string;
  contentType: string;
  accessToken?: string | null;
}): Promise<string | null> {
  const accessToken = input.accessToken?.trim();
  const base = crmBaseUrl();
  if (accessToken && base) {
    try {
      const form = new FormData();
      form.append(
        "file",
        new File([asBlobPart(input.bytes)], input.fileName, {
          type: input.contentType || "application/pdf",
        }),
      );
      const res = await fetch(`${base}/v1/storage/upload`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const stored = normalizeCrmStorageObject(
          unwrapCrmData(json) ?? json,
          input.fileName,
        );
        const url = stored.url || stored.key;
        if (
          url &&
          /^https?:\/\//i.test(url) &&
          !isLocalStorageKey(url) &&
          !isLocalStorageKey(stored.key)
        ) {
          return url;
        }
      }
    } catch {
      /* try blob next */
    }
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (blobToken) {
    try {
      const pathname = `public-sign/${encodeURIComponent(input.fileName)}`;
      const res = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${blobToken}`,
          "x-api-version": "7",
        },
        body: asBlobPart(input.bytes) as BodyInit,
      });
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as { url?: string };
        if (typeof json.url === "string" && json.url.startsWith("http")) {
          return json.url;
        }
      }
    } catch {
      /* keep local fallback */
    }
  }

  return null;
}
