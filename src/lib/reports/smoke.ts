/**
 * Cross-check Reports Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/reports/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  createCrmReport,
  deleteCrmReport,
  exportCrmReport,
  getCrmReport,
  listCrmReports,
  normalizeReport,
  reportsPath,
  runCrmReport,
  saveCrmReportAsTemplate,
  updateCrmReport,
} from "@/lib/reports/api";
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
const DECOY_PATH = "/v1/__no_such_module_reports_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/reports" },
  { method: "GET", path: `/v1/reports/${ID}` },
  { method: "POST", path: "/v1/reports" },
  { method: "PATCH", path: `/v1/reports/${ID}` },
  { method: "DELETE", path: `/v1/reports/${ID}` },
  { method: "POST", path: `/v1/reports/${ID}/run` },
  { method: "GET", path: `/v1/reports/${ID}/export` },
  { method: "POST", path: `/v1/reports/${ID}/template` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeReportsWiring() {
  const api = readSrc("src/lib/reports/api.ts");
  for (const name of [
    "listCrmReports",
    "getCrmReport",
    "createCrmReport",
    "updateCrmReport",
    "deleteCrmReport",
    "runCrmReport",
    "exportCrmReport",
    "saveCrmReportAsTemplate",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`reports client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/reports${suffix}`")) {
    fail("reports client missing /v1/reports path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/reports"',
    'path: "/reports/:id"',
    'path: "/reports/:id/run"',
    'path: "/reports/:id/export"',
    'path: "/reports/:id/template"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/reports/page.tsx");
  if (!page.includes("useCrmReports")) {
    fail("reports page does not call useCrmReports");
  }

  const hook = readSrc("src/lib/reports/use-crm-reports.ts");
  if (!hook.includes("replaceCrmReports")) {
    fail("reports hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("reports hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc("src/components/reports/CreateReportForm.tsx");
  if (!create.includes("createCrmReport")) {
    fail("create report form does not call createCrmReport");
  }

  const detail = readSrc("src/components/reports/ReportDetailClient.tsx");
  for (const name of [
    "runCrmReport",
    "exportCrmReport",
    "saveCrmReportAsTemplate",
    "deleteCrmReport",
    "updateCrmReport",
  ]) {
    if (!detail.includes(name)) {
      fail(`report detail does not call ${name}`);
    }
  }

  const normalized = normalizeReport(
    {
      id: ID,
      name: "Monthly lead funnel",
      status: "READY",
      type: "LEAD",
      dataSource: "Leads",
    },
    0,
  );
  if (normalized.name !== "Monthly lead funnel" || normalized.status !== "Ready") {
    fail("normalizeReport did not map Swagger-shaped fields");
  }
  if (normalized.type !== "Lead") {
    fail("normalizeReport did not map type LEAD");
  }
}

export async function smokeReportsMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(String(input));
    hits.push(`${method} ${parsed.pathname}`);
    if (parsed.pathname.endsWith("/export")) {
      return new Response(new Blob(["id,name\n1,funnel"], { type: "text/csv" }), {
        status: 200,
      });
    }
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          items: [
            {
              id: ID,
              name: "Monthly lead funnel",
              status: "DRAFT",
              type: "LEAD",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmReports();
    await getCrmReport(ID);
    await createCrmReport({ name: "New" });
    await updateCrmReport(ID, { name: "Updated" });
    await runCrmReport(ID);
    await exportCrmReport(ID);
    await saveCrmReportAsTemplate(ID);
    await deleteCrmReport(ID);

    const expected = [
      `GET ${reportsPath()}`,
      `GET ${reportsPath(`/${ID}`)}`,
      `POST ${reportsPath()}`,
      `PATCH ${reportsPath(`/${ID}`)}`,
      `POST ${reportsPath(`/${ID}/run`)}`,
      `GET ${reportsPath(`/${ID}/export`)}`,
      `POST ${reportsPath(`/${ID}/template`)}`,
      `DELETE ${reportsPath(`/${ID}`)}`,
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

export async function smokeReportsLive() {
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

export async function runReportsSmoke() {
  installSmokePolyfill();
  console.log("Reports API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeReportsWiring();
  console.log("   OK — client, catalog, list page, create, detail");

  console.log("\n2) Mock fetch…");
  await smokeReportsMock();
  console.log("   OK — all 8 Swagger routes hit");

  console.log("\n3) Live CRM probe (decoy 404 vs reports 401)…");
  const live = await smokeReportsLive();
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
  if (!live.ok) fail("live reports probe failed");

  console.log("\nReports API smoke passed.");
}

runAsCli(runReportsSmoke);
