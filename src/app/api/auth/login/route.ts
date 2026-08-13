import { NextResponse } from "next/server";
import { getDefaultSession } from "@/lib/auth/tenants";
import {
  createPending2faToken,
  createSessionToken,
} from "@/lib/auth/session";
import {
  getPending2faCookieOptions,
  getSessionCookieOptions,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE,
  STATIC_LOGIN,
  TWO_FACTOR_FLAG_COOKIE,
} from "@/lib/auth/constants";
import { loginSchema } from "@/lib/auth/validation";
import {
  clientIpFromRequest,
  isIpAllowed,
} from "@/lib/settings/ip-allowlist";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);

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

    const { username, password, rememberMe } = parsed.data;

    if (
      username !== STATIC_LOGIN.username ||
      password !== STATIC_LOGIN.password
    ) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const result = getDefaultSession();
    const requires2fa = cookieHeader
      .split(";")
      .some((c) => c.trim().startsWith(`${TWO_FACTOR_FLAG_COOKIE}=1`));

    const sessionFields = {
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      tenantId: result.tenant.id,
      tenantSlug: result.tenant.slug,
      tenantName: result.tenant.name,
    };

    if (requires2fa) {
      const pending = await createPending2faToken({
        ...sessionFields,
        rememberMe: !!rememberMe,
      });
      const response = NextResponse.json({
        requires2fa: true,
        user: result.user,
        tenant: result.tenant,
      });
      response.cookies.set(
        PENDING_2FA_COOKIE,
        pending,
        getPending2faCookieOptions(),
      );
      response.cookies.set(SESSION_COOKIE, "", {
        ...getSessionCookieOptions(false),
        maxAge: 0,
      });
      return response;
    }

    const token = await createSessionToken(sessionFields, rememberMe);
    const response = NextResponse.json({
      requires2fa: false,
      user: result.user,
      tenant: result.tenant,
    });
    response.cookies.set(
      SESSION_COOKIE,
      token,
      getSessionCookieOptions(rememberMe),
    );
    response.cookies.set(PENDING_2FA_COOKIE, "", {
      ...getPending2faCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
