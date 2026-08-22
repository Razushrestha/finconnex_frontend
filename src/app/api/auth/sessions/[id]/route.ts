import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  applyCrmTokenCookies,
  crmRevokeSession,
  CrmAuthError,
  isCrmAuthEnabled,
  readCrmTokens,
} from "@/lib/auth/crm-server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const tokens = await readCrmTokens();
  if (!tokens.accessToken) {
    return NextResponse.json({ error: "No CRM session" }, { status: 401 });
  }

  try {
    const result = await crmRevokeSession(
      id,
      tokens.accessToken,
      tokens.refreshToken,
    );
    const response = NextResponse.json({ success: true });
    if (
      result.accessToken &&
      result.accessToken !== tokens.accessToken
    ) {
      applyCrmTokenCookies(response, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? tokens.refreshToken,
      });
    }
    return response;
  } catch (err) {
    const message =
      err instanceof CrmAuthError ? err.message : "Could not revoke session";
    const status = err instanceof CrmAuthError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
