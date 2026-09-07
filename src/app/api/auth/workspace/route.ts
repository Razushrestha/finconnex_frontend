import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  crmListMyWorkspaces,
  CrmAuthError,
  isCrmAuthEnabled,
  readCrmTokens,
} from "@/lib/auth/crm-server";
import { remintSessionForWorkspace } from "@/lib/auth/workspace-session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isCrmAuthEnabled()) {
    return NextResponse.json({
      workspaces: [
        {
          id: session.tenantId,
          name: session.tenantName,
          slug: session.tenantSlug,
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
    const listed = await crmListMyWorkspaces(
      tokens.accessToken,
      tokens.refreshToken,
    );
    const response = NextResponse.json({
      workspaces: listed.workspaces,
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
      err instanceof CrmAuthError ? err.message : "Could not list workspaces";
    const status = err instanceof CrmAuthError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

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
    workspaceId?: string;
  };
  const workspaceId = body.workspaceId?.trim();
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required" },
      { status: 400 },
    );
  }

  const tokens = await readCrmTokens();
  if (!tokens.accessToken) {
    return NextResponse.json({ error: "No CRM session" }, { status: 401 });
  }

  try {
    const listed = await crmListMyWorkspaces(
      tokens.accessToken,
      tokens.refreshToken,
    );
    const workspace = listed.workspaces.find((w) => w.id === workspaceId) ?? {
      id: workspaceId,
      slug: session.tenantSlug,
      name: session.tenantName,
    };

    const response = NextResponse.json({
      success: true,
      workspace,
      workspaceId,
    });
    await remintSessionForWorkspace(response, session, workspace, {
      accessToken: listed.accessToken ?? tokens.accessToken,
      refreshToken: listed.refreshToken ?? tokens.refreshToken,
    });
    return response;
  } catch (err) {
    const message =
      err instanceof CrmAuthError ? err.message : "Could not select workspace";
    const status = err instanceof CrmAuthError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
