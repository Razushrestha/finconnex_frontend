/**
 * Cross-check public.user Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/user-profile/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  getCrmUserProfile,
  normalizeUserProfile,
  updateCrmUserProfile,
  userProfilePath,
  userUpdatePath,
} from "@/lib/user-profile/api";
import { DEFAULT_USER_PROFILE } from "@/lib/user-profile/types";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;
const DECOY_PATH = "/v1/__no_such_module_user_profile_probe__";
const SESSION = {
  baseUrl: "https://crm.smoke.test",
  accessToken: "smoke-access",
  workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/user/profile" },
  { method: "PUT", path: "/v1/user" },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeUserProfileWiring() {
  const api = readSrc("src/lib/user-profile/api.ts");
  if (!api.includes('"/v1/user/profile"')) fail("user profile client missing GET path");
  if (!api.includes('"/v1/user"')) fail("user profile client missing PUT path");
  for (const name of ["getCrmUserProfile", "updateCrmUserProfile"]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`user profile client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  if (!catalog.includes('path: "/user/profile"')) {
    fail("endpoint catalog missing /user/profile");
  }
  if (!catalog.includes('path: "/user"')) {
    fail("endpoint catalog missing PUT /user");
  }

  const page = readSrc("src/app/(dashboard)/settings/my-preferences/page.tsx");
  if (!page.includes("UserProfileClient")) {
    fail("my-preferences does not render UserProfileClient");
  }

  const ui = readSrc("src/components/settings/UserProfileClient.tsx");
  if (!ui.includes("useCrmUserProfile") || !ui.includes("updateCrmUserProfile")) {
    fail("UserProfileClient is not wired to the CRM profile API");
  }

  const normalized = normalizeUserProfile({
    id: "u1",
    email: "ada@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    userName: "ada",
    phone: "+61 400 000",
    jobTitle: "Broker",
  });
  if (normalized.displayName !== "Ada Lovelace" || normalized.email !== "ada@example.com") {
    fail("normalizeUserProfile did not map profile fields");
  }
}

export async function smokeUserProfileMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const raw =
      typeof input === "string" ? input : (input as Request).url ?? String(input);
    const parsed = new URL(raw, SESSION.baseUrl);
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          id: "u1",
          email: "ada@example.com",
          firstName: "Ada",
          lastName: "Lovelace",
          userName: "ada",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await getCrmUserProfile();
    await updateCrmUserProfile({
      ...DEFAULT_USER_PROFILE,
      firstName: "Ada",
      lastName: "Lovelace",
      userName: "ada",
    });
    const expected = [
      `GET ${userProfilePath()}`,
      `PUT ${userUpdatePath()}`,
    ];
    for (const hit of expected) {
      if (!hits.includes(hit)) {
        fail(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
  } finally {
    bindCrmSession(null);
    globalThis.fetch = origFetch;
  }
}

async function probeLive(base: string, method: string, path: string) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "PUT" ? "{}" : undefined,
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

function isAuthRequired(status: number, message: string) {
  const msg = message.toLowerCase();
  return (
    (status === 401 || status === 403) &&
    (msg.includes("token") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden") ||
      msg.includes("jwt"))
  );
}

export async function smokeUserProfileLive() {
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
      const routed = isAuthRequired(hit.status, hit.message);
      if (!routed) ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: hit.status,
        note: routed
          ? `routed + auth required: ${hit.message}`
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

export async function runUserProfileSmoke() {
  installSmokePolyfill();
  console.log("User profile API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeUserProfileWiring();
  console.log("   OK — client, catalog, my-preferences");

  console.log("\n2) Mock fetch…");
  await smokeUserProfileMock();
  console.log("   OK — GET /user/profile + PUT /user");

  console.log("\n3) Live CRM probe…");
  const live = await smokeUserProfileLive();
  for (const row of live.rows) {
    const isDecoy = row.path === DECOY_PATH;
    const mark = isDecoy
      ? row.status === 404
        ? "OK"
        : "FAIL"
      : row.note.startsWith("routed + auth required")
        ? "OK"
        : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (!live.ok) fail("live user profile probe failed");

  console.log("\nUser profile API smoke passed.");
}

runAsCli(runUserProfileSmoke);
