import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth/session";
import {
  getSessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/constants";
import {
  applyCrmTokenCookies,
  activateWorkspace,
  sessionFromCrmUser,
  type CrmUser,
} from "@/lib/auth/crm-server";
import { acceptWorkspaceInvitation } from "@/lib/workspace-invitations/api";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(
      (body as { token?: string; invitationToken?: string }).token ??
        (body as { invitationToken?: string }).invitationToken ??
        "",
    ).trim();
    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 },
      );
    }

    const accepted = await acceptWorkspaceInvitation(token);
    let session: string | null = null;
    let scopedAccess: string | null = null;
    let scopedRefresh: string | null = null;

    if (accepted.accessToken && accepted.refreshToken && accepted.user?.id) {
      try {
        const user: CrmUser = {
          id: accepted.user.id,
          email: accepted.user.email ?? "",
          firstName: accepted.user.firstName ?? null,
          lastName: accepted.user.lastName ?? null,
          userName: accepted.user.userName ?? accepted.user.email ?? "",
          avatar: null,
          globalRole: accepted.user.globalRole ?? "USER",
          isVerified: true,
        };
        const scoped = await activateWorkspace(
          accepted.accessToken,
          accepted.refreshToken,
          accepted.workspaceId,
        );
        session = await createSessionToken(
          sessionFromCrmUser(user, scoped.workspace, scoped.accessToken),
          false,
        );
        scopedAccess = scoped.accessToken;
        scopedRefresh = scoped.refreshToken ?? accepted.refreshToken;
      } catch {
        /* Invitation already accepted; session cookies are optional. */
      }
    }

    const signedIn = Boolean(session && scopedAccess);
    const response = NextResponse.json({
      ok: true,
      workspaceId: accepted.workspaceId ?? null,
      workspaceName: accepted.workspaceName ?? null,
      signedIn,
    });

    if (session && scopedAccess) {
      response.cookies.set(SESSION_COOKIE, session, getSessionCookieOptions(false));
      applyCrmTokenCookies(
        response,
        { accessToken: scopedAccess, refreshToken: scopedRefresh },
        false,
      );
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to accept this invitation.";
    const key = message.toLowerCase();
    const expired =
      key.includes("token") ||
      key.includes("expired") ||
      key.includes("used") ||
      key.includes("invalid");
    return NextResponse.json(
      {
        error: expired
          ? "This invitation is invalid or has already been used."
          : message,
      },
      { status: 400 },
    );
  }
}
