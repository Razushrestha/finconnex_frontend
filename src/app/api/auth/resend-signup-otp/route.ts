import { NextResponse } from "next/server";
import { CrmAuthError, crmResendSignupOtp } from "@/lib/auth/crm-server";
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
      await crmResendSignupOtp(parsed.data.email);
    } catch (err) {
      if (err instanceof CrmAuthError) {
        if (err.status === 429) {
          return NextResponse.json(
            {
              error:
                "Too many signup-code requests. Wait a few minutes, then try again (or use the code already sent to your email).",
            },
            { status: 429 },
          );
        }
        if (err.status >= 500) {
          return NextResponse.json(
            { error: "Unable to resend the signup code right now. Try again shortly." },
            { status: 502 },
          );
        }
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    return NextResponse.json({
      ok: true,
      message:
        "Signup code requested from FinConnex CRM. Check inbox and spam for an email from the CRM mail sender — this app does not send that message. If nothing arrives, CRM mail/workers need fixing (not local SendGrid).",
    });
  } catch (error) {
    console.error("[auth/resend-signup-otp]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
