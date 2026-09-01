import { NextResponse } from "next/server";
import {
  CrmAuthError,
  crmResendEmailVerification,
} from "@/lib/auth/crm-server";
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
      await crmResendEmailVerification(parsed.data.email);
    } catch (err) {
      if (err instanceof CrmAuthError && err.status >= 500) {
        return NextResponse.json(
          { error: "Unable to send a verification email right now. Try again shortly." },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message:
        "If that email needs verification, we sent a new confirmation message.",
    });
  } catch (error) {
    console.error("[auth/email-verification/resend]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
