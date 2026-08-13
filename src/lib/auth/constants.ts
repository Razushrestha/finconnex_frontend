export const SESSION_COOKIE = "finconnex_session";
/** Short-lived JWT after password OK when 2FA is required — not a full session. */
export const PENDING_2FA_COOKIE = "finconnex_pending_2fa";
/** Readable flag so login API knows org requires 2FA (set by settings client). */
export const TWO_FACTOR_FLAG_COOKIE = "finconnex_2fa_enabled";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const PENDING_2FA_MAX_AGE = 60 * 10; // 10 minutes

/** Static credentials for local/dev login. Replace with API auth later. */
export const STATIC_LOGIN = {
  username: "admin",
  password: "admin123",
} as const;

/**
 * Shared between middleware (edge) and server routes.
 * Set AUTH_SECRET in Vercel → Project Settings → Environment Variables.
 */
export function getAuthSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ??
    "finconnex-dev-secret-change-in-production";

  return new TextEncoder().encode(secret);
}

export function getSessionCookieOptions(rememberMe = false) {
  const maxAge = rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function getPending2faCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PENDING_2FA_MAX_AGE,
  };
}

export function getTwoFactorFlagCookieOptions(enabled: boolean) {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: enabled ? REMEMBER_MAX_AGE : 0,
  };
}
