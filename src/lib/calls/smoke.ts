/**
 * Cross-check Calls CRM routes from live Swagger.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/calls/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  cancelCrmCall,
  completeCrmCall,
  createCrmCall,
  deleteCrmCall,
  dialCrmCall,
  getCrmCall,
  listCompletedCrmCalls,
  listCrmCallHistory,
  listCrmCalls,
  listMissedCrmCalls,
  listMyCrmCalls,
  listRelatedCrmCalls,
  listTodayCrmCalls,
  listUpcomingCrmCalls,
  logCrmCallOutcome,
  normalizeCrmCall,
  rescheduleCrmCall,
  startCrmCall,
  updateCrmCall,
  workspaceCallsPath,
} from "@/lib/calls/api";
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

const CALL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RELATED_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/calls" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/calls` },
  { method: "GET", path: "/v1/calls/today" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/calls/today` },
  { method: "GET", path: "/v1/calls/completed" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/calls/completed` },
  { method: "GET", path: "/v1/calls/missed" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/calls/missed` },
  { method: "GET", path: "/v1/calls/my" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/calls/my` },
  { method: "GET", path: "/v1/calls/upcoming" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/calls/upcoming` },
  { method: "GET", path: "/v1/calls/history" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/calls/history` },
  { method: "GET", path: `/v1/calls/${CALL_ID}` },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/calls/${CALL_ID}` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/LEAD/${RELATED_ID}/calls`,
  },
  { method: "POST", path: "/v1/calls" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/calls` },
  { method: "POST", path: `/v1/calls/${CALL_ID}/start` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/calls/${CALL_ID}/start`,
  },
  { method: "POST", path: `/v1/calls/${CALL_ID}/dial` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/calls/${CALL_ID}/dial`,
  },
  { method: "POST", path: `/v1/calls/${CALL_ID}/complete` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/calls/${CALL_ID}/complete`,
  },
  { method: "POST", path: `/v1/calls/${CALL_ID}/cancel` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/calls/${CALL_ID}/cancel`,
  },
  { method: "POST", path: `/v1/calls/${CALL_ID}/reschedule` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/calls/${CALL_ID}/reschedule`,
  },
  { method: "POST", path: `/v1/calls/${CALL_ID}/log-outcome` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/calls/${CALL_ID}/log-outcome`,
  },
  { method: "PATCH", path: `/v1/calls/${CALL_ID}` },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/calls/${CALL_ID}`,
  },
  { method: "DELETE", path: `/v1/calls/${CALL_ID}` },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/calls/${CALL_ID}`,
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

export function smokeCallsWiring() {
  const api = readSrc("src/lib/calls/api.ts");
  if (!api.includes("workspaceCallsPath")) {
    fail("calls client missing workspaceCallsPath");
  }
  for (const name of [
    "listCrmCalls",
    "listTodayCrmCalls",
    "listCompletedCrmCalls",
    "listMissedCrmCalls",
    "listMyCrmCalls",
    "listUpcomingCrmCalls",
    "listCrmCallHistory",
    "getCrmCall",
    "listRelatedCrmCalls",
    "createCrmCall",
    "updateCrmCall",
    "deleteCrmCall",
    "startCrmCall",
    "dialCrmCall",
    "completeCrmCall",
    "cancelCrmCall",
    "rescheduleCrmCall",
    "logCrmCallOutcome",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`calls client missing ${name}`);
    }
  }

  if (!api.includes("crmBffFetch")) {
    fail("calls client must call crmBffFetch in the browser");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"calls"')) {
    fail("BFF proxy does not allow calls");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  if (!catalog.includes('path: "/workspaces/:workspaceId/calls"')) {
    fail("endpoint catalog missing workspace calls");
  }
  if (!catalog.includes('path: "/calls/:id/start"')) {
    fail("endpoint catalog missing call start action");
  }
  if (!catalog.includes('path: "/calls/:id/dial"')) {
    fail("endpoint catalog missing call dial action");
  }
  if (!catalog.includes('path: "/calls/today"')) {
    fail("endpoint catalog missing calls/today");
  }

  const hook = readSrc("src/lib/calls/use-crm-calls.ts");
  if (!hook.includes("listTodayCrmCalls") || !hook.includes("listMyCrmCalls")) {
    fail("useCrmCalls does not load today/my call lists");
  }
  if (!hook.includes("replaceCrmCalls")) {
    fail("useCrmCalls does not replace the board from live CRM");
  }

  const page = readSrc("src/app/(dashboard)/activities/calls/page.tsx");
  if (!page.includes("useCrmCalls")) {
    fail("calls page does not call useCrmCalls");
  }

  const detail = readSrc(
    "src/app/(dashboard)/activities/calls/detail/[id]/page.tsx",
  );
  if (!detail.includes("getCrmCall")) {
    fail("call detail page does not call getCrmCall");
  }
  const header = readSrc(
    "src/components/activities/calls/detail/CallHeaderSection.tsx",
  );
  if (!header.includes("onStartCall") || !header.includes("onDialCall")) {
    fail("call header missing start/dial CRM actions");
  }

  const store = readSrc("src/lib/calls/store.ts");
  if (!store.includes("replaceCrmCalls")) {
    fail("calls store missing replaceCrmCalls");
  }

  const schedule = readSrc("src/components/activities/calls/ScheduleCallForm.tsx");
  if (!schedule.includes("loadAssignableOwners")) {
    fail("schedule call form does not load CRM owners");
  }

  const pad = readSrc("src/components/layout/SoftphonePad.tsx");
  if (!pad.includes("dialCrmCall")) {
    fail("softphone does not dial through CRM");
  }

  const item = normalizeCrmCall(
    {
      id: "call-1",
      subject: "Discovery",
      type: "OUTBOUND",
      status: "SCHEDULED",
      scheduledAt: "2026-08-25T10:00:00.000Z",
      ownerName: "Ada",
    },
    0,
  );
  if (!item || item.subject !== "Discovery" || item.callType !== "Outbound") {
    fail("normalizeCrmCall did not map Swagger-shaped fields");
  }
}

export async function smokeCallsMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;
  const payload = {
    statusCode: 200,
    data: {
      items: [
        {
          id: CALL_ID,
          subject: "Discovery",
          type: "OUTBOUND",
          status: "SCHEDULED",
          scheduledAt: "2026-08-25T10:00:00.000Z",
        },
      ],
    },
  };

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(url);
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await listCrmCalls();
    await listTodayCrmCalls();
    await listCompletedCrmCalls();
    await listMissedCrmCalls();
    await listMyCrmCalls();
    await listUpcomingCrmCalls();
    await listCrmCallHistory();
    await getCrmCall(CALL_ID);
    await listRelatedCrmCalls("LEAD", RELATED_ID);
    await createCrmCall({
      subject: "New call",
      callType: "Outbound",
      status: "Scheduled",
      date: "2026-08-25T10:00:00.000Z",
      assignedTo: "Ada",
    });
    await updateCrmCall(CALL_ID, { notes: "Updated" });
    await startCrmCall(CALL_ID);
    await dialCrmCall(CALL_ID);
    await completeCrmCall(CALL_ID);
    await cancelCrmCall(CALL_ID);
    await rescheduleCrmCall(CALL_ID, "2026-08-26T10:00:00.000Z");
    await logCrmCallOutcome(CALL_ID, { outcome: "NO_ANSWER" });
    await deleteCrmCall(CALL_ID);

    const expected = [
      `GET ${workspaceCallsPath(SESSION.workspaceId)}`,
      `GET ${workspaceCallsPath(SESSION.workspaceId, "/today")}`,
      `GET ${workspaceCallsPath(SESSION.workspaceId, "/completed")}`,
      `GET ${workspaceCallsPath(SESSION.workspaceId, "/missed")}`,
      `GET ${workspaceCallsPath(SESSION.workspaceId, "/my")}`,
      `GET ${workspaceCallsPath(SESSION.workspaceId, "/upcoming")}`,
      `GET ${workspaceCallsPath(SESSION.workspaceId, "/history")}`,
      `GET ${workspaceCallsPath(SESSION.workspaceId, `/${CALL_ID}`)}`,
      `GET /v1/workspaces/${SESSION.workspaceId}/LEAD/${RELATED_ID}/calls`,
      `POST ${workspaceCallsPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceCallsPath(SESSION.workspaceId, `/${CALL_ID}`)}`,
      `POST ${workspaceCallsPath(SESSION.workspaceId, `/${CALL_ID}/start`)}`,
      `POST ${workspaceCallsPath(SESSION.workspaceId, `/${CALL_ID}/dial`)}`,
      `POST ${workspaceCallsPath(SESSION.workspaceId, `/${CALL_ID}/complete`)}`,
      `POST ${workspaceCallsPath(SESSION.workspaceId, `/${CALL_ID}/cancel`)}`,
      `POST ${workspaceCallsPath(SESSION.workspaceId, `/${CALL_ID}/reschedule`)}`,
      `POST ${workspaceCallsPath(SESSION.workspaceId, `/${CALL_ID}/log-outcome`)}`,
      `DELETE ${workspaceCallsPath(SESSION.workspaceId, `/${CALL_ID}`)}`,
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

export async function smokeCallsLive(): Promise<{
  ok: boolean;
  rows: Array<{ method: string; path: string; status: number; note: string }>;
}> {
  const base = (getCrmApiBaseUrl() || "https://finconnex.payperless.app").replace(
    /\/$/,
    "",
  );
  const rows: Array<{ method: string; path: string; status: number; note: string }> =
    [];
  let ok = true;

  for (const route of LIVE_ROUTES) {
    try {
      const res = await fetch(`${base}${route.path}`, {
        method: route.method,
        headers: { Accept: "application/json" },
        body:
          route.method === "POST" || route.method === "PATCH"
            ? "{}"
            : undefined,
      });
      const routed = res.status !== 404 && res.status !== 405;
      if (!routed) ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: res.status,
        note:
          res.status === 401 || res.status === 403
            ? "route live, auth required"
            : routed
              ? `HTTP ${res.status}`
              : "missing route",
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

export async function runCallsSmoke() {
  installSmokePolyfill();
  console.log("Calls API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeCallsWiring();
  console.log("   OK — calls client, catalog, Calls page, call detail");

  console.log("\n2) Mock fetch (workspace routes)…");
  await smokeCallsMock();
  console.log("   OK — list/create/update/delete + lifecycle POSTs");

  console.log("\n3) Live CRM probe…");
  const live = await smokeCallsLive();
  for (const row of live.rows) {
    const mark =
      row.status !== 404 && row.status !== 405 && row.status !== 0
        ? "OK"
        : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (!live.ok) fail("one or more live call routes are missing");

  console.log("\nCalls API smoke passed.");
}

runAsCli(runCallsSmoke);
