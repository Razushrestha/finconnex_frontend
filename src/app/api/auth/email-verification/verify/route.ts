import { NextResponse } from "next/server";
import { CrmAuthError, crmVerifyEmail } from "@/lib/auth/crm-server";
import { verifyEmailSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = verifyEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Verification token is required" },
        { status: 400 },
      );
    }

    try {
      await crmVerifyEmail(parsed.data.token);
      return NextResponse.json({
        ok: true,
        message: "Your email is verified. You can sign in now.",
      });
    } catch (err) {
      const message =
        err instanceof CrmAuthError
          ? err.message.toLowerCase().includes("token")
            ? "This verification link is invalid or has expired."
            : err.message
          : "Unable to verify your email. Please try again.";
      const status = err instanceof CrmAuthError ? err.status : 400;
      return NextResponse.json(
        { error: message },
        { status: status >= 400 && status < 600 ? status : 400 },
      );
    }
  } catch (error) {
    console.error("[auth/email-verification/verify]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
