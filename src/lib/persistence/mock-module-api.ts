/**
 * In-memory module REST + KV backend for Phase 14 smokes (no network).
 * Serves LEAD_CARD_MODULE_ROUTES collection paths and `/v1/kv/...`.
 */

import { createMockKvBackend, type MockKvBackend } from "@/lib/persistence/mock-kv";
import { LEAD_CARD_MODULE_ROUTES } from "@/lib/persistence/module-routes";
import { tenantScopedKey } from "@/lib/persistence/tenant";

export type MockModuleApi = MockKvBackend & {
  /** Seed a module collection by logical key (tenant-scoped under the hood). */
  seedModule: (logicalKey: string, value: unknown, tenantId?: string) => void;
};

export function createMockModuleApi(): MockModuleApi {
  const kv = createMockKvBackend();
  const pathToKey = new Map(
    LEAD_CARD_MODULE_ROUTES.map((r) => [r.collectionPath, r.logicalKey]),
  );

  const fetchImpl = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // Prefer module collection paths
    for (const [collectionPath, logicalKey] of pathToKey) {
      if (url.includes(collectionPath)) {
        const method = (init?.method ?? "GET").toUpperCase();
        if (method !== "GET") {
          return new Response(JSON.stringify({ error: "method_not_allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
          });
        }
        // Resolve tenant from header if present for scoped lookup
        const headers = new Headers(init?.headers);
        const tenant = headers.get("X-Tenant-Id") ?? "demo";
        const scoped = tenantScopedKey(logicalKey, tenant);
        const value = kv.store.get(scoped);
        if (value == null) {
          return new Response(JSON.stringify({ error: "missing" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ value }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return kv.fetchImpl(input, init);
  }) as typeof fetch;

  return {
    ...kv,
    fetchImpl,
    seedModule(logicalKey, value, tenantId = "demo") {
      const raw = typeof value === "string" ? value : JSON.stringify(value);
      kv.seed(tenantScopedKey(logicalKey, tenantId), raw);
    },
  };
}
