import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDefaultSession } from "@/lib/auth/tenants";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session";
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

    const { rememberMe } = parsed.data;
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
