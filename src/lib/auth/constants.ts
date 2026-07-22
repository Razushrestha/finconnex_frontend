export const SESSION_COOKIE = "finconnex_session";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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
