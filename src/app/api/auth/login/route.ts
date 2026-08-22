import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth/session";
import {
  getPending2faCookieOptions,
  getSessionCookieOptions,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth/constants";
import { loginSchema } from "@/lib/auth/validation";
import {
  clientIpFromRequest,
  isIpAllowed,
} from "@/lib/settings/ip-allowlist";
import {
  activateWorkspace,
  applyCrmTokenCookies,
  crmLogin,
  CrmAuthError,
  sessionFromCrmUser,
} from "@/lib/auth/crm-server";

function friendlyAuthMessage(raw: string) {
  const key = raw.toLowerCase();
  if (key.includes("invalid") || key.includes("unauthorized") || key.includes("credential")) {
    return "Invalid email or password.";
  }
  if (key.includes("verified") || key.includes("verification")) {
    return "Please verify your email before signing in.";
  }
  if (key.includes("forbidden")) {
    return "You don’t have access to this workspace.";
  }
  if (raw.startsWith("auth.") || raw.startsWith("workspace.")) {
    return "Unable to sign in. Check your email and password.";
  }
  return raw;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = loginSchema.safeParse({
      email: (body as { email?: string; username?: string }).email
        ?? (body as { username?: string }).username,
      password: (body as { password?: string }).password,
      rememberMe: (body as { rememberMe?: boolean }).rememberMe,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const cookieHeader = request.headers.get("cookie") ?? "";
    const clientIp = clientIpFromRequest(request);
    if (!isIpAllowed(clientIp, cookieHeader)) {
      return NextResponse.json(
        {
          error: `Login blocked by IP allowlist (client ${clientIp || "unknown"})`,
        },
        { status: 403 },
      );
    }

    const { email, password, rememberMe } = parsed.data;

    try {
      const loggedIn = await crmLogin(email, password);
      const scoped = await activateWorkspace(
        loggedIn.accessToken,
        loggedIn.refreshToken,
      );
      const sessionFields = sessionFromCrmUser(
        loggedIn.user,
        scoped.workspace,
        scoped.accessToken,
      );
      const token = await createSessionToken(sessionFields, rememberMe);
      const response = NextResponse.json({
        requires2fa: false,
        source: "crm",
        user: {
          id: sessionFields.userId,
          email: sessionFields.email,
          name: sessionFields.name,
          role: sessionFields.role,
        },
        tenant: {
          id: sessionFields.tenantId,
          slug: sessionFields.tenantSlug,
          name: sessionFields.tenantName,
        },
        workspace: scoped.workspace,
        workspaces: scoped.workspaces,
      });
      response.cookies.set(
        SESSION_COOKIE,
        token,
        getSessionCookieOptions(rememberMe),
      );
      applyCrmTokenCookies(
        response,
        {
          accessToken: scoped.accessToken,
          refreshToken: scoped.refreshToken ?? loggedIn.refreshToken,
        },
        rememberMe,
      );
      response.cookies.set(PENDING_2FA_COOKIE, "", {
        ...getPending2faCookieOptions(),
        maxAge: 0,
      });
      return response;
    } catch (err) {
      const message =
        err instanceof CrmAuthError
          ? friendlyAuthMessage(err.message)
          : "Unable to sign in. Please try again.";
      const status = err instanceof CrmAuthError ? err.status : 401;
      return NextResponse.json(
        { error: message },
        { status: status >= 400 && status < 600 ? status : 401 },
      );
    }
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
