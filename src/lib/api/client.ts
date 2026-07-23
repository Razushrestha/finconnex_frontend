/**
 * FinConnex API client entrypoint.
 *
 * Usage:
 *   import { api } from "@/lib/api";
 *   const result = await api.leads.create({ ... });
 *   if (!result.ok) { showError(result.error.message); return; }
 *
 * Mode:
 *   - local  → session adapters (default while backend is in progress)
 *   - remote → NEXT_PUBLIC_API_BASE_URL/v1/*
 */

import { getApiMode } from "@/lib/api/config";
import type { FinconnexApi } from "@/lib/api/contracts";
import { createLocalApi } from "@/lib/api/local";
import { createRemoteApi } from "@/lib/api/remote";

let cached: FinconnexApi | null = null;

export function getApiClient(): FinconnexApi {
  if (cached) return cached;
  cached = getApiMode() === "remote" ? createRemoteApi() : createLocalApi();
  return cached;
}

/** Reset cached client (tests / after env change). */
export function resetApiClient() {
  cached = null;
}

/** Singleton used by UI modules. */
export const api: FinconnexApi = new Proxy({} as FinconnexApi, {
  get(_target, prop, receiver) {
    const client = getApiClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
