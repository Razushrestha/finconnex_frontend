import { NextResponse } from "next/server";
import { createSessionToken, getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  crmMe,
  isCrmAuthEnabled,
  readCrmTokens,
  sessionFromCrmUser,
} from "@/lib/auth/crm-server";
import {
  getSessionCookieOptions,
  SESSION_COOKIE,
  sessionRememberMe,
} from "@/lib/auth/constants";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const remember = sessionRememberMe(session);

  if (isCrmAuthEnabled()) {
    const tokens = await readCrmTokens();
    if (tokens.accessToken) {
      try {
        const live = await crmMe(tokens.accessToken, tokens.refreshToken);
        const mapped = sessionFromCrmUser(
          live.data,
          {
            id: session.tenantId,
            name: session.tenantName,
            slug: session.tenantSlug,
          },
          live.accessToken ?? tokens.accessToken,
        );
        const response = NextResponse.json({
          authenticated: true,
          source: "crm",
          user: {
            id: mapped.userId,
            email: mapped.email,
            name: mapped.name,
            role: mapped.role,
            avatar: live.data.avatar,
          },
          tenant: {
            id: mapped.tenantId,
            slug: mapped.tenantSlug,
            name: mapped.tenantName,
          },
        });
        applyCrmTokenCookies(
          response,
          {
            accessToken: live.accessToken ?? tokens.accessToken,
            refreshToken: live.refreshToken ?? tokens.refreshToken,
          },
          remember,
        );
        const nextSession = await createSessionToken(
          { ...mapped, rememberMe: remember },
          remember,
        );
        response.cookies.set(
          SESSION_COOKIE,
          nextSession,
          getSessionCookieOptions(remember),
        );
        return response;
      } catch {
        /* fall through to cookie session */
      }
    }
  }

  const response = NextResponse.json({
    authenticated: true,
    source: "local",
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    },
    tenant: {
      id: session.tenantId,
      slug: session.tenantSlug,
      name: session.tenantName,
    },
  });
  const nextSession = await createSessionToken(session, remember);
  response.cookies.set(
    SESSION_COOKIE,
    nextSession,
    getSessionCookieOptions(remember),
  );
  return response;
}
