import { NextResponse } from "next/server";
import {
  getPending2faCookieOptions,
  getSessionCookieOptions,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth/constants";
import {
  clearCrmTokenCookies,
  crmLogout,
  isCrmAuthEnabled,
  readCrmTokens,
} from "@/lib/auth/crm-server";

export async function POST() {
  if (isCrmAuthEnabled()) {
    const tokens = await readCrmTokens();
    if (tokens.accessToken) {
      await crmLogout(tokens.accessToken, tokens.refreshToken);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...getSessionCookieOptions(false),
    maxAge: 0,
  });
  response.cookies.set(PENDING_2FA_COOKIE, "", {
    ...getPending2faCookieOptions(),
    maxAge: 0,
  });
  clearCrmTokenCookies(response);
  return response;
}
