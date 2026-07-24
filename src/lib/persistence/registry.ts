import { createSessionDriver } from "@/lib/persistence/session-driver";
import { createApiDriver } from "@/lib/persistence/api-driver";
import type {
  ApiPersistenceConfig,
  PersistenceDriver,
  PersistenceMode,
} from "@/lib/persistence/types";

let driver: PersistenceDriver = createSessionDriver();

export function getPersistenceDriver(): PersistenceDriver {
  return driver;
}

export function getPersistenceMode(): PersistenceMode {
  return driver.mode;
}

/** Swap to another driver (tests or host bootstrap). */
export function setPersistenceDriver(next: PersistenceDriver) {
  driver = next;
}

/** Restore demo session driver (not a React hook). */
export function enableSessionPersistence() {
  driver = createSessionDriver();
  return driver;
}

/**
 * Activate HTTP driver when CRM API is configured (not a React hook).
 * Call from app bootstrap after auth:
 * `enableApiPersistence({ baseUrl, getAccessToken })`.
 */
export function enableApiPersistence(config: ApiPersistenceConfig) {
  const api = createApiDriver(config);
  driver = api;
  return api;
}

export function readPersistedJson<T>(key: string, fallback: T): T {
  try {
    const raw = getPersistenceDriver().getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writePersistedJson(key: string, value: unknown) {
  try {
    getPersistenceDriver().setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
