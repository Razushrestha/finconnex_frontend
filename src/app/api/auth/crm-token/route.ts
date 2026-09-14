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
  if (!session) {
    return NextResponse.json(
      { authenticated: false, error: "Session has expired. Sign in again." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    accessToken?: string | null;
    refreshToken?: string | null;
  };
  let accessToken =
    typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  let refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";

  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { error: "CRM session token unavailable. Sign in again." },
      { status: 400 },
    );
  }

  if ((!accessToken || isCrmJwtExpired(accessToken)) && refreshToken) {
    try {
      const rotated = await refreshCrmTokens(refreshToken);
      accessToken = rotated.accessToken;
      refreshToken = rotated.refreshToken;
    } catch {
      return NextResponse.json(
        { error: "Session has expired. Sign in again." },
        { status: 401 },
      );
    }
  }

  if (!accessToken || isCrmJwtExpired(accessToken, 0)) {
    return NextResponse.json(
      { error: "CRM session token unavailable. Sign in again." },
      { status: 401 },
    );
  }

  const remember = sessionRememberMe(session);
  const response = NextResponse.json({
    authenticated: true,
    accessToken,
    refreshToken: refreshToken || null,
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    workspaceId: session.tenantId,
    expiresIn: crmJwtExpiresInSeconds(accessToken),
    rememberMe: remember,
  });

  applyCrmTokenCookies(
    response,
    { accessToken, refreshToken: refreshToken || null },
    remember,
  );
  const nextSession = await createSessionToken(session, remember);
  response.cookies.set(
    SESSION_COOKIE,
    nextSession,
    getSessionCookieOptions(remember),
  );
  return response;
}
