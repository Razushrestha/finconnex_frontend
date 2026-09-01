/**
 * Cross-check public.auth Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/auth/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  forgotPublicPassword,
  loginPublicUser,
  publicAuthPath,
  refreshPublicAuthToken,
  resendPublicEmailVerification,
  resetPublicPassword,
  verifyPublicEmail,
} from "@/lib/auth/public-api";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;
const DECOY_PATH = "/v1/__no_such_module_public_auth_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string; auth?: boolean }> = [
  { method: "POST", path: "/v1/auth/login" },
  { method: "POST", path: "/v1/auth/refresh-token", auth: true },
  { method: "POST", path: "/v1/auth/email-verification/resend" },
  { method: "POST", path: "/v1/auth/email-verification/verify" },
  { method: "POST", path: "/v1/auth/forgot-password" },
  { method: "POST", path: "/v1/auth/reset-password" },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokePublicAuthWiring() {
  const api = readSrc("src/lib/auth/public-api.ts");
  for (const name of [
    "loginPublicUser",
    "refreshPublicAuthToken",
    "forgotPublicPassword",
    "resetPublicPassword",
    "resendPublicEmailVerification",
    "verifyPublicEmail",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`public auth client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/auth${suffix}`")) {
    fail("public auth client missing /v1/auth path");
  }

  const server = readSrc("src/lib/auth/crm-server.ts");
  for (const name of [
    "crmLogin",
    "refreshCrmTokens",
    "crmForgotPassword",
    "crmResetPassword",
    "crmResendEmailVerification",
    "crmVerifyEmail",
  ]) {
    if (!server.includes(`export async function ${name}`)) {
      fail(`crm-server missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/auth/login"',
    'path: "/auth/refresh-token"',
    'path: "/auth/email-verification/resend"',
    'path: "/auth/email-verification/verify"',
    'path: "/auth/forgot-password"',
    'path: "/auth/reset-password"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const login = readSrc("src/components/auth/LoginForm.tsx");
  if (!login.includes("/forgot-password")) {
    fail("login form does not link to forgot password");
  }
  if (!login.includes("/api/auth/email-verification/resend")) {
    fail("login form does not resend email verification");
  }

  const forgot = readSrc("src/components/auth/ForgotPasswordForm.tsx");
  if (!forgot.includes("/api/auth/forgot-password")) {
    fail("forgot password form does not call /api/auth/forgot-password");
  }

  const reset = readSrc("src/components/auth/ResetPasswordForm.tsx");
  if (!reset.includes("/api/auth/reset-password")) {
    fail("reset password form does not call /api/auth/reset-password");
  }

  const verify = readSrc("src/components/auth/VerifyEmailClient.tsx");
  if (!verify.includes("/api/auth/email-verification/verify")) {
    fail("verify email client does not call verify");
  }
  if (!verify.includes("/api/auth/email-verification/resend")) {
    fail("verify email client does not call resend");
  }
}

export async function smokePublicAuthMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const raw =
      typeof input === "string" ? input : (input as Request).url ?? String(input);
    const parsed = new URL(raw, "https://crm.smoke.test");
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: { ok: true, accessToken: "a", refreshToken: "r", user: { id: "u" } },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await loginPublicUser("ada@example.com", "secret");
    await refreshPublicAuthToken("refresh-token");
    await forgotPublicPassword("ada@example.com");
    await resetPublicPassword({ token: "tok", password: "new-pass-1" });
    await resendPublicEmailVerification("ada@example.com");
    await verifyPublicEmail("tok");

    const expected = [
      `POST ${publicAuthPath("/login")}`,
      `POST ${publicAuthPath("/refresh-token")}`,
      `POST ${publicAuthPath("/forgot-password")}`,
      `POST ${publicAuthPath("/reset-password")}`,
      `POST ${publicAuthPath("/email-verification/resend")}`,
      `POST ${publicAuthPath("/email-verification/verify")}`,
    ];
    for (const hit of expected) {
      if (!hits.includes(hit)) {
        fail(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
  } finally {
    globalThis.fetch = origFetch;
  }
}

async function probeLive(base: string, method: string, path: string) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(method === "POST" || method === "PATCH"
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: method === "POST" || method === "PATCH" ? "{}" : undefined,
  });
  const text = await res.text();
  let message = text.slice(0, 180);
  try {
    const json = JSON.parse(text) as { message?: unknown };
    if (typeof json.message === "string") message = json.message;
  } catch {
    /* keep */
  }
  return { status: res.status, message };
}

function isRouted(status: number, message: string, authOnly: boolean) {
  if (status === 404 && message.toLowerCase().includes("cannot")) return false;
  if (authOnly) {
    const msg = message.toLowerCase();
    return (
      (status === 401 || status === 403) &&
      (msg.includes("token") ||
        msg.includes("unauthorized") ||
        msg.includes("forbidden") ||
        msg.includes("jwt"))
    );
  }
  return status !== 404;
}

export async function smokePublicAuthLive() {
  const base = (getCrmApiBaseUrl() || "https://finconnex.payperless.app").replace(
    /\/$/,
    "",
  );
  const rows: Array<{
    method: string;
    path: string;
    status: number;
    note: string;
  }> = [];
  let ok = true;

  const decoy = await probeLive(base, "GET", DECOY_PATH);
  rows.push({
    method: "GET",
    path: DECOY_PATH,
    status: decoy.status,
    note:
      decoy.status === 404
        ? `control 404: ${decoy.message}`
        : `expected 404, got ${decoy.status}`,
  });
  if (decoy.status !== 404) ok = false;

  for (const route of LIVE_ROUTES) {
    try {
      const hit = await probeLive(base, route.method, route.path);
      const routed = isRouted(hit.status, hit.message, !!route.auth);
      if (!routed) ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: hit.status,
        note: routed
          ? `routed: ${hit.message}`
          : `unexpected ${hit.status}: ${hit.message}`,
      });
    } catch (err) {
      ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: 0,
        note: err instanceof Error ? err.message : "network error",
      });
    }
  }

  return { ok, rows };
}

export async function runPublicAuthSmoke() {
  installSmokePolyfill();
  console.log("Public auth API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokePublicAuthWiring();
  console.log("   OK — client, catalog, login, forgot, reset, verify");

  console.log("\n2) Mock fetch…");
  await smokePublicAuthMock();
  console.log("   OK — public.auth routes hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokePublicAuthLive();
  for (const row of live.rows) {
    const isDecoy = row.path === DECOY_PATH;
    const mark = isDecoy
      ? row.status === 404
        ? "OK"
        : "FAIL"
      : row.note.startsWith("routed:")
        ? "OK"
        : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (!live.ok) fail("live public auth probe failed");

  console.log("\nPublic auth API smoke passed.");
}

runAsCli(runPublicAuthSmoke);
