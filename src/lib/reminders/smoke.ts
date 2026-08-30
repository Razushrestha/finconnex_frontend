/**
 * Cross-check Reminders Swagger routes (global + workspace twins).
 * Run: npx tsx --tsconfig tsconfig.json src/lib/reminders/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  cancelCrmReminder,
  completeCrmReminder,
  createCrmReminder,
  createRelatedCrmReminder,
  dismissCrmReminder,
  getCrmReminder,
  getCrmReminderCapabilities,
  listCrmMyReminders,
  listCrmOverdueReminders,
  listCrmReminders,
  listCrmUpcomingReminders,
  listRelatedCrmReminders,
  normalizeReminder,
  relatedRemindersPath,
  rescheduleCrmReminder,
  snoozeCrmReminder,
  updateCrmReminder,
  workspaceRemindersPath,
} from "@/lib/reminders/api";
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
const PARENT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const DECOY_PATH = "/v1/__no_such_module_reminders_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/reminders" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/reminders` },
  { method: "GET", path: "/v1/reminders/my" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/reminders/my` },
  { method: "GET", path: "/v1/reminders/upcoming" },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/reminders/upcoming`,
  },
  { method: "GET", path: "/v1/reminders/overdue" },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/reminders/overdue`,
  },
  { method: "GET", path: "/v1/reminders/capabilities" },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/reminders/capabilities`,
  },
  { method: "GET", path: `/v1/reminders/${ID}` },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/reminders/${ID}` },
  { method: "POST", path: "/v1/reminders" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/reminders` },
  { method: "PATCH", path: `/v1/reminders/${ID}` },
  { method: "PATCH", path: `/v1/workspaces/${SESSION.workspaceId}/reminders/${ID}` },
  { method: "DELETE", path: `/v1/reminders/${ID}` },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/reminders/${ID}`,
  },
  { method: "POST", path: `/v1/reminders/${ID}/snooze` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/reminders/${ID}/snooze`,
  },
  { method: "POST", path: `/v1/reminders/${ID}/reschedule` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/reminders/${ID}/reschedule`,
  },
  { method: "POST", path: `/v1/reminders/${ID}/complete` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/reminders/${ID}/complete`,
  },
  { method: "POST", path: `/v1/reminders/${ID}/cancel` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/reminders/${ID}/cancel`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/Task/${PARENT_ID}/reminders`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/Task/${PARENT_ID}/reminders`,
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

export function smokeRemindersWiring() {
  const api = readSrc("src/lib/reminders/api.ts");
  if (!api.includes("workspaceRemindersPath")) {
    fail("reminders client missing workspaceRemindersPath");
  }
  if (!api.includes("relatedRemindersPath")) {
    fail("reminders client missing relatedRemindersPath");
  }
  for (const name of [
    "listCrmReminders",
    "listCrmMyReminders",
    "listCrmUpcomingReminders",
    "listCrmOverdueReminders",
    "getCrmReminderCapabilities",
    "getCrmReminder",
    "createCrmReminder",
    "updateCrmReminder",
    "dismissCrmReminder",
    "snoozeCrmReminder",
    "rescheduleCrmReminder",
    "completeCrmReminder",
    "cancelCrmReminder",
    "listRelatedCrmReminders",
    "createRelatedCrmReminder",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`reminders client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/reminders"',
    'path: "/reminders/my"',
    'path: "/reminders/upcoming"',
    'path: "/reminders/overdue"',
    'path: "/reminders/capabilities"',
    'path: "/reminders/:id/snooze"',
    'path: "/reminders/:id/reschedule"',
    'path: "/reminders/:id/complete"',
    'path: "/reminders/:id/cancel"',
    'path: "/workspaces/:workspaceId/reminders"',
    'path: "/workspaces/:workspaceId/reminders/:id/snooze"',
    'path: "/workspaces/:workspaceId/:parentType/:parentId/reminders"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/activities/reminders/page.tsx");
  if (!page.includes("useCrmReminders")) {
    fail("reminders page does not call useCrmReminders");
  }
  if (!page.includes("dismissCrmReminder")) {
    fail("reminders page does not dismiss via CRM");
  }

  const hook = readSrc("src/lib/reminders/use-crm-reminders.ts");
  if (!hook.includes("replaceCrmReminders")) {
    fail("reminders hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("reminders hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc("src/app/(dashboard)/activities/reminders/create/page.tsx");
  if (!create.includes("createCrmReminder")) {
    fail("create reminder page does not call createCrmReminder");
  }

  const relatedHook = readSrc("src/lib/reminders/use-related-crm-reminders.ts");
  if (!relatedHook.includes("listRelatedCrmReminders")) {
    fail("related reminders hook does not list via CRM");
  }

  for (const [rel, parent] of [
    ["src/components/activities/tasks/detail/TaskRemindersCard.tsx", '"Task"'],
    ["src/components/activities/calls/detail/CallRemindersCard.tsx", '"Call"'],
    [
      "src/components/activities/meetings/detail/MeetingRemindersCard.tsx",
      '"Meeting"',
    ],
  ] as const) {
    const src = readSrc(rel);
    if (!src.includes("useRelatedCrmReminders")) {
      fail(`${rel} does not call useRelatedCrmReminders`);
    }
    if (!src.includes(parent)) {
      fail(`${rel} does not use parent type ${parent}`);
    }
  }

  const normalized = normalizeReminder(
    {
      id: ID,
      title: "Follow up Chloe",
      status: "SNOOZED",
      type: "FOLLOW_UP",
      notificationMethod: "EMAIL",
    },
    0,
  );
  if (normalized.title !== "Follow up Chloe" || normalized.status !== "Snoozed") {
    fail("normalizeReminder did not map Swagger-shaped fields");
  }
}

export async function smokeRemindersMock() {
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
              title: "Follow up Chloe",
              status: "PENDING",
              type: "CUSTOM",
            },
          ],
          channels: ["EMAIL", "IN_APP"],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmReminders();
    await listCrmMyReminders();
    await listCrmUpcomingReminders();
    await listCrmOverdueReminders();
    await getCrmReminderCapabilities();
    await getCrmReminder(ID);
    await createCrmReminder({ title: "New" });
    await updateCrmReminder(ID, { title: "Updated" });
    await snoozeCrmReminder(ID);
    await rescheduleCrmReminder(ID, "2026-09-01T10:00:00.000Z");
    await completeCrmReminder(ID);
    await cancelCrmReminder(ID);
    await dismissCrmReminder(ID);
    await listRelatedCrmReminders("Task", PARENT_ID);
    await createRelatedCrmReminder("Task", PARENT_ID, { title: "Related" });

    const expected = [
      `GET ${workspaceRemindersPath(SESSION.workspaceId)}`,
      `GET ${workspaceRemindersPath(SESSION.workspaceId, "/my")}`,
      `GET ${workspaceRemindersPath(SESSION.workspaceId, "/upcoming")}`,
      `GET ${workspaceRemindersPath(SESSION.workspaceId, "/overdue")}`,
      `GET ${workspaceRemindersPath(SESSION.workspaceId, "/capabilities")}`,
      `GET ${workspaceRemindersPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceRemindersPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceRemindersPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceRemindersPath(SESSION.workspaceId, `/${ID}/snooze`)}`,
      `POST ${workspaceRemindersPath(SESSION.workspaceId, `/${ID}/reschedule`)}`,
      `POST ${workspaceRemindersPath(SESSION.workspaceId, `/${ID}/complete`)}`,
      `POST ${workspaceRemindersPath(SESSION.workspaceId, `/${ID}/cancel`)}`,
      `DELETE ${workspaceRemindersPath(SESSION.workspaceId, `/${ID}`)}`,
      `GET ${relatedRemindersPath(SESSION.workspaceId, "Task", PARENT_ID)}`,
      `POST ${relatedRemindersPath(SESSION.workspaceId, "Task", PARENT_ID)}`,
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

export async function smokeRemindersLive() {
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

export async function runRemindersSmoke() {
  installSmokePolyfill();
  console.log("Reminders API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeRemindersWiring();
  console.log("   OK — client, catalog, list page, create, related parent UI");

  console.log("\n2) Mock fetch…");
  await smokeRemindersMock();
  console.log("   OK — workspace-scoped reminder routes hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokeRemindersLive();
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
  if (!live.ok) fail("live reminders probe failed");

  console.log("\nReminders API smoke passed.");
}

runAsCli(runRemindersSmoke);
