/**
 * Cross-check notification-preferences Swagger routes (global + workspace twins).
 * Run: npx tsx --tsconfig tsconfig.json src/lib/notification-preferences/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  getCrmNotificationPreferences,
  globalNotificationPreferencesPath,
  normalizeNotificationPreferences,
  updateCrmNotificationPreferences,
  workspaceNotificationPreferencesPath,
} from "@/lib/notification-preferences/api";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;

const SESSION = {
  baseUrl: "https://crm.smoke.test",
  accessToken: "smoke-access",
  workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

const DECOY_PATH = "/v1/__no_such_module_notification_preferences_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/notification-preferences" },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/notification-preferences`,
  },
  { method: "PATCH", path: "/v1/notification-preferences" },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/notification-preferences`,
  },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeNotificationPreferencesWiring() {
  const api = readSrc("src/lib/notification-preferences/api.ts");
  if (!api.includes("workspaceNotificationPreferencesPath")) {
    fail("notification-preferences client missing workspace path helper");
  }
  if (api.includes("/restore") || api.includes("bulk-delete")) {
    fail("notification-preferences Swagger has no restore or bulk-delete");
  }
  for (const name of [
    "getCrmNotificationPreferences",
    "updateCrmNotificationPreferences",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`notification-preferences client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/notification-preferences"',
    'path: "/workspaces/:workspaceId/notification-preferences"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const prefsPage = readSrc(
    "src/app/(dashboard)/settings/my-preferences/page.tsx",
  );
  if (!prefsPage.includes("NotificationPreferencesClient")) {
    fail("my-preferences page does not render NotificationPreferencesClient");
  }

  const settingsPage = readSrc(
    "src/app/(dashboard)/settings/[category]/[subpage]/page.tsx",
  );
  if (!settingsPage.includes("NotificationPreferencesClient")) {
    fail("settings subpage does not render NotificationPreferencesClient");
  }

  const hook = readSrc(
    "src/lib/notification-preferences/use-crm-notification-preferences.ts",
  );
  if (!hook.includes("replaceCrmNotificationPreferences")) {
    fail("hook does not persist live CRM preferences");
  }
  if (!hook.includes('setSource("api")')) {
    fail("hook must mark a successful fetch as Live CRM");
  }

  const form = readSrc(
    "src/components/settings/NotificationPreferencesClient.tsx",
  );
  if (!form.includes("updateCrmNotificationPreferences")) {
    fail("preferences form does not call updateCrmNotificationPreferences");
  }

  const normalized = normalizeNotificationPreferences({
    emailEnabled: true,
    sms: false,
    push: { enabled: true },
    inAppEnabled: true,
    digest: "WEEKLY",
    fcmToken: "device-1",
  });
  if (
    !normalized.emailEnabled ||
    normalized.smsEnabled ||
    !normalized.pushEnabled ||
    normalized.digest !== "weekly" ||
    normalized.fcmToken !== "device-1"
  ) {
    fail("normalizeNotificationPreferences did not map Swagger-shaped fields");
  }
}

export async function smokeNotificationPreferencesMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(String(input));
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          inAppEnabled: true,
          digest: "daily",
          fcmToken: "device-1",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await getCrmNotificationPreferences();
    await updateCrmNotificationPreferences({
      emailEnabled: false,
      fcmToken: "device-2",
    });

    const expected = [
      `GET ${workspaceNotificationPreferencesPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceNotificationPreferencesPath(SESSION.workspaceId)}`,
    ];
    for (const hit of expected) {
      if (!hits.includes(hit)) {
        fail(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
    if (hits.includes(`GET ${globalNotificationPreferencesPath()}`)) {
      fail("scoped session should prefer the workspace URL");
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
      ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "PATCH" ? "{}" : undefined,
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

export async function smokeNotificationPreferencesLive() {
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

export async function runNotificationPreferencesSmoke() {
  installSmokePolyfill();
  console.log("Notification preferences API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeNotificationPreferencesWiring();
  console.log("   OK — client, catalog, settings + my-preferences");

  console.log("\n2) Mock fetch…");
  await smokeNotificationPreferencesMock();
  console.log("   OK — workspace-scoped GET/PATCH hit");

  console.log("\n3) Live CRM probe (decoy 404 vs preferences 401)…");
  const live = await smokeNotificationPreferencesLive();
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
  if (!live.ok) fail("live notification-preferences probe failed");

  console.log("\nNotification preferences API smoke passed.");
}

runAsCli(runNotificationPreferencesSmoke);
