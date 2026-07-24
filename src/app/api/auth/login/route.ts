import { NextResponse } from "next/server";
import { getDefaultSession } from "@/lib/auth/tenants";
import { createSessionToken } from "@/lib/auth/session";
import {
  getSessionCookieOptions,
  SESSION_COOKIE,
  STATIC_LOGIN,
} from "@/lib/auth/constants";
import { loginSchema } from "@/lib/auth/validation";

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

    const { username, password, rememberMe } = parsed.data;

    // Static credential check: swap for real API auth later
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

    const token = await createSessionToken(
      {
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        tenantId: result.tenant.id,
        tenantSlug: result.tenant.slug,
        tenantName: result.tenant.name,
      },
      rememberMe,
    );

    const response = NextResponse.json({
      user: result.user,
      tenant: result.tenant,
    });

    response.cookies.set(
      SESSION_COOKIE,
      token,
      getSessionCookieOptions(rememberMe),
    );

    return response;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
