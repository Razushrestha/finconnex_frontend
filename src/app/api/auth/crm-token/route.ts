import { NextResponse } from "next/server";
import { createSessionToken, getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  crmJwtExpiresInSeconds,
  isCrmJwtExpired,
  refreshCrmTokens,
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

/**
 * Re-seed CRM cookies from client-held tokens (localStorage) when the access
 * JWT was too large to store in a cookie on Vercel.
 */
export async function POST(request: Request) {
  const session = await getSession();
  const live = await resolveLiveCrmAuth();
  const remember = sessionRememberMe(session);

  const body = (await request.json().catch(() => ({}))) as {
    accessToken?: string | null;
    refreshToken?: string | null;
  };
  let accessToken =
    typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  let refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";

  if (!accessToken) accessToken = live?.accessToken?.trim() || "";
  if (!refreshToken) refreshToken = live?.refreshToken?.trim() || "";

  if (!session && !accessToken && !refreshToken) {
    return NextResponse.json({ authenticated: false });
  }

  if ((!accessToken || isCrmJwtExpired(accessToken)) && refreshToken) {
    try {
      const rotated = await refreshCrmTokens(refreshToken);
      accessToken = rotated.accessToken;
      refreshToken = rotated.refreshToken;
    } catch {
      return NextResponse.json({ authenticated: false });
    }
  }

  if (!accessToken || isCrmJwtExpired(accessToken, 0)) {
    return NextResponse.json({ authenticated: false });
  }

  const response = NextResponse.json({
    authenticated: true,
    accessToken,
    refreshToken: refreshToken || null,
    tenantId: session?.tenantId ?? null,
    tenantSlug: session?.tenantSlug ?? null,
    workspaceId: session?.tenantId ?? null,
    expiresIn: crmJwtExpiresInSeconds(accessToken),
    rememberMe: remember,
  });

  applyCrmTokenCookies(
    response,
    { accessToken, refreshToken: refreshToken || null },
    remember,
  );
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
