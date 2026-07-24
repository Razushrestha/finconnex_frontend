/**
 * Phase 15 — attachment binary upload adapters.
 * Demo: local metadata adapter. Production: multipart POST to CRM API.
 */

import { getTenantContext } from "@/lib/persistence/tenant";

export type UploadBlobInput = {
  fileName: string;
  /** Raw bytes as ArrayBuffer, or base64 string for tests. */
  data: ArrayBuffer | string;
  contentType?: string;
  relatedTo?: string;
};

export type UploadBlobResult = {
  ok: true;
  fileName: string;
  storageUrl: string;
  contentType: string;
  byteSize: number;
  sizeLabel: string;
};

export type UploadBlobError = {
  ok: false;
  message: string;
};

export type AttachmentUploadAdapter = {
  readonly mode: "local" | "api";
  upload: (
    input: UploadBlobInput,
  ) => Promise<UploadBlobResult | UploadBlobError>;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function byteLength(data: ArrayBuffer | string): number {
  if (typeof data === "string") {
    // treat as base64 or utf8 length estimate
    if (/^[A-Za-z0-9+/=]+$/.test(data) && data.length % 4 === 0) {
      return Math.floor((data.length * 3) / 4);
    }
    return new TextEncoder().encode(data).length;
  }
  return data.byteLength;
}

function toBase64(data: ArrayBuffer | string): string {
  if (typeof data === "string") return data;
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64");
  }
  const bytes = new Uint8Array(data);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Demo adapter — no network; invents a storage URL. */
export function createLocalUploadAdapter(): AttachmentUploadAdapter {
  return {
    mode: "local",
    async upload(input) {
      const fileName = input.fileName.trim() || "untitled.bin";
      if (!fileName) {
        return { ok: false, message: "File name required" };
      }
      const byteSize = byteLength(input.data);
      if (byteSize <= 0) {
        return { ok: false, message: "Empty file" };
      }
      const id = `local-${Date.now().toString(36)}`;
      return {
        ok: true,
        fileName,
        storageUrl: `local://attachments/${id}/${encodeURIComponent(fileName)}`,
        contentType: input.contentType ?? "application/octet-stream",
        byteSize,
        sizeLabel: formatSize(byteSize),
      };
    },
  };
}

export type ApiUploadConfig = {
  baseUrl: string;
  getAccessToken: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
  /** Default `/v1/attachments/upload` */
  path?: string;
};

/** Production adapter — multipart (or JSON base64 fallback for tests). */
export function createApiUploadAdapter(
  config: ApiUploadConfig,
): AttachmentUploadAdapter {
  const fetchImpl = config.fetchImpl ?? fetch;
  const path = config.path ?? "/v1/attachments/upload";

  return {
    mode: "api",
    async upload(input) {
      const fileName = input.fileName.trim() || "untitled.bin";
      const byteSize = byteLength(input.data);
      if (byteSize <= 0) return { ok: false, message: "Empty file" };

      try {
        const token = await config.getAccessToken();
        const headers: Record<string, string> = {
          "X-Tenant-Id": getTenantContext().tenantId,
          "Content-Type": "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const payload = {
          fileName,
          contentType: input.contentType ?? "application/octet-stream",
          relatedTo: input.relatedTo,
          // JSON base64 for mock/tests; real CDN may use multipart later
          data: toBase64(input.data),
          byteSize,
        };

        const res = await fetchImpl(
          `${config.baseUrl.replace(/\/$/, "")}${path}`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          return { ok: false, message: `Upload failed (${res.status})` };
        }
        const body = (await res.json()) as {
          storageUrl?: string;
          fileName?: string;
          contentType?: string;
          byteSize?: number;
        };
        if (!body.storageUrl) {
          return { ok: false, message: "Upload response missing storageUrl" };
        }
        return {
          ok: true,
          fileName: body.fileName ?? fileName,
          storageUrl: body.storageUrl,
          contentType: body.contentType ?? payload.contentType,
          byteSize: body.byteSize ?? byteSize,
          sizeLabel: formatSize(body.byteSize ?? byteSize),
        };
      } catch {
        return { ok: false, message: "Upload network error" };
      }
    },
  };
}

/** In-memory upload endpoint for smokes (`POST /v1/attachments/upload`). */
export function createMockUploadFetch(store?: Map<string, string>): typeof fetch {
  const files = store ?? new Map<string, string>();
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!url.includes("/v1/attachments/upload")) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
      });
    }
    if ((init?.method ?? "GET").toUpperCase() !== "POST") {
      return new Response(JSON.stringify({ error: "method" }), { status: 405 });
    }
    let body: {
      fileName?: string;
      contentType?: string;
      byteSize?: number;
      data?: string;
    } = {};
    try {
      body = JSON.parse(String(init?.body ?? "{}")) as typeof body;
    } catch {
      return new Response(JSON.stringify({ error: "bad_json" }), {
        status: 400,
      });
    }
    const id = `up-${files.size + 1}`;
    const storageUrl = `https://cdn.mock.test/attachments/${id}/${encodeURIComponent(body.fileName ?? "file.bin")}`;
    files.set(storageUrl, body.data ?? "");
    return new Response(
      JSON.stringify({
        storageUrl,
        fileName: body.fileName,
        contentType: body.contentType,
        byteSize: body.byteSize,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
}

let activeUpload: AttachmentUploadAdapter = createLocalUploadAdapter();

export function getUploadAdapter(): AttachmentUploadAdapter {
  return activeUpload;
}

export function setUploadAdapter(adapter: AttachmentUploadAdapter) {
  activeUpload = adapter;
}

export function enableLocalUpload() {
  activeUpload = createLocalUploadAdapter();
  return activeUpload;
}

export function enableApiUpload(config: ApiUploadConfig) {
  activeUpload = createApiUploadAdapter(config);
  return activeUpload;
}
