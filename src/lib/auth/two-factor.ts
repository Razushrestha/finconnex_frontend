/**
 * Phase E1/F2 — Staff 2FA (demo TOTP).
 * Client session store + readable flag cookie for login API.
 */

import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";
import { DEMO_TOTP_CODE } from "@/lib/auth/two-factor-shared";
import {
  getTwoFactorFlagCookieOptions,
  TWO_FACTOR_FLAG_COOKIE,
} from "@/lib/auth/constants";

export { DEMO_TOTP_CODE };

const STORE_KEY = "auth:2fa:v1";

export type TwoFactorConfig = {
  enabled: boolean;
  enrolledAt?: string;
  secretDemo: string;
  backupCodes: string[];
};

const DEFAULT: TwoFactorConfig = {
  enabled: false,
  secretDemo: "FINCONNEX-DEMO-2FA",
  backupCodes: ["A1B2-C3D4", "E5F6-G7H8", "J9K0-L1M2"],
};

function syncFlagCookie(enabled: boolean) {
  if (typeof document === "undefined") return;
  const opts = getTwoFactorFlagCookieOptions(enabled);
  if (!enabled) {
    document.cookie = `${TWO_FACTOR_FLAG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${TWO_FACTOR_FLAG_COOKIE}=1; Path=/; Max-Age=${opts.maxAge}; SameSite=Lax`;
}

export function loadTwoFactorConfig(): TwoFactorConfig {
  const cfg = {
    ...DEFAULT,
    ...readPersistedJson<Partial<TwoFactorConfig>>(STORE_KEY, {}),
  };
  syncFlagCookie(cfg.enabled);
  return cfg;
}

export function saveTwoFactorConfig(cfg: TwoFactorConfig) {
  writePersistedJson(STORE_KEY, cfg);
  syncFlagCookie(cfg.enabled);
  return cfg;
}

export function isTwoFactorEnabled() {
  return loadTwoFactorConfig().enabled;
}

export function enableTwoFactor() {
  return saveTwoFactorConfig({
    ...loadTwoFactorConfig(),
    enabled: true,
    enrolledAt: new Date().toISOString(),
  });
}

export function disableTwoFactor() {
  return saveTwoFactorConfig({
    ...loadTwoFactorConfig(),
    enabled: false,
    enrolledAt: undefined,
  });
}

export function regenerateBackupCodes() {
  const codes = Array.from({ length: 3 }, () => {
    const a = Math.random().toString(36).slice(2, 6).toUpperCase();
    const b = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${a}-${b}`;
  });
  return saveTwoFactorConfig({ ...loadTwoFactorConfig(), backupCodes: codes });
}

export function verifyTotpDemo(
  code: string,
): { ok: true } | { ok: false; message: string } {
  const trimmed = code.trim().replace(/\s/g, "");
  const cfg = loadTwoFactorConfig();
  if (trimmed === DEMO_TOTP_CODE) return { ok: true };
  if (cfg.backupCodes.includes(trimmed.toUpperCase())) return { ok: true };
  return { ok: false, message: `Invalid code. Demo TOTP is ${DEMO_TOTP_CODE}` };
}
