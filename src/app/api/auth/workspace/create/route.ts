import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  crmCreateWorkspace,
  CrmAuthError,
  isCrmAuthEnabled,
  readCrmTokens,
} from "@/lib/auth/crm-server";
import { remintSessionForWorkspace } from "@/lib/auth/workspace-session";

/**
 * The deliberate "create my first workspace" step for a freshly
 * signed-up/verified user who has zero workspaces (see `needsWorkspace` in
 * `/api/auth/login`). Distinct from `/api/auth/workspace` (switching between
 * workspaces you already belong to) — this one creates a brand-new one and
 * makes the caller its OWNER.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isCrmAuthEnabled()) {
    return NextResponse.json(
      { error: "CRM auth is not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
  };
  const name = body.name?.trim();
  if (!name || name.length < 2 || name.length > 100) {
    return NextResponse.json(
      { error: "Workspace name must be between 2 and 100 characters." },
      { status: 400 },
    );
  }
  const slug = body.slug?.trim();
  if (slug && !/^[a-z0-9-]{2,63}$/.test(slug)) {
    return NextResponse.json(
      {
        error:
          "Slug must be 2-63 characters, lowercase letters, numbers, and hyphens only.",
      },
      { status: 400 },
    );
  }

  const tokens = await readCrmTokens();
  if (!tokens.accessToken) {
    return NextResponse.json({ error: "No CRM session" }, { status: 401 });
  }

  try {
    const created = await crmCreateWorkspace(
      tokens.accessToken,
      tokens.refreshToken,
      { name, slug },
    );

    const response = NextResponse.json({
      success: true,
      workspace: created.workspace,
    });
    await remintSessionForWorkspace(response, session, created.workspace, {
      accessToken: created.accessToken ?? tokens.accessToken,
      refreshToken: created.refreshToken ?? tokens.refreshToken,
    });
    return response;
  } catch (err) {
    const message =
      err instanceof CrmAuthError ? err.message : "Could not create workspace";
    const status = err instanceof CrmAuthError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
