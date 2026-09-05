import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  resolveLiveCrmAuth,
} from "@/lib/auth/crm-server";

export async function GET() {
  const session = await getSession();
  const live = await resolveLiveCrmAuth();

  if (!session && !live?.accessToken) {
    return NextResponse.json({ authenticated: false });
  }

  const response = NextResponse.json({
    authenticated: true,
    accessToken: live?.accessToken ?? null,
    refreshToken: live?.refreshToken ?? null,
    tenantId: session?.tenantId ?? null,
    tenantSlug: session?.tenantSlug ?? null,
    workspaceId: session?.tenantId ?? null,
    expiresIn: null as number | null,
  });

  if (live?.accessToken) {
    applyCrmTokenCookies(response, {
      accessToken: live.accessToken,
      refreshToken: live.refreshToken,
    });
  }

  return response;
}
