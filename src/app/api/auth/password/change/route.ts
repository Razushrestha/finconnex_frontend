import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  clearCrmTokenCookies,
  crmChangePassword,
  CrmAuthError,
  isCrmAuthEnabled,
  readCrmTokens,
} from "@/lib/auth/crm-server";
import {
  getPending2faCookieOptions,
  getSessionCookieOptions,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth/constants";

function friendlyMessage(raw: string, status: number): string {
  if (status === 401) return "Your current password is incorrect.";
  const key = raw.toLowerCase();
  if (key.includes("confirmation") || key.includes("mismatch") || key.includes("match")) {
    return "The new passwords don't match.";
  }
  if (key.includes("same") || key.includes("reuse") || key.includes("identical")) {
    return "Choose a password different from your current one.";
  }
  if (key.includes("length") || key.includes("short") || key.includes("minimum") || key.includes("policy")) {
    return "That password is too short for this workspace. Use at least 8 characters, or more if your workspace requires it.";
  }
  if (raw.startsWith("auth.") || raw.startsWith("user.")) {
    return "Your password couldn't be changed. Check it and try again.";
  }
  return raw || "Your password couldn't be changed. Try again.";
}

/**
 * Replaces the signed-in user's password. The CRM ends every session on
 * success, this one included, so the app's cookies are cleared too and the
 * user signs in again with the new password.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to change your password." }, { status: 401 });
  }
  if (!isCrmAuthEnabled()) {
    return NextResponse.json({ error: "CRM auth is not configured" }, { status: 503 });
  }
  const tokens = await readCrmTokens();
  if (!tokens.accessToken) {
    return NextResponse.json({ error: "Your session has ended. Sign in again." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const newPasswordConfirmation =
    typeof body.newPasswordConfirmation === "string" ? body.newPasswordConfirmation : "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Enter your current and new password." }, { status: 400 });
  }

  try {
    await crmChangePassword(tokens.accessToken, tokens.refreshToken, {
      currentPassword,
      newPassword,
      newPasswordConfirmation,
    });
  } catch (err) {
    const status = err instanceof CrmAuthError ? err.status : 502;
    const raw = err instanceof CrmAuthError ? err.message : "";
    return NextResponse.json(
      { error: friendlyMessage(raw, status) },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", { ...getSessionCookieOptions(false), maxAge: 0 });
  response.cookies.set(PENDING_2FA_COOKIE, "", { ...getPending2faCookieOptions(), maxAge: 0 });
  clearCrmTokenCookies(response);
  return response;
}
