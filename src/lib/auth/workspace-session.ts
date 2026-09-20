import "server-only";

import type { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth/session";
import {
  getSessionCookieOptions,
  SESSION_COOKIE,
  sessionRememberMe,
} from "@/lib/auth/constants";
import type { SessionPayload } from "@/lib/auth/types";
import {
  applyCrmTokenCookies,
  crmSelectWorkspace,
  crmMe,
  crmWorkspaceRole,
  sessionFromCrmUser,
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

  // The role has to be read with the *selected* token: the workspace-scoped
  // token carries a workspace locator and no role at all, and `session` still
  // holds whatever the previous workspace granted. Creating a workspace makes
  // you its OWNER, so without this a brand-new owner would keep rendering as
  // whatever they were before — the bug this whole change exists to fix.
  // A failure here must not sink the selection itself; the next /api/auth/me
  // refresh will fill the role in.
  const workspaceRole = await crmWorkspaceRole(
    selected.data.accessToken,
    selected.refreshToken ?? tokens.refreshToken,
  );

  // Re-read the account against the scoped token so name/email stay this
  // person's — not whatever was baked into the previous session cookie.
  const live = await crmMe(
    selected.data.accessToken,
    selected.refreshToken ?? tokens.refreshToken,
  ).catch(() => null);

  const remember = sessionRememberMe(session);
  const fromLive = live
    ? sessionFromCrmUser(live.data, workspace, selected.data.accessToken)
    : null;
  const nextSession = await createSessionToken(
    {
      ...(fromLive ?? session),
      tenantId: workspace.id,
      tenantSlug: workspace.slug,
      tenantName: workspace.name,
      hasWorkspace: true,
      workspaceRole: fromLive?.workspaceRole ?? workspaceRole,
      rememberMe: remember,
      mustChangePassword: false,
    },
    remember,
  );

  applyCrmTokenCookies(
    response,
    {
      accessToken: selected.data.accessToken,
      refreshToken: selected.refreshToken ?? tokens.refreshToken,
    },
    remember,
  );
  response.cookies.set(
    SESSION_COOKIE,
    nextSession,
    getSessionCookieOptions(remember),
  );
}
