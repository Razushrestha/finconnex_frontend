import { NextResponse } from "next/server";
import {
  createSessionToken,
  verifyPending2faToken,
} from "@/lib/auth/session";
import {
  DEMO_TOTP_CODE,
} from "@/lib/auth/two-factor-shared";
import {
  getPending2faCookieOptions,
  getSessionCookieOptions,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE,
} from "@/lib/auth/constants";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      code?: string;
    };
    const code = String(body.code ?? "").trim().replace(/\s/g, "");

    const cookieHeader = request.headers.get("cookie") ?? "";
    const pendingRaw = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${PENDING_2FA_COOKIE}=`))
      ?.slice(PENDING_2FA_COOKIE.length + 1);

    if (!pendingRaw) {
      return NextResponse.json(
        { error: "2FA session expired. Sign in again." },
        { status: 401 },
      );
    }

    const pending = await verifyPending2faToken(decodeURIComponent(pendingRaw));
    if (!pending) {
      return NextResponse.json(
        { error: "2FA session expired. Sign in again." },
        { status: 401 },
      );
    }

    // Demo TOTP + allow common backup-code shape (XXXX-XXXX)
    const okCode =
      code === DEMO_TOTP_CODE || /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code);
    if (!okCode) {
      return NextResponse.json(
        { error: `Invalid code. Demo TOTP is ${DEMO_TOTP_CODE}` },
        { status: 401 },
      );
    }

    const token = await createSessionToken(
      {
        userId: pending.userId,
        email: pending.email,
        name: pending.name,
        role: pending.role,
        tenantId: pending.tenantId,
        tenantSlug: pending.tenantSlug,
        tenantName: pending.tenantName,
      },
      pending.rememberMe,
    );

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE,
      token,
      getSessionCookieOptions(pending.rememberMe),
    );
    response.cookies.set(PENDING_2FA_COOKIE, "", {
      ...getPending2faCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("[auth/verify-2fa]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
