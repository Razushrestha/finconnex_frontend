import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAuthSecretKey, SESSION_COOKIE } from "@/lib/auth/constants";

const PUBLIC_PATHS = new Set(["/login"]);

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

  // Auth API routes handle their own logic
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const authenticated = await isAuthenticated(request);
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  // Logged-out users may only see the login page
  if (!authenticated) {
    if (isPublicPath) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Logged-in users should not stay on the login page — send them to the dashboard
  if (isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
