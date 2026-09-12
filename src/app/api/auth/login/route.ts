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

function friendlyAuthMessage(raw: string, status?: number) {
  if (status === 502 || status === 503 || status === 504) {
    return "FinConnex CRM is unavailable (bad gateway). Try again when the API is back.";
  }
  const key = raw.toLowerCase();
  if (
    key.includes("bad gateway") ||
    key.includes("<html") ||
    key.includes("econnrefused") ||
    key.includes("fetch failed")
  ) {
    return "FinConnex CRM is unavailable (bad gateway). Try again when the API is back.";
  }
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
      const token = await createSessionToken(
        { ...sessionFields, rememberMe: Boolean(rememberMe) },
        rememberMe,
      );
      const response = NextResponse.json({
        requires2fa: false,
        source: "crm",
        needsWorkspace: !scoped.workspace,
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
      const status = err instanceof CrmAuthError ? err.status : 502;
      const raw =
        err instanceof CrmAuthError
          ? err.message
          : "Unable to sign in. Please try again.";
      const message = friendlyAuthMessage(raw, status);
      return NextResponse.json(
        { error: message },
        { status: status >= 400 && status < 600 ? status : 502 },
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
