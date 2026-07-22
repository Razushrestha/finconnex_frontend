import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAuthSecretKey, SESSION_COOKIE } from "@/lib/auth/constants";

/** Exact paths anyone can open (logged-out or logged-in). */
const PUBLIC_EXACT = new Set(["/login"]);

/**
 * Prefixes for client-facing surfaces — must work without CRM login.
 * Authenticated brokers may also open these (no force-redirect to dashboard).
 */
const PUBLIC_PREFIXES = [
  "/p/", // Client portal
  "/sign/", // E-signature
  "/book/", // Public booking
  "/f/", // Marketing forms
  "/l/", // Linktree
] as const;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix),
  );
}

/** Only these should bounce logged-in users away (stay on CRM, not auth screen). */
function isAuthEntryPath(pathname: string): boolean {
  return pathname === "/login";
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  try {
    await jwtVerify(token, getAuthSecretKey());
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const authenticated = await isAuthenticated(request);
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

  // Logged-in users leaving the login screen → dashboard
  if (isAuthEntryPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
