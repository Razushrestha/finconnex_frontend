/**
 * Persistence driver contract — session demo today, HTTP/API when backend is live.
 */

export type PersistenceMode = "session" | "api";

export interface TenantContext {
  /** Stable tenant / org id used to scope keys and API paths. */
  tenantId: string;
}

export interface PersistenceDriver {
  readonly mode: PersistenceMode;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ApiPersistenceConfig {
  /** Base URL for tenant-scoped CRM API, e.g. https://api.finconnex.app */
  baseUrl: string;
  /** Bearer / session token supplier */
  getAccessToken: () => string | null | Promise<string | null>;
  /** Optional fetch override (tests). */
  fetchImpl?: typeof fetch;
}
