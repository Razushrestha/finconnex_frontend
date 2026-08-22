import { NextResponse } from "next/server";
import { getSession, createSessionToken } from "@/lib/auth/session";
import { getSessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/constants";
import {
  applyCrmTokenCookies,
  crmListMyWorkspaces,
  crmSelectWorkspace,
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
    const workspace =
      listed.workspaces.find((w) => w.id === workspaceId) ?? null;
    const selected = await crmSelectWorkspace(
      workspaceId,
      listed.accessToken ?? tokens.accessToken,
      listed.refreshToken ?? tokens.refreshToken,
    );

    const nextSession = await createSessionToken(
      {
        ...session,
        tenantId: workspace?.id ?? workspaceId,
        tenantSlug: workspace?.slug ?? session.tenantSlug,
        tenantName: workspace?.name ?? session.tenantName,
      },
      false,
    );

    const response = NextResponse.json({
      success: true,
      workspace,
      workspaceId,
    });
    applyCrmTokenCookies(response, {
      accessToken: selected.data.accessToken,
      refreshToken: selected.refreshToken ?? tokens.refreshToken,
    });
    response.cookies.set(
      SESSION_COOKIE,
      nextSession,
      getSessionCookieOptions(false),
    );
    return response;
  } catch (err) {
    const message =
      err instanceof CrmAuthError ? err.message : "Could not select workspace";
    const status = err instanceof CrmAuthError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
