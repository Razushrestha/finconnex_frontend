import "server-only";

import type { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth/session";
import { getSessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/constants";
import type { SessionPayload } from "@/lib/auth/types";
import {
  applyCrmTokenCookies,
  crmSelectWorkspace,
  type CrmWorkspace,
} from "@/lib/auth/crm-server";

/**
 * Selects a workspace on the CRM backend and re-mints both the FinConnex
 * session cookie and the CRM access/refresh cookies to point at it —
 * shared by "switch workspace" (`/api/auth/workspace` POST) and "create my
 * first workspace" (`/api/auth/workspace/create`), which both need the
 * exact same cookie/session refresh after picking a workspace.
 */
export async function remintSessionForWorkspace(
  response: NextResponse,
  session: SessionPayload,
  workspace: CrmWorkspace,
  tokens: { accessToken: string; refreshToken?: string | null },
): Promise<void> {
  const selected = await crmSelectWorkspace(
    workspace.id,
    tokens.accessToken,
    tokens.refreshToken,
  );

  const nextSession = await createSessionToken(
    {
      ...session,
      tenantId: workspace.id,
      tenantSlug: workspace.slug,
      tenantName: workspace.name,
      hasWorkspace: true,
    },
    false,
  );

  applyCrmTokenCookies(response, {
    accessToken: selected.data.accessToken,
    refreshToken: selected.refreshToken ?? tokens.refreshToken,
  });
  response.cookies.set(
    SESSION_COOKIE,
    nextSession,
    getSessionCookieOptions(false),
  );
}
