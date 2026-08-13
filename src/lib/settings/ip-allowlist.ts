/**
 * Settings → Security → IP Restrictions (demo).
 * Readable cookie lets /api/auth/login enforce allowlist.
 */

import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";
import {
  getTwoFactorFlagCookieOptions,
  REMEMBER_MAX_AGE,
} from "@/lib/auth/constants";

export const IP_ALLOWLIST_COOKIE = "finconnex_ip_allowlist";

const STORE_KEY = "settings:ip-allowlist:v1";

export type IpAllowlistConfig = {
  enabled: boolean;
  entries: string[];
  updatedAt?: string;
};

const DEFAULT: IpAllowlistConfig = {
  enabled: false,
  entries: ["127.0.0.1", "::1", "localhost"],
};

function syncCookie(cfg: IpAllowlistConfig) {
  if (typeof document === "undefined") return;
  if (!cfg.enabled || !cfg.entries.length) {
    document.cookie = `${IP_ALLOWLIST_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  const value = encodeURIComponent(cfg.entries.join(","));
  const opts = getTwoFactorFlagCookieOptions(true);
  document.cookie = `${IP_ALLOWLIST_COOKIE}=${value}; Path=/; Max-Age=${opts.maxAge ?? REMEMBER_MAX_AGE}; SameSite=Lax`;
}

export function loadIpAllowlist(): IpAllowlistConfig {
  const stored = readPersistedJson<Partial<IpAllowlistConfig>>(STORE_KEY, {});
  const cfg: IpAllowlistConfig = {
    ...DEFAULT,
    ...stored,
    entries:
      Array.isArray(stored.entries) && stored.entries.length
        ? stored.entries
        : DEFAULT.entries,
  };
  syncCookie(cfg);
  return cfg;
}

export function saveIpAllowlist(
  patch: Partial<IpAllowlistConfig>,
): IpAllowlistConfig {
  const prev = loadIpAllowlist();
  const next: IpAllowlistConfig = {
    enabled: patch.enabled ?? prev.enabled,
    entries: (patch.entries ?? prev.entries)
      .map((e) => e.trim())
      .filter(Boolean),
    updatedAt: new Date().toISOString(),
  };
  writePersistedJson(STORE_KEY, next);
  syncCookie(next);
  return next;
}

/** True when allowlist is off or client IP matches an entry. */
export function isIpAllowed(
  clientIp: string | null | undefined,
  cookieHeader: string,
): boolean {
  const raw = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${IP_ALLOWLIST_COOKIE}=`));
  if (!raw) return true;
  const value = decodeURIComponent(raw.slice(IP_ALLOWLIST_COOKIE.length + 1));
  if (!value.trim()) return true;
  const entries = value
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!entries.length) return true;

  const ip = (clientIp ?? "").trim().toLowerCase();
  if (!ip) return false;
  const normalized = ip.replace(/^::ffff:/, "");
  return entries.some(
    (e) =>
      e === "*" ||
      e === normalized ||
      e === ip ||
      (e === "localhost" &&
        (normalized === "127.0.0.1" || normalized === "::1")),
  );
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  }
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}
