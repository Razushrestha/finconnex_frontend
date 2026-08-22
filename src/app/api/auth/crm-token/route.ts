import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readCrmTokens } from "@/lib/auth/crm-server";

/**
 * Returns the live CRM access token when present, else the app session JWT.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const crm = await readCrmTokens();
  const accessToken = crm.accessToken;

  return NextResponse.json({
    authenticated: true,
    accessToken,
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    workspaceId: session.tenantId,
    expiresIn: null as number | null,
  });
}
