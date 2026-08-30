/**
 * Cross-check Work Queue CRM route from live Swagger.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/work-queue/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  hrefFromWorkQueueDeepLink,
  listCrmWorkQueue,
  listCrmWorkQueueForNav,
  navToWorkQueueTypes,
  normalizeCrmWorkQueueItem,
  workspaceWorkQueuePath,
} from "@/lib/work-queue/api";
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

const SOURCE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const DECOY_PATH = "/v1/__no_such_module_work_queue_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/work-queue`,
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

export function smokeWorkQueueWiring() {
  const api = readSrc("src/lib/work-queue/api.ts");
  if (!api.includes("`/v1/workspaces/${workspaceId}/work-queue${query}`")) {
    fail("work-queue client missing workspace path");
  }
  if (!api.includes("export async function listCrmWorkQueue")) {
    fail("work-queue client missing listCrmWorkQueue");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  if (!catalog.includes('path: "/workspaces/:workspaceId/work-queue"')) {
    fail("endpoint catalog missing work-queue");
  }

  const view = readSrc("src/components/work-queue/WorkQueueView.tsx");
  if (!view.includes("useCrmWorkQueue")) {
    fail("WorkQueueView does not call useCrmWorkQueue");
  }

  const hook = readSrc("src/lib/work-queue/use-crm-work-queue.ts");
  if (!hook.includes('setSource("api")')) {
    fail("work-queue hook must mark a successful empty list as Live CRM");
  }

  if (!navToWorkQueueTypes("tasks")?.includes("TASK")) {
    fail("navToWorkQueueTypes did not map tasks");
  }

  const row = normalizeCrmWorkQueueItem({
    id: `TASK:${SOURCE_ID}`,
    type: "TASK",
    sourceId: SOURCE_ID,
    title: "Follow up Acme",
    status: "IN_PROGRESS",
    urgency: "OVERDUE",
    priority: "HIGH",
    dueAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    assigneeId: SESSION.workspaceId,
    deepLink: { resource: "tasks", id: SOURCE_ID },
  });
  if (row.subject !== "Follow up Acme" || row.status !== "In Progress") {
    fail("normalizeCrmWorkQueueItem did not map Swagger-shaped fields");
  }
  if (!hrefFromWorkQueueDeepLink("tasks", SOURCE_ID).includes(SOURCE_ID)) {
    fail("deep link href missing source id");
  }
}

export async function smokeWorkQueueMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(url);
    hits.push(`${method} ${parsed.pathname}`);

    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: [
          [
            {
              id: `TASK:${SOURCE_ID}`,
              type: "TASK",
              sourceId: SOURCE_ID,
              title: "Follow up Acme",
              status: "IN_PROGRESS",
              urgency: "DUE_NOW",
              priority: "HIGH",
              dueAt: "2026-08-26T00:00:00.000Z",
              createdAt: "2026-08-25T00:00:00.000Z",
              assigneeId: SESSION.workspaceId,
              deepLink: { resource: "tasks", id: SOURCE_ID },
            },
          ],
          1,
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const page = await listCrmWorkQueue({ limit: 50 });
    if (!page.items.length || page.total !== 1) {
      fail("listCrmWorkQueue did not unwrap paginated tuple");
    }
    await listCrmWorkQueueForNav("tasks", { timeFilter: "today-overdue" });

    const expected = `GET ${workspaceWorkQueuePath(SESSION.workspaceId)}`;
    if (!hits.includes(expected)) {
      fail(`mock fetch missed ${expected} (got ${hits.join(", ")})`);
    }
  } finally {
    bindCrmSession(null);
    globalThis.fetch = origFetch;
  }
}

export async function smokeWorkQueueLive(): Promise<{
  ok: boolean;
  rows: Array<{ method: string; path: string; status: number; note: string }>;
}> {
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

  const decoy = await fetch(`${base}${DECOY_PATH}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  rows.push({
    method: "GET",
    path: DECOY_PATH,
    status: decoy.status,
    note:
      decoy.status === 404
        ? "control 404"
        : `expected 404, got ${decoy.status}`,
  });
  if (decoy.status !== 404) ok = false;

  for (const route of LIVE_ROUTES) {
    try {
      const res = await fetch(`${base}${route.path}`, {
        method: route.method,
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let message = text.slice(0, 180);
      try {
        const json = JSON.parse(text) as { message?: unknown };
        if (typeof json.message === "string") message = json.message;
      } catch {
        /* keep */
      }
      const msg = message.toLowerCase();
      const routed =
        (res.status === 401 || res.status === 403) &&
        (msg.includes("token") ||
          msg.includes("unauthorized") ||
          msg.includes("forbidden") ||
          msg.includes("jwt"));
      if (!routed) ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: res.status,
        note: routed
          ? `routed + auth required: ${message}`
          : `unexpected ${res.status}: ${message}`,
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

export async function runWorkQueueSmoke() {
  installSmokePolyfill();
  console.log("Work Queue API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeWorkQueueWiring();
  console.log("   OK — work-queue client, catalog, WorkQueueView");

  console.log("\n2) Mock fetch…");
  await smokeWorkQueueMock();
  console.log("   OK — GET workspace work-queue");

  console.log("\n3) Live CRM probe…");
  const live = await smokeWorkQueueLive();
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
  if (!live.ok) fail("live work-queue route is missing");

  console.log("\nWork Queue API smoke passed.");
}

runAsCli(runWorkQueueSmoke);
