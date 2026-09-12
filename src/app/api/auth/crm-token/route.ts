import { NextResponse } from "next/server";
import { createSessionToken, getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  crmJwtExpiresInSeconds,
  resolveLiveCrmAuth,
} from "@/lib/auth/crm-server";
import {
  getSessionCookieOptions,
  SESSION_COOKIE,
  sessionRememberMe,
} from "@/lib/auth/constants";

export async function GET() {
  const session = await getSession();
  const live = await resolveLiveCrmAuth();
  const remember = sessionRememberMe(session);

  if (!session && !live?.accessToken) {
    return NextResponse.json({ authenticated: false });
  }

  const expiresIn = crmJwtExpiresInSeconds(live?.accessToken);
  const response = NextResponse.json({
    authenticated: true,
    accessToken: live?.accessToken ?? null,
    refreshToken: live?.refreshToken ?? null,
    tenantId: session?.tenantId ?? null,
    tenantSlug: session?.tenantSlug ?? null,
    workspaceId: session?.tenantId ?? null,
    expiresIn,
    rememberMe: remember,
  });

  if (live?.accessToken) {
    applyCrmTokenCookies(
      response,
      {
        accessToken: live.accessToken,
        refreshToken: live.refreshToken,
      },
      remember,
    );
  }

  if (session) {
    const nextSession = await createSessionToken(session, remember);
    response.cookies.set(
      SESSION_COOKIE,
      nextSession,
      getSessionCookieOptions(remember),
    );
  }

  return response;
}
