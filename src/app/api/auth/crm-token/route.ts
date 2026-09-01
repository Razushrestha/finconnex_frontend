import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readCrmTokens } from "@/lib/auth/crm-server";

/**
 * Returns the live CRM access token when present, else the app session JWT.
 * Cookies win; `.env.local` CRM_ACCESS_TOKEN is a local fallback.
 */
export async function GET() {
  const session = await getSession();
  const crm = await readCrmTokens();

  if (!session && !crm.accessToken) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    accessToken: crm.accessToken,
    refreshToken: crm.refreshToken,
    tenantId: session?.tenantId ?? null,
    tenantSlug: session?.tenantSlug ?? null,
    workspaceId: session?.tenantId ?? null,
    expiresIn: null as number | null,
  });
}
