import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";
import { getAuthSecretKey, SESSION_COOKIE } from "@/lib/auth/constants";

/** Exact paths anyone can open (logged-out or logged-in). */
const PUBLIC_EXACT = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  // Retired invitation links from emails sent before accounts were created
  // by admins; the page sends people to sign in.
  "/accept-invitation",
]);

/**
 * Prefixes for client-facing surfaces: must work without CRM login.
 * Authenticated brokers may also open these (no force-redirect to dashboard).
 */
const PUBLIC_PREFIXES = [
  "/p/", // Client portal
  "/sign/", // E-signature
  "/book/", // Public booking
  "/s/", // Short / one-time booking links
  "/go/", // Smart-link URL shortener
  "/h/", // Published Smart Link hubs
  "/f/", // Marketing forms
  "/l/", // Linktree
  "/j/", // Proposal-to-payment journey (client link)
  "/invite/", // Retired invitation links (see /accept-invitation)
  "/public/", // Public sales quotes / estimates / invoices
] as const;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (pathname.startsWith("/api/book/") && pathname !== "/api/book/publish") {
    return true;
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix),
  );
}

/** Only these should bounce logged-in users away (stay on CRM, not auth screen). */
function isAuthEntryPath(pathname: string): boolean {
  return pathname === "/login";
}

/** The verified session's claims, or null when signed out. */
async function sessionClaims(
  request: NextRequest,
): Promise<JWTPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    return payload;
  } catch {
    return null;
  }
}

const CHANGE_PASSWORD_PATH = "/change-password";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const claims = await sessionClaims(request);
  const authenticated = claims !== null;
  const publicPath = isPublicPath(pathname);

  if (!authenticated) {
    if (publicPath) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // A member an admin created replaces that password before anything else;
  // the CRM refuses them everything but /auth/* until they do.
  if (
    claims?.mustChangePassword === true &&
    pathname !== CHANGE_PASSWORD_PATH &&
    !publicPath
  ) {
    return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, request.url));
  }

  // Logged-in users leaving the login screen → dashboard
  if (isAuthEntryPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
