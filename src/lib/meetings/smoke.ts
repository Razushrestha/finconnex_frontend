/**
 * Cross-check Meetings Swagger routes (global + workspace twins).
 * Run: npx tsx --tsconfig tsconfig.json src/lib/meetings/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  addCrmMeetingAttendee,
  cancelCrmMeeting,
  completeCrmMeeting,
  createCrmMeeting,
  deleteCrmMeeting,
  getCrmMeeting,
  listCrmMeetings,
  listRelatedCrmMeetings,
  listUpcomingCrmMeetings,
  normalizeMeeting,
  relatedMeetingsPath,
  removeCrmMeetingAttendee,
  replaceCrmMeetingAttendees,
  rescheduleCrmMeeting,
  setCrmMeetingReminders,
  startCrmMeeting,
  updateCrmMeeting,
  workspaceMeetingsPath,
} from "@/lib/meetings/api";
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
const USER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const RELATED_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const DECOY_PATH = "/v1/__no_such_module_meetings_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/meetings" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/meetings` },
  { method: "GET", path: "/v1/meetings/upcoming" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/meetings/upcoming` },
  { method: "GET", path: `/v1/meetings/${ID}` },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/LEAD/${RELATED_ID}/meetings`,
  },
  { method: "POST", path: "/v1/meetings" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/meetings` },
  { method: "PATCH", path: `/v1/meetings/${ID}` },
  { method: "PATCH", path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}` },
  { method: "DELETE", path: `/v1/meetings/${ID}` },
  { method: "DELETE", path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}` },
  { method: "POST", path: `/v1/meetings/${ID}/cancel` },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}/cancel` },
  { method: "POST", path: `/v1/meetings/${ID}/start` },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}/start` },
  { method: "POST", path: `/v1/meetings/${ID}/complete` },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}/complete` },
  { method: "POST", path: `/v1/meetings/${ID}/reschedule` },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}/reschedule` },
  { method: "POST", path: `/v1/meetings/${ID}/attendees/${USER_ID}` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}/attendees/${USER_ID}`,
  },
  { method: "DELETE", path: `/v1/meetings/${ID}/attendees/${USER_ID}` },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}/attendees/${USER_ID}`,
  },
  { method: "PUT", path: `/v1/meetings/${ID}/attendees` },
  { method: "PUT", path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}/attendees` },
  { method: "POST", path: `/v1/meetings/${ID}/reminders` },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/meetings/${ID}/reminders` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeMeetingsWiring() {
  const api = readSrc("src/lib/meetings/api.ts");
  for (const name of [
    "listCrmMeetings",
    "listUpcomingCrmMeetings",
    "getCrmMeeting",
    "listRelatedCrmMeetings",
    "createCrmMeeting",
    "updateCrmMeeting",
    "deleteCrmMeeting",
    "cancelCrmMeeting",
    "startCrmMeeting",
    "completeCrmMeeting",
    "rescheduleCrmMeeting",
    "addCrmMeetingAttendee",
    "removeCrmMeetingAttendee",
    "replaceCrmMeetingAttendees",
    "setCrmMeetingReminders",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`meetings client missing ${name}`);
    }
  }
  if (!api.includes("workspaceMeetingsPath")) {
    fail("meetings client missing workspaceMeetingsPath");
  }
  if (!api.includes("relatedMeetingsPath")) {
    fail("meetings client missing relatedMeetingsPath");
  }
  if (api.includes("/restore")) {
    fail("meetings Swagger has no restore route");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/meetings"',
    'path: "/meetings/upcoming"',
    'path: "/meetings/:id"',
    'path: "/meetings/:id/cancel"',
    'path: "/meetings/:id/start"',
    'path: "/meetings/:id/complete"',
    'path: "/meetings/:id/reschedule"',
    'path: "/meetings/:id/attendees/:userId"',
    'path: "/meetings/:id/attendees"',
    'path: "/meetings/:id/reminders"',
    'path: "/workspaces/:workspaceId/meetings"',
    'path: "/workspaces/:workspaceId/:relatedType/:relatedId/meetings"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/activities/meetings/page.tsx");
  if (!page.includes("useCrmMeetings")) {
    fail("meetings page does not call useCrmMeetings");
  }

  const hook = readSrc("src/lib/meetings/use-crm-meetings.ts");
  if (!hook.includes("replaceCrmMeetings")) {
    fail("meetings hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("meetings hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc("src/components/activities/meetings/CreateMeetingForm.tsx");
  if (!create.includes("createCrmMeeting")) {
    fail("create meeting form does not call createCrmMeeting");
  }

  const detail = readSrc("src/app/(dashboard)/activities/meetings/detail/[id]/page.tsx");
  for (const name of [
    "getCrmMeeting",
    "startCrmMeeting",
    "completeCrmMeeting",
    "cancelCrmMeeting",
    "deleteCrmMeeting",
    "setCrmMeetingReminders",
  ]) {
    if (!detail.includes(name)) {
      fail(`meeting detail does not call ${name}`);
    }
  }

  const normalized = normalizeMeeting(
    {
      id: "m1",
      title: "Project kickoff",
      status: "IN_PROGRESS",
      type: "VIDEO",
      startAt: "2026-07-17T14:00:00.000Z",
    },
    0,
  );
  if (normalized.title !== "Project kickoff" || normalized.status !== "In Progress") {
    fail("normalizeMeeting did not map Swagger-shaped fields");
  }
}

export async function smokeMeetingsMock() {
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
              title: "Project kickoff",
              status: "SCHEDULED",
              type: "VIDEO",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmMeetings();
    await listUpcomingCrmMeetings();
    await getCrmMeeting(ID);
    await listRelatedCrmMeetings("LEAD", RELATED_ID);
    await createCrmMeeting({
      title: "New",
      type: "Video Call",
      status: "Scheduled",
      startDateTime: "2026-07-17T14:00",
      endDateTime: "2026-07-17T15:00",
      organizer: "Tejas",
    });
    await updateCrmMeeting(ID, { title: "Updated" });
    await startCrmMeeting(ID);
    await completeCrmMeeting(ID);
    await cancelCrmMeeting(ID);
    await rescheduleCrmMeeting(ID, "2026-07-18T10:00", "2026-07-18T11:00");
    await addCrmMeetingAttendee(ID, USER_ID);
    await removeCrmMeetingAttendee(ID, USER_ID);
    await replaceCrmMeetingAttendees(ID, [USER_ID]);
    await setCrmMeetingReminders(ID, [15]);
    await deleteCrmMeeting(ID);

    const expected = [
      `GET ${workspaceMeetingsPath(SESSION.workspaceId)}`,
      `GET ${workspaceMeetingsPath(SESSION.workspaceId, "/upcoming")}`,
      `GET ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}`)}`,
      `GET ${relatedMeetingsPath(SESSION.workspaceId, "LEAD", RELATED_ID)}`,
      `POST ${workspaceMeetingsPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}/start`)}`,
      `POST ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}/complete`)}`,
      `POST ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}/cancel`)}`,
      `POST ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}/reschedule`)}`,
      `POST ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}/attendees/${USER_ID}`)}`,
      `DELETE ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}/attendees/${USER_ID}`)}`,
      `PUT ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}/attendees`)}`,
      `POST ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}/reminders`)}`,
      `DELETE ${workspaceMeetingsPath(SESSION.workspaceId, `/${ID}`)}`,
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
      ...(method === "POST" || method === "PATCH" || method === "PUT"
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      method === "POST" || method === "PATCH" || method === "PUT" ? "{}" : undefined,
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

export async function smokeMeetingsLive() {
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

export async function runMeetingsSmoke() {
  installSmokePolyfill();
  console.log("Meetings API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeMeetingsWiring();
  console.log("   OK — client, catalog, list page, create, detail");

  console.log("\n2) Mock fetch…");
  await smokeMeetingsMock();
  console.log("   OK — workspace-scoped unique ops hit");

  console.log("\n3) Live CRM probe (decoy 404 vs meetings 401)…");
  const live = await smokeMeetingsLive();
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
  if (!live.ok) fail("live meetings probe failed");

  console.log("\nMeetings API smoke passed.");
}

runAsCli(runMeetingsSmoke);
