import { NextResponse } from "next/server";
import { getSessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/constants";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear with the same options used when setting, so the browser drops it reliably
  response.cookies.set(SESSION_COOKIE, "", {
    ...getSessionCookieOptions(false),
    maxAge: 0,
  });

  return response;
}
