import { NextResponse } from "next/server";
import { CrmAuthError, crmResetPassword } from "@/lib/auth/crm-server";
import { resetPasswordSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid reset request" },
        { status: 400 },
      );
    }

    try {
      await crmResetPassword({
        token: parsed.data.token,
        password: parsed.data.password,
        confirmPassword: parsed.data.confirmPassword,
      });
      return NextResponse.json({
        ok: true,
        message: "Your password has been reset. You can sign in now.",
      });
    } catch (err) {
      const message =
        err instanceof CrmAuthError
          ? err.message.toLowerCase().includes("token")
            ? "This reset link is invalid or has expired."
            : err.message
          : "Unable to reset your password. Please try again.";
      const status = err instanceof CrmAuthError ? err.status : 400;
      return NextResponse.json(
        { error: message },
        { status: status >= 400 && status < 600 ? status : 400 },
      );
    }
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
