/**
 * Cross-check Tasks Swagger routes (global + workspace twins).
 * Run: npx tsx --tsconfig tsconfig.json src/lib/tasks/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  addCrmTaskAssignee,
  addCrmTaskAttachment,
  addCrmTaskCollaborator,
  addCrmTaskTag,
  bulkCrmTasks,
  bulkDeleteCrmTasks,
  bulkRestoreCrmTasks,
  cancelCrmTask,
  completeCrmTask,
  createCrmTask,
  deleteCrmTask,
  duplicateCrmTask,
  getCrmTask,
  listCrmTaskCollaborators,
  listCrmTasks,
  listCrmTasksToday,
  listMyCrmTasks,
  listOverdueCrmTasks,
  listUpcomingCrmTasks,
  normalizeTask,
  removeCrmTaskAssignee,
  removeCrmTaskAttachment,
  removeCrmTaskCollaborator,
  removeCrmTaskTag,
  reopenCrmTask,
  replaceCrmTaskAssignees,
  replaceCrmTaskCollaborators,
  replaceCrmTaskFollowers,
  restoreCrmTask,
  updateCrmTask,
  workspaceTasksPath,
} from "@/lib/tasks/api";
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
const TAG_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ATT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const DECOY_PATH = "/v1/__no_such_module_tasks_probe__";

function twin(suffix: string) {
  return [
    { method: "GET", path: `/v1/tasks${suffix}` },
    {
      method: "GET",
      path: `/v1/workspaces/${SESSION.workspaceId}/tasks${suffix}`,
    },
  ];
}

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  ...twin(""),
  ...twin("/today"),
  ...twin("/upcoming"),
  ...twin("/overdue"),
  ...twin("/my"),
  { method: "GET", path: `/v1/tasks/${ID}` },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/tasks/${ID}` },
  { method: "GET", path: `/v1/tasks/${ID}/collaborators` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/tasks/${ID}/collaborators`,
  },
  { method: "POST", path: "/v1/tasks" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/tasks` },
  { method: "PATCH", path: `/v1/tasks/${ID}` },
  { method: "PATCH", path: `/v1/workspaces/${SESSION.workspaceId}/tasks/${ID}` },
  { method: "DELETE", path: `/v1/tasks/${ID}` },
  { method: "DELETE", path: `/v1/workspaces/${SESSION.workspaceId}/tasks/${ID}` },
  { method: "POST", path: "/v1/tasks/bulk" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/tasks/bulk` },
  { method: "POST", path: "/v1/tasks/bulk-delete" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/tasks/bulk-delete` },
  { method: "POST", path: "/v1/tasks/bulk-restore" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/tasks/bulk-restore` },
  { method: "POST", path: `/v1/tasks/${ID}/complete` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/tasks/${ID}/complete`,
  },
  { method: "POST", path: `/v1/tasks/${ID}/reopen` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/tasks/${ID}/reopen`,
  },
  { method: "POST", path: `/v1/tasks/${ID}/cancel` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/tasks/${ID}/cancel`,
  },
  { method: "POST", path: `/v1/tasks/${ID}/duplicate` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/tasks/${ID}/duplicate`,
  },
  { method: "POST", path: `/v1/tasks/${ID}/restore` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/tasks/${ID}/restore`,
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

export function smokeTasksWiring() {
  const api = readSrc("src/lib/tasks/api.ts");
  for (const name of [
    "listCrmTasks",
    "listCrmTasksToday",
    "listUpcomingCrmTasks",
    "listOverdueCrmTasks",
    "listMyCrmTasks",
    "getCrmTask",
    "listCrmTaskCollaborators",
    "createCrmTask",
    "updateCrmTask",
    "deleteCrmTask",
    "completeCrmTask",
    "reopenCrmTask",
    "cancelCrmTask",
    "restoreCrmTask",
    "duplicateCrmTask",
    "bulkCrmTasks",
    "bulkDeleteCrmTasks",
    "bulkRestoreCrmTasks",
    "addCrmTaskAssignee",
    "replaceCrmTaskAssignees",
    "addCrmTaskCollaborator",
    "replaceCrmTaskCollaborators",
    "replaceCrmTaskFollowers",
    "addCrmTaskTag",
    "addCrmTaskAttachment",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`tasks client missing ${name}`);
    }
  }
  if (!api.includes("workspaceTasksPath")) {
    fail("tasks client missing workspaceTasksPath");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/tasks"',
    'path: "/tasks/today"',
    'path: "/tasks/upcoming"',
    'path: "/tasks/overdue"',
    'path: "/tasks/my"',
    'path: "/tasks/:id"',
    'path: "/tasks/:id/collaborators"',
    'path: "/tasks/bulk"',
    'path: "/tasks/bulk-delete"',
    'path: "/tasks/bulk-restore"',
    'path: "/tasks/:id/complete"',
    'path: "/tasks/:id/reopen"',
    'path: "/tasks/:id/cancel"',
    'path: "/tasks/:id/duplicate"',
    'path: "/tasks/:id/restore"',
    'path: "/tasks/:id/assignees/:userId"',
    'path: "/tasks/:id/collaborators/:userId"',
    'path: "/tasks/:id/followers"',
    'path: "/tasks/:id/tags"',
    'path: "/tasks/:id/attachments"',
    'path: "/workspaces/:workspaceId/tasks"',
    'path: "/workspaces/:workspaceId/tasks/today"',
    'path: "/workspaces/:workspaceId/tasks/:id/complete"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/activities/tasks/page.tsx");
  if (!page.includes("useCrmTasks")) {
    fail("tasks page does not call useCrmTasks");
  }
  if (!page.includes("bulkCrmTasks") && !page.includes("bulkDeleteCrmTasks")) {
    fail("tasks page does not call bulk CRM helpers");
  }

  const hook = readSrc("src/lib/tasks/use-crm-tasks.ts");
  if (!hook.includes("replaceCrmTasks")) {
    fail("tasks hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("tasks hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc("src/components/activities/tasks/CreateTaskForm.tsx");
  if (!create.includes("createCrmTask")) {
    fail("create task form does not call createCrmTask");
  }

  const detail = readSrc(
    "src/app/(dashboard)/activities/tasks/detail/[id]/page.tsx",
  );
  for (const name of [
    "getCrmTask",
    "completeCrmTask",
    "cancelCrmTask",
    "reopenCrmTask",
    "updateCrmTask",
  ]) {
    if (!detail.includes(name)) {
      fail(`task detail does not call ${name}`);
    }
  }

  const store = readSrc("src/lib/tasks/store.ts");
  if (!store.includes("export function replaceCrmTasks")) {
    fail("tasks store missing replaceCrmTasks");
  }

  const normalized = normalizeTask(
    {
      id: ID,
      title: "Call the broker",
      status: "IN_PROGRESS",
      type: "CALL",
      priority: "HIGH",
      dueAt: "2026-08-30T09:00:00.000Z",
      assignedTo: "Tejas Gokhe",
    },
    0,
  );
  if (
    normalized.title !== "Call the broker" ||
    normalized.status !== "In Progress" ||
    normalized.taskType !== "Call" ||
    normalized.priority !== "High"
  ) {
    fail("normalizeTask did not map Swagger-shaped fields");
  }
}

export async function smokeTasksMock() {
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
              title: "Call the broker",
              status: "NOT_STARTED",
              type: "CALL",
              priority: "HIGH",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmTasks();
    await listCrmTasksToday();
    await listUpcomingCrmTasks();
    await listOverdueCrmTasks();
    await listMyCrmTasks();
    await getCrmTask(ID);
    await listCrmTaskCollaborators(ID);
    await createCrmTask({
      title: "New",
      taskType: "Call",
      priority: "High",
      status: "Not Started",
      dueDate: "30/08/2026",
      assignedTo: "Tejas",
    });
    await updateCrmTask(ID, { title: "Updated" });
    await completeCrmTask(ID);
    await reopenCrmTask(ID);
    await cancelCrmTask(ID);
    await restoreCrmTask(ID);
    await duplicateCrmTask(ID);
    await bulkCrmTasks([ID], "complete");
    await bulkDeleteCrmTasks([ID]);
    await bulkRestoreCrmTasks([ID]);
    await addCrmTaskAssignee(ID, USER_ID);
    await removeCrmTaskAssignee(ID, USER_ID);
    await replaceCrmTaskAssignees(ID, [USER_ID]);
    await addCrmTaskCollaborator(ID, USER_ID);
    await removeCrmTaskCollaborator(ID, USER_ID);
    await replaceCrmTaskCollaborators(ID, [USER_ID]);
    await replaceCrmTaskFollowers(ID, [USER_ID]);
    await addCrmTaskTag(ID, { name: "urgent" });
    await removeCrmTaskTag(ID, TAG_ID);
    await addCrmTaskAttachment(ID, { key: "obj-1", fileName: "brief.pdf" });
    await removeCrmTaskAttachment(ID, ATT_ID);
    await deleteCrmTask(ID);

    const ws = (suffix: string) => workspaceTasksPath(SESSION.workspaceId, suffix);
    const expected = [
      `GET ${ws("")}`,
      `GET ${ws("/today")}`,
      `GET ${ws("/upcoming")}`,
      `GET ${ws("/overdue")}`,
      `GET ${ws("/my")}`,
      `GET ${ws(`/${ID}`)}`,
      `GET ${ws(`/${ID}/collaborators`)}`,
      `POST ${ws("")}`,
      `PATCH ${ws(`/${ID}`)}`,
      `POST ${ws(`/${ID}/complete`)}`,
      `POST ${ws(`/${ID}/reopen`)}`,
      `POST ${ws(`/${ID}/cancel`)}`,
      `POST ${ws(`/${ID}/restore`)}`,
      `POST ${ws(`/${ID}/duplicate`)}`,
      `POST ${ws("/bulk")}`,
      `POST ${ws("/bulk-delete")}`,
      `POST ${ws("/bulk-restore")}`,
      `POST ${ws(`/${ID}/assignees/${USER_ID}`)}`,
      `DELETE ${ws(`/${ID}/assignees/${USER_ID}`)}`,
      `PUT ${ws(`/${ID}/assignees`)}`,
      `POST ${ws(`/${ID}/collaborators/${USER_ID}`)}`,
      `DELETE ${ws(`/${ID}/collaborators/${USER_ID}`)}`,
      `PUT ${ws(`/${ID}/collaborators`)}`,
      `PUT ${ws(`/${ID}/followers`)}`,
      `POST ${ws(`/${ID}/tags`)}`,
      `DELETE ${ws(`/${ID}/tags/${TAG_ID}`)}`,
      `POST ${ws(`/${ID}/attachments`)}`,
      `DELETE ${ws(`/${ID}/attachments/${ATT_ID}`)}`,
      `DELETE ${ws(`/${ID}`)}`,
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
      method === "POST" || method === "PATCH" || method === "PUT"
        ? "{}"
        : undefined,
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

export async function smokeTasksLive() {
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

export async function runTasksSmoke() {
  installSmokePolyfill();
  console.log("Tasks API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeTasksWiring();
  console.log("   OK — client, catalog, list, create, detail");

  console.log("\n2) Mock fetch…");
  await smokeTasksMock();
  console.log("   OK — workspace-scoped task routes hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokeTasksLive();
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
  if (!live.ok) fail("live tasks probe failed");

  console.log("\nTasks API smoke passed.");
}

runAsCli(runTasksSmoke);
