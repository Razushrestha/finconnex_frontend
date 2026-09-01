/**
 * Cross-check Notifications inbox Swagger routes (global + workspace twins).
 * Run: npx tsx --tsconfig tsconfig.json src/lib/notifications/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  archiveCrmNotification,
  clearReadCrmNotifications,
  dismissCrmNotification,
  getCrmNotification,
  getCrmUnreadCount,
  listCrmNotifications,
  markAllCrmNotificationsRead,
  markCrmNotificationRead,
  markCrmNotificationUnread,
  normalizeNotification,
  workspaceNotificationsPath,
} from "@/lib/notifications/api";
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

const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DECOY_PATH = "/v1/__no_such_module_notifications_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/notifications" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/notifications` },
  { method: "GET", path: "/v1/notifications/unread-count" },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/notifications/unread-count`,
  },
  { method: "GET", path: `/v1/notifications/${ID}` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/notifications/${ID}`,
  },
  { method: "POST", path: "/v1/notifications/read-all" },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/notifications/read-all`,
  },
  { method: "POST", path: `/v1/notifications/${ID}/read` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/notifications/${ID}/read`,
  },
  { method: "POST", path: `/v1/notifications/${ID}/unread` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/notifications/${ID}/unread`,
  },
  { method: "PATCH", path: "/v1/notifications/read-all" },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/notifications/read-all`,
  },
  { method: "PATCH", path: `/v1/notifications/${ID}/read` },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/notifications/${ID}/read`,
  },
  { method: "PATCH", path: `/v1/notifications/${ID}/dismiss` },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/notifications/${ID}/dismiss`,
  },
  { method: "DELETE", path: "/v1/notifications/clear-read" },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/notifications/clear-read`,
  },
  { method: "DELETE", path: `/v1/notifications/${ID}` },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/notifications/${ID}`,
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

export function smokeNotificationsWiring() {
  const api = readSrc("src/lib/notifications/api.ts");
  if (!api.includes("workspaceNotificationsPath")) {
    fail("notifications client missing workspaceNotificationsPath");
  }
  if (api.includes("/restore") || api.includes("apply-template")) {
    fail("notifications Swagger has no restore or apply-template");
  }
  for (const name of [
    "listCrmNotifications",
    "getCrmUnreadCount",
    "getCrmNotification",
    "markAllCrmNotificationsRead",
    "markCrmNotificationRead",
    "markCrmNotificationUnread",
    "dismissCrmNotification",
    "clearReadCrmNotifications",
    "archiveCrmNotification",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`notifications client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/notifications"',
    'path: "/notifications/unread-count"',
    'path: "/notifications/:id"',
    'path: "/notifications/read-all"',
    'path: "/notifications/:id/read"',
    'path: "/notifications/:id/unread"',
    'path: "/notifications/:id/dismiss"',
    'path: "/notifications/clear-read"',
    'path: "/workspaces/:workspaceId/notifications"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const center = readSrc(
    "src/components/notifications/NotificationsCenterClient.tsx",
  );
  if (!center.includes("useCrmNotifications")) {
    fail("notifications center does not call useCrmNotifications");
  }
  for (const name of [
    "getCrmNotification",
    "markCrmNotificationRead",
    "markCrmNotificationUnread",
    "markAllCrmNotificationsRead",
    "dismissCrmNotification",
    "clearReadCrmNotifications",
    "archiveCrmNotification",
  ]) {
    if (!center.includes(name)) {
      fail(`notifications center does not call ${name}`);
    }
  }

  const bell = readSrc("src/components/notifications/NotificationBell.tsx");
  if (!bell.includes("useCrmNotifications")) {
    fail("notification bell does not call useCrmNotifications");
  }
  if (!bell.includes("markAllCrmNotificationsRead")) {
    fail("notification bell does not call markAllCrmNotificationsRead");
  }

  const hook = readSrc("src/lib/notifications/use-crm-notifications.ts");
  if (!hook.includes("replaceCrmNotifications")) {
    fail("notifications hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("notifications hook must mark a successful empty list as Live CRM");
  }

  const normalized = normalizeNotification(
    {
      id: ID,
      title: "Task assigned",
      message: "Follow up",
      type: "TASK_ASSIGNED",
      status: "UNREAD",
    },
    0,
  );
  if (normalized.title !== "Task assigned" || normalized.type !== "Task Assigned") {
    fail("normalizeNotification did not map Swagger-shaped fields");
  }
  if (normalized.status !== "Unread") {
    fail("normalizeNotification did not map UNREAD status");
  }
}

export async function smokeNotificationsMock() {
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
          items: [
            {
              id: ID,
              title: "Task assigned",
              message: "Follow up",
              type: "TASK_ASSIGNED",
              status: "UNREAD",
            },
          ],
          count: 1,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmNotifications();
    await getCrmUnreadCount();
    await getCrmNotification(ID);
    await markAllCrmNotificationsRead();
    await markCrmNotificationRead(ID);
    await markCrmNotificationUnread(ID);
    await dismissCrmNotification(ID);
    await clearReadCrmNotifications();
    await archiveCrmNotification(ID);

    const expected = [
      `GET ${workspaceNotificationsPath(SESSION.workspaceId)}`,
      `GET ${workspaceNotificationsPath(SESSION.workspaceId, "/unread-count")}`,
      `GET ${workspaceNotificationsPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceNotificationsPath(SESSION.workspaceId, "/read-all")}`,
      `POST ${workspaceNotificationsPath(SESSION.workspaceId, `/${ID}/read`)}`,
      `POST ${workspaceNotificationsPath(SESSION.workspaceId, `/${ID}/unread`)}`,
      `PATCH ${workspaceNotificationsPath(SESSION.workspaceId, `/${ID}/dismiss`)}`,
      `DELETE ${workspaceNotificationsPath(SESSION.workspaceId, "/clear-read")}`,
      `DELETE ${workspaceNotificationsPath(SESSION.workspaceId, `/${ID}`)}`,
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

export async function smokeNotificationsLive() {
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

export async function runNotificationsSmoke() {
  installSmokePolyfill();
  console.log("Notifications API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeNotificationsWiring();
  console.log("   OK — client, catalog, center, bell");

  console.log("\n2) Mock fetch…");
  await smokeNotificationsMock();
  console.log("   OK — workspace-scoped unique ops hit");

  console.log("\n3) Live CRM probe (decoy 404 vs notifications 401)…");
  const live = await smokeNotificationsLive();
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
  if (!live.ok) fail("live notifications probe failed");

  console.log("\nNotifications API smoke passed.");
}

runAsCli(runNotificationsSmoke);
