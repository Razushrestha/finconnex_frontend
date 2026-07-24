import type { PersistenceDriver } from "@/lib/persistence/types";
import { tenantScopedKey } from "@/lib/persistence/tenant";

function browserStorage(): Storage | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

/** Default demo driver — sessionStorage with tenant-prefixed keys. */
export function createSessionDriver(): PersistenceDriver {
  return {
    mode: "session",
    getItem(key) {
      const store = browserStorage();
      if (!store) return null;
      try {
        return store.getItem(tenantScopedKey(key));
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      const store = browserStorage();
      if (!store) return;
      try {
        store.setItem(tenantScopedKey(key), value);
      } catch {
        // Quota / private mode
      }
    },
    removeItem(key) {
      const store = browserStorage();
      if (!store) return;
      try {
        store.removeItem(tenantScopedKey(key));
      } catch {
        /* ignore */
      }
    },
  };
}
