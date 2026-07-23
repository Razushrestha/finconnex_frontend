/**
 * Typed HTTP client for remote API mode.
 * Sends credentials (cookies) so auth session works cross-origin when configured.
 */

import { API_VERSION_PREFIX, getApiBaseUrl } from "@/lib/api/config";
import {
  ApiError,
  type ApiErrorBody,
  toApiError,
} from "@/lib/api/errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Abort after ms (default 30000). */
  timeoutMs?: number;
  /** Skip /v1 prefix (e.g. health checks). */
  rawPath?: boolean;
}

function buildUrl(path: string, query?: HttpRequestOptions["query"], rawPath?: boolean) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError(503, {
      code: "UNAVAILABLE",
      message: "NEXT_PUBLIC_API_BASE_URL is not configured",
    });
  }
  const prefix = rawPath ? "" : API_VERSION_PREFIX;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${prefix}${normalized}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parseError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody = {
    code: "INTERNAL",
    message: res.statusText || `HTTP ${res.status}`,
  };
  try {
    const json = (await res.json()) as Partial<ApiErrorBody> & {
      error?: string;
    };
    body = {
      code: json.code ?? (res.status === 401 ? "UNAUTHORIZED" : "INTERNAL"),
      message: json.message ?? json.error ?? body.message,
      fields: json.fields,
      requestId: json.requestId,
      details: json.details,
    };
  } catch {
    // non-JSON body
  }
  return new ApiError(res.status, body);
}

/**
 * Low-level request. Throws ApiError on non-2xx.
 * Prefer module methods on `api` which return ApiResult.
 */
export async function httpRequest<T>(
  path: string,
  opts: HttpRequestOptions = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 30_000,
  );

  try {
    const res = await fetch(buildUrl(path, opts.query, opts.rawPath), {
      method,
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(opts.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) throw await parseError(res);
    if (res.status === 204) return undefined as T;

    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, {
        code: "UNAVAILABLE",
        message: "Request timed out",
      });
    }
    throw toApiError(err, 0);
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function httpGet<T>(
  path: string,
  query?: HttpRequestOptions["query"],
) {
  return httpRequest<T>(path, { method: "GET", query });
}

export async function httpPost<T>(path: string, body?: unknown) {
  return httpRequest<T>(path, { method: "POST", body });
}

export async function httpPatch<T>(path: string, body?: unknown) {
  return httpRequest<T>(path, { method: "PATCH", body });
}

export async function httpPut<T>(path: string, body?: unknown) {
  return httpRequest<T>(path, { method: "PUT", body });
}

export async function httpDelete<T>(path: string) {
  return httpRequest<T>(path, { method: "DELETE" });
}
