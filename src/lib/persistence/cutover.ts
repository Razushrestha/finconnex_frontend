/**
 * Phase 14 — run live API cutover after auth resolves.
 */

import { LEAD_CARD_HYDRATE_KEYS } from "@/lib/leads/phase-9";
import { fetchAuthBridge, type AuthBridgeSnapshot } from "@/lib/persistence/auth-bridge";
import {
  bootstrapPersistence,
  type PersistenceBootstrapResult,
} from "@/lib/persistence/bootstrap";
import { createModuleRestClient } from "@/lib/persistence/module-client";
import type { ApiPersistenceConfig } from "@/lib/persistence/types";

export type LiveApiCutoverOptions = {
  /**
   * CRM API origin.
   * - `undefined` — read `NEXT_PUBLIC_CRM_API_URL`
   * - `null` — force session driver (no API)
   * - string — use that origin
   */
  baseUrl?: string | null;
  fetchImpl?: typeof fetch;
  /** Prefer module REST hydrate when true (default true if baseUrl set). */
  useModuleRoutes?: boolean;
  hydrateKeys?: readonly string[];
  /** Injected bridge (tests); otherwise fetchAuthBridge(). */
  bridge?: AuthBridgeSnapshot;
};

export type LiveApiCutoverResult = PersistenceBootstrapResult & {
  auth: AuthBridgeSnapshot;
  transport: "session" | "kv" | "module";
  moduleHydrated: number;
};

function readEnvBaseUrl(): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env.NEXT_PUBLIC_CRM_API_URL?.trim() || undefined;
}

/**
 * Full cutover: auth bridge → tenant → API driver → module (or KV) hydrate.
 */
export async function runLiveApiCutover(
  options: LiveApiCutoverOptions = {},
): Promise<LiveApiCutoverResult> {
  const bridge = options.bridge ?? (await fetchAuthBridge({
    fetchImpl: options.fetchImpl,
  }));
  const baseUrl =
    options.baseUrl === null
      ? undefined
      : options.baseUrl !== undefined
        ? options.baseUrl.trim() || undefined
        : readEnvBaseUrl();

  if (!baseUrl) {
    const boot = await bootstrapPersistence({
      mode: "session",
      tenantId: bridge.tenantId,
      hydrateKeys: [],
    });
    return {
      ...boot,
      auth: bridge,
      transport: "session",
      moduleHydrated: 0,
    };
  }

  const getAccessToken: ApiPersistenceConfig["getAccessToken"] = async () =>
    bridge.accessToken;

  const keys = [...(options.hydrateKeys ?? LEAD_CARD_HYDRATE_KEYS)];
  const useModules = options.useModuleRoutes !== false;

  if (useModules) {
    const boot = await bootstrapPersistence({
      mode: "api",
      baseUrl,
      tenantId: bridge.tenantId,
      getAccessToken,
      fetchImpl: options.fetchImpl,
      hydrateKeys: [], // modules fill cache
    });

    const api = boot.driver as {
      seedCache?: (k: string, v: string) => void;
      mode: string;
    };
    if (typeof api.seedCache !== "function") {
      return {
        ...boot,
        auth: bridge,
        transport: "kv",
        moduleHydrated: 0,
      };
    }

    const client = createModuleRestClient({
      baseUrl,
      getAccessToken,
      fetchImpl: options.fetchImpl,
    });
    const results = await client.hydrateIntoCache(api.seedCache, keys);
    const moduleHydrated = results.filter((r) => r.ok).length;

    return {
      ...boot,
      hydrated: moduleHydrated > 0,
      auth: bridge,
      transport: "module",
      moduleHydrated,
    };
  }

  const boot = await bootstrapPersistence({
    mode: "api",
    baseUrl,
    tenantId: bridge.tenantId,
    getAccessToken,
    fetchImpl: options.fetchImpl,
    hydrateKeys: keys,
  });

  return {
    ...boot,
    auth: bridge,
    transport: "kv",
    moduleHydrated: 0,
  };
}
