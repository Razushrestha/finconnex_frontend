import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  crmListSessions,
  CrmAuthError,
  isCrmAuthEnabled,
  readCrmTokens,
} from "@/lib/auth/crm-server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isCrmAuthEnabled()) {
    return NextResponse.json({
      sessions: [
        {
          id: "local-current",
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
          ipHash: "local",
          userAgent: "This browser",
          current: true,
        },
      ],
      source: "local",
    });
  }

  const tokens = await readCrmTokens();
  if (!tokens.accessToken) {
    return NextResponse.json({ error: "No CRM session" }, { status: 401 });
  }

  try {
    const listed = await crmListSessions(
      tokens.accessToken,
      tokens.refreshToken,
    );
    const response = NextResponse.json({
      sessions: listed.sessions,
      source: "crm",
    });
    if (
      listed.accessToken &&
      listed.accessToken !== tokens.accessToken
    ) {
      applyCrmTokenCookies(response, {
        accessToken: listed.accessToken,
        refreshToken: listed.refreshToken ?? tokens.refreshToken,
      });
    }
    return response;
  } catch (err) {
    const message =
      err instanceof CrmAuthError ? err.message : "Could not list sessions";
    const status = err instanceof CrmAuthError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
