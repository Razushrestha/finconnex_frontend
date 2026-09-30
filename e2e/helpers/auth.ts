import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";

export type E2ECredentials = {
  email: string;
  password: string;
};

export function e2eCredentials(): E2ECredentials {
  return {
    email:
      process.env.E2E_EMAIL?.trim() ||
      process.env.E2E_USERNAME?.trim() ||
      "admin",
    password: process.env.E2E_PASSWORD?.trim() || "admin123",
  };
}

export function authStatePath() {
  return path.join(process.cwd(), "e2e", ".auth", "user.json");
}

/** Login via Next API and return Set-Cookie header value. */
export async function apiLogin(
  request: APIRequestContext,
  creds: E2ECredentials = e2eCredentials(),
): Promise<{ ok: boolean; status: number; cookies: string }> {
  const res = await request.post("/api/auth/login", {
    data: {
      email: creds.email,
      username: creds.email,
      password: creds.password,
    },
  });
  const status = res.status();
  const setCookies =
    typeof res.headersArray === "function"
      ? res
          .headersArray()
          .filter((h) => h.name.toLowerCase() === "set-cookie")
          .map((h) => h.value.split(";")[0])
          .join("; ")
      : "";
  const ok = status >= 200 && status < 300;
  return { ok, status, cookies: setCookies };
}

export function ensureAuthDir() {
  const dir = path.dirname(authStatePath());
  fs.mkdirSync(dir, { recursive: true });
}

export {
  expectPageLoads,
  expectRedirectsToLogin,
} from "./navigation";
