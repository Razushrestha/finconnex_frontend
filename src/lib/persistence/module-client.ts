/**
 * Phase 14 — first-class module REST hydrate (preferred over KV when OpenAPI lands).
 * Expects GET {collectionPath} → `{ "value": "<json string>" }` or any JSON body.
 */

import { LEAD_CARD_HYDRATE_KEYS } from "@/lib/leads/phase-9";
import { resolveModuleRestPath } from "@/lib/persistence/module-routes";
import { getTenantContext } from "@/lib/persistence/tenant";

export type ModuleRestClientConfig = {
  baseUrl: string;
  getAccessToken: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
};

export type ModuleHydrateResult = {
  key: string;
  path: string;
  ok: boolean;
  bytes: number;
};

async function authHeaders(
  getAccessToken: ModuleRestClientConfig["getAccessToken"],
): Promise<HeadersInit> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Tenant-Id": getTenantContext().tenantId,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function normalizeBody(body: unknown): string | null {
  if (body == null) return null;
  if (typeof body === "object" && body !== null && "value" in body) {
    const v = (body as { value?: unknown }).value;
    if (typeof v === "string") return v;
    if (v != null) return JSON.stringify(v);
  }
  return JSON.stringify(body);
}

export function createModuleRestClient(config: ModuleRestClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const base = config.baseUrl.replace(/\/$/, "");

  async function fetchModuleJson(logicalKey: string): Promise<string | null> {
    const path = resolveModuleRestPath(logicalKey);
    if (!path) return null;
    try {
      const res = await fetchImpl(`${base}${path}`, {
        headers: await authHeaders(config.getAccessToken),
      });
      if (!res.ok) return null;
      const body: unknown = await res.json();
      return normalizeBody(body);
    } catch {
      return null;
    }
  }

  /**
   * Pull module collections into the API driver cache (no KV round-trip).
   */
  async function hydrateIntoCache(
    seedCache: (logicalKey: string, value: string) => void,
    keys: readonly string[] = LEAD_CARD_HYDRATE_KEYS,
  ): Promise<ModuleHydrateResult[]> {
    const results: ModuleHydrateResult[] = [];
    await Promise.all(
      keys.map(async (key) => {
        const path = resolveModuleRestPath(key) ?? "";
        const value = await fetchModuleJson(key);
        if (value != null) {
          seedCache(key, value);
          results.push({ key, path, ok: true, bytes: value.length });
        } else {
          results.push({ key, path, ok: false, bytes: 0 });
        }
      }),
    );
    return results;
  }

  return { fetchModuleJson, hydrateIntoCache };
}
