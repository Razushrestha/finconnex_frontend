import type {
  ApiPersistenceConfig,
  PersistenceDriver,
} from "@/lib/persistence/types";
import { getTenantContext, tenantScopedKey } from "@/lib/persistence/tenant";

/**
 * HTTP-backed driver for live multi-tenant CRM.
 * Sync get/set use an in-memory cache; call `hydrate` after login.
 * Replace path shapes when OpenAPI contracts land.
 */
export function createApiDriver(config: ApiPersistenceConfig): PersistenceDriver & {
  hydrate: (logicalKeys: string[]) => Promise<void>;
  flush: (logicalKey: string) => Promise<void>;
  seedCache: (logicalKey: string, value: string) => void;
} {
  const cache = new Map<string, string>();
  const fetchImpl = config.fetchImpl ?? fetch;

  async function authHeaders(): Promise<HeadersInit> {
    const token = await config.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Tenant-Id": getTenantContext().tenantId,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  function urlFor(logicalKey: string) {
    const scoped = encodeURIComponent(tenantScopedKey(logicalKey));
    return `${config.baseUrl.replace(/\/$/, "")}/v1/kv/${scoped}`;
  }

  async function flush(logicalKey: string) {
    const scoped = tenantScopedKey(logicalKey);
    const value = cache.get(scoped);
    if (value == null) return;
    try {
      await fetchImpl(urlFor(logicalKey), {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ value }),
      });
    } catch {
      /* retry queue can land later */
    }
  }

  async function hydrate(logicalKeys: string[]) {
    await Promise.all(
      logicalKeys.map(async (key) => {
        try {
          const res = await fetchImpl(urlFor(key), {
            headers: await authHeaders(),
          });
          if (!res.ok) return;
          const body = (await res.json()) as { value?: string };
          if (typeof body.value === "string") {
            cache.set(tenantScopedKey(key), body.value);
          }
        } catch {
          /* keep cache miss → seed fallback at store layer */
        }
      }),
    );
  }

  return {
    mode: "api",
    getItem(key) {
      return cache.get(tenantScopedKey(key)) ?? null;
    },
    setItem(key, value) {
      cache.set(tenantScopedKey(key), value);
      void flush(key);
    },
    removeItem(key) {
      cache.delete(tenantScopedKey(key));
      void (async () => {
        try {
          await fetchImpl(urlFor(key), {
            method: "DELETE",
            headers: await authHeaders(),
          });
        } catch {
          /* offline — cache already cleared */
        }
      })();
    },
    /** Warm cache without PUT (module REST hydrate). */
    seedCache(logicalKey: string, value: string) {
      cache.set(tenantScopedKey(logicalKey), value);
    },
    hydrate,
    flush,
  };
}
