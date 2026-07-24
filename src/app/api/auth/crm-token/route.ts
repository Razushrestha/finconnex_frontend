import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { cookies } from "next/headers";

/**
 * Phase 14 — CRM API token bridge.
 * Returns the session JWT as a Bearer candidate + tenant id for persistence cutover.
 * Swap for a dedicated CRM OAuth token when the live API ships.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  return NextResponse.json({
    authenticated: true,
    accessToken,
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    expiresIn: null as number | null,
  });
}
