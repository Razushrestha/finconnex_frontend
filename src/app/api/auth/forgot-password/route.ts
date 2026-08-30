import { NextResponse } from "next/server";
import { CrmAuthError, crmForgotPassword } from "@/lib/auth/crm-server";
import { emailOnlySchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = emailOnlySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Enter a valid email address" },
        { status: 400 },
      );
    }

    try {
      await crmForgotPassword(parsed.data.email);
    } catch (err) {
      if (err instanceof CrmAuthError && err.status >= 500) {
        return NextResponse.json(
          { error: "Unable to send a reset email right now. Try again shortly." },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for that email, we sent password reset instructions.",
    });
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
