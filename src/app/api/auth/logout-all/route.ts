import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  crmLogoutAll,
  CrmAuthError,
  isCrmAuthEnabled,
  readCrmTokens,
  clearCrmTokenCookies,
} from "@/lib/auth/crm-server";
import {
  getPending2faCookieOptions,
  getSessionCookieOptions,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth/constants";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isCrmAuthEnabled()) {
    return NextResponse.json(
      { error: "CRM auth is not configured" },
      { status: 503 },
    );
  }

  const tokens = await readCrmTokens();
  if (!tokens.accessToken) {
    return NextResponse.json({ error: "No CRM session" }, { status: 401 });
  }

  try {
    await crmLogoutAll(tokens.accessToken, tokens.refreshToken);
  } catch (err) {
    const message =
      err instanceof CrmAuthError ? err.message : "Could not revoke sessions";
    const status = err instanceof CrmAuthError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
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
