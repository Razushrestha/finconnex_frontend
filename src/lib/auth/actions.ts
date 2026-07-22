"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDefaultSession } from "@/lib/auth/tenants";
import { createSessionToken } from "@/lib/auth/session";
import {
  getSessionCookieOptions,
  SESSION_COOKIE,
  STATIC_LOGIN,
} from "@/lib/auth/constants";
import { loginSchema } from "@/lib/auth/validation";

export type LoginActionState = {
  error: string | null;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid username or password",
    };
  }

  const { username, password, rememberMe } = parsed.data;

  if (
    username !== STATIC_LOGIN.username ||
    password !== STATIC_LOGIN.password
  ) {
    return { error: "Invalid username or password" };
  }

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

  const rawCallback = formData.get("callbackUrl");
  const callbackUrl =
    typeof rawCallback === "string" &&
    rawCallback.startsWith("/") &&
    !rawCallback.startsWith("//") &&
    !rawCallback.startsWith("/login") &&
    !rawCallback.startsWith("/api")
      ? rawCallback
      : "/";

  redirect(callbackUrl);
}
