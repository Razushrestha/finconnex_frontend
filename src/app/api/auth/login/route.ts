import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateUser } from "@/lib/auth/tenants";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid credentials" },
        { status: 400 },
      );
    }

    const { tenantSlug, email, password, rememberMe } = parsed.data;
    const result = authenticateUser(tenantSlug, email, password);

    if (!result) {
      return NextResponse.json(
        { error: "Invalid organization, email, or password" },
        { status: 401 },
      );
    }

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

    const cookieStore = await cookies();
    cookieStore.set(
      SESSION_COOKIE,
      token,
      getSessionCookieOptions(rememberMe),
    );

    return NextResponse.json({
      user: result.user,
      tenant: result.tenant,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
