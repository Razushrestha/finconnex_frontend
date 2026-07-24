import { LEAD_CARD_HYDRATE_KEYS } from "@/lib/leads/phase-9";
import {
  enableApiPersistence,
  enableSessionPersistence,
  getPersistenceDriver,
  getPersistenceMode,
} from "@/lib/persistence/registry";
import { setTenantContext } from "@/lib/persistence/tenant";
import type {
  ApiPersistenceConfig,
  PersistenceDriver,
  PersistenceMode,
} from "@/lib/persistence/types";

export type PersistenceBootstrapResult = {
  mode: PersistenceMode;
  driver: PersistenceDriver;
  tenantId: string;
  hydrated: boolean;
};

export type BootstrapPersistenceOptions = {
  /** `auto` = API when baseUrl present, else session. */
  mode?: PersistenceMode | "auto";
  baseUrl?: string;
  tenantId?: string;
  getAccessToken?: ApiPersistenceConfig["getAccessToken"];
  fetchImpl?: ApiPersistenceConfig["fetchImpl"];
  /** Defaults to Lead Card hydrate keys. Pass `[]` to skip. */
  hydrateKeys?: readonly string[] | null;
};

function readEnvBaseUrl(): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env.NEXT_PUBLIC_CRM_API_URL?.trim();
  return v || undefined;
}

function readEnvTenantId(): string {
  if (typeof process === "undefined") return "demo";
  return (
    process.env.NEXT_PUBLIC_TENANT_ID?.trim() ||
    process.env.FINCONNEX_TENANT_ID?.trim() ||
    "demo"
  );
}

/**
 * App / test entry: set tenant, choose session vs API driver, optionally hydrate.
 * Safe to call multiple times (last call wins).
 */
export async function bootstrapPersistence(
  options: BootstrapPersistenceOptions = {},
): Promise<PersistenceBootstrapResult> {
  const tenantId = options.tenantId?.trim() || readEnvTenantId();
  setTenantContext({ tenantId });

  const baseUrl = options.baseUrl?.trim() || readEnvBaseUrl();
  const requested = options.mode ?? "auto";
  const useApi =
    requested === "api" || (requested === "auto" && Boolean(baseUrl));

  if (!useApi || !baseUrl) {
    const driver = enableSessionPersistence();
    return {
      mode: "session",
      driver,
      tenantId,
      hydrated: false,
    };
  }

  const api = enableApiPersistence({
    baseUrl,
    getAccessToken:
      options.getAccessToken ?? (async () => null as string | null),
    fetchImpl: options.fetchImpl,
  });

  const keys =
    options.hydrateKeys === null
      ? []
      : [...(options.hydrateKeys ?? LEAD_CARD_HYDRATE_KEYS)];

  let hydrated = false;
  if (keys.length > 0) {
    await api.hydrate(keys);
    hydrated = true;
  }

  return {
    mode: getPersistenceMode(),
    driver: getPersistenceDriver(),
    tenantId,
    hydrated,
  };
}
