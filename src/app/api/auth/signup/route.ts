import { NextResponse } from "next/server";
import { CrmAuthError, crmSignup } from "@/lib/auth/crm-server";
import { signupSchema } from "@/lib/auth/validation";

// Deliberately never reveals whether an email is already registered (the
// backend already returns an identical response either way) — always the
// same success message, no session/cookies set. The user then activates the
// account with the signup code (`/api/auth/verify-otp`) and logs in normally.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    try {
      await crmSignup(parsed.data);
    } catch (err) {
      if (err instanceof CrmAuthError) {
        if (err.status >= 500) {
          return NextResponse.json(
            { error: "Unable to sign up right now. Try again shortly." },
            { status: 502 },
          );
        }
        // The backend already returns 200 for a duplicate email (no
        // existence leak), so any remaining 4xx here is a real problem
        // (rate limit, bad password policy) worth surfacing as-is.
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    return NextResponse.json({
      ok: true,
      message: "Account created. Enter your verification code to activate it.",
    });
  } catch (error) {
    console.error("[auth/signup]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
