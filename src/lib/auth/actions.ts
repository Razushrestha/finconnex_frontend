"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/auth/validation";

export type LoginActionState = {
  error: string | null;
};

/** Kept for compatibility; the login form posts to /api/auth/login (CRM). */
export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email") ?? formData.get("username"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid email or password",
    };
  }

  redirect("/login");
}
