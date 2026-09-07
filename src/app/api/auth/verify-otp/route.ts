import { NextResponse } from "next/server";
import { CrmAuthError, crmVerifySignupOtp } from "@/lib/auth/crm-server";
import { verifyOtpSchema } from "@/lib/auth/validation";

// Activates a signed-up account with the fixed signup code. Sets no cookies —
// the user still logs in normally afterwards.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    try {
      await crmVerifySignupOtp(parsed.data);
    } catch (err) {
      if (err instanceof CrmAuthError) {
        if (err.status >= 500) {
          return NextResponse.json(
            { error: "Unable to verify right now. Try again shortly." },
            { status: 502 },
          );
        }
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/verify-otp]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
