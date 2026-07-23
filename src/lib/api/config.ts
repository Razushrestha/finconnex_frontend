/**
 * FinConnex API configuration
 *
 * Backend team: set NEXT_PUBLIC_API_BASE_URL to your API origin
 * (e.g. https://api.finconnex.example or http://localhost:8080).
 * When unset / empty, the app uses the local session adapter.
 */

export type ApiMode = "local" | "remote";

export function getApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/** API version prefix appended to base URL for remote mode. */
export const API_VERSION_PREFIX = "/v1";

export function getApiMode(): ApiMode {
  return getApiBaseUrl() ? "remote" : "local";
}

export function isRemoteApi(): boolean {
  return getApiMode() === "remote";
}
