/**
 * Cross-check table-preferences Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/table-preferences/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  applyTablePreferenceToColumns,
  deleteCrmTablePreference,
  getCrmTablePreference,
  normalizeCrmTablePreference,
  putCrmTablePreference,
  tablePreferenceFromColumns,
  workspaceTablePreferencePath,
} from "@/lib/table-preferences/api";
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

const TABLE_KEY = "leads";
const DECOY_PATH = "/v1/__no_such_module_table_preferences_probe__";
const LIVE_PATH = `/v1/workspaces/${SESSION.workspaceId}/preferences/tables/${TABLE_KEY}`;

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: LIVE_PATH },
  { method: "PUT", path: LIVE_PATH },
  { method: "DELETE", path: LIVE_PATH },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeTablePreferencesWiring() {
  const api = readSrc("src/lib/table-preferences/api.ts");
  for (const name of [
    "workspaceTablePreferencePath",
    "getCrmTablePreference",
    "putCrmTablePreference",
    "deleteCrmTablePreference",
  ]) {
    if (!api.includes(`export function ${name}`) && !api.includes(`export async function ${name}`)) {
      fail(`table-preferences client missing ${name}`);
    }
  }
  if (!api.includes("/v1/workspaces/${workspaceId}/preferences/tables/")) {
    fail("table-preferences client missing workspace path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/workspaces/:workspaceId/preferences/tables/:tableKey"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }
  for (const method of ["GET", "PUT", "DELETE"]) {
    if (!catalog.includes(`method: "${method}"`)) {
      fail(`endpoint catalog missing ${method}`);
    }
  }

  const surfaces: Array<[string, string]> = [
    ["src/app/(dashboard)/sales/leads/page.tsx", "getCrmTablePreference"],
    ["src/components/sales/contacts/ContactsListView.tsx", "persistCrmTablePreference"],
    ["src/components/sales/companies/CompaniesListView.tsx", "persistCrmTablePreference"],
    ["src/components/sales/deals/DealsListView.tsx", "persistCrmTablePreference"],
    ["src/components/activities/tasks/TaskListView.tsx", "persistCrmTablePreference"],
    ["src/components/work-queue/WorkQueueTable.tsx", "persistCrmTablePreference"],
  ];
  for (const [file, token] of surfaces) {
    if (!readSrc(file).includes(token)) {
      fail(`${file} does not call ${token}`);
    }
  }

  const hook = readSrc("src/lib/table-preferences/use-crm-table-preference.ts");
  if (!hook.includes("getCrmTablePreference")) {
    fail("table preference hook does not load live CRM prefs");
  }

  const normalized = normalizeCrmTablePreference(
    {
      tableKey: "leads",
      visibleColumns: ["name", "email"],
      columnOrder: ["email", "name", "phone"],
      sort: { field: "name", direction: "asc" },
      pageSize: 25,
      columns: [
        { key: "name", visible: true, pinned: true },
        { key: "email", visible: true },
        { key: "phone", visible: false },
      ],
    },
    "leads",
  );
  if (
    normalized.tableKey !== "leads" ||
    !normalized.visibleColumnIds.includes("name") ||
    normalized.sortBy !== "name" ||
    normalized.sortDirection !== "asc" ||
    normalized.pageSize !== 25
  ) {
    fail("normalizeCrmTablePreference did not map Swagger-shaped fields");
  }

  const applied = applyTablePreferenceToColumns(
    [
      { id: "name", label: "Name", checked: true, required: true },
      { id: "email", label: "Email", checked: true },
      { id: "phone", label: "Phone", checked: true },
    ],
    normalized,
  );
  if (applied.find((c) => c.id === "phone")?.checked) {
    fail("applyTablePreferenceToColumns did not hide phone");
  }
  const body = tablePreferenceFromColumns("leads", applied);
  if (!body.visibleColumnIds.includes("name") || body.columnOrder[0] !== "email") {
    fail("tablePreferenceFromColumns lost column order");
  }
}

export async function smokeTablePreferencesMock() {
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
          tableKey: TABLE_KEY,
          visibleColumnIds: ["name"],
          columnOrder: ["name"],
          pageSize: 10,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await getCrmTablePreference(TABLE_KEY);
    await putCrmTablePreference(
      TABLE_KEY,
      tablePreferenceFromColumns(TABLE_KEY, [
        { id: "name", label: "Name", checked: true },
      ]),
    );
    await deleteCrmTablePreference(TABLE_KEY);

    const expectedPath = workspaceTablePreferencePath(SESSION.workspaceId, TABLE_KEY);
    for (const hit of [
      `GET ${expectedPath}`,
      `PUT ${expectedPath}`,
      `DELETE ${expectedPath}`,
    ]) {
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

export async function smokeTablePreferencesLive() {
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

export async function runTablePreferencesSmoke() {
  installSmokePolyfill();
  console.log("Table preferences API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeTablePreferencesWiring();
  console.log("   OK — client, catalog, leads, contacts, companies, deals, tasks, work-queue");

  console.log("\n2) Mock fetch…");
  await smokeTablePreferencesMock();
  console.log("   OK — GET/PUT/DELETE /v1/workspaces/:id/preferences/tables/:tableKey");

  console.log("\n3) Live CRM probe…");
  const live = await smokeTablePreferencesLive();
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
  if (!live.ok) fail("live table-preferences probe failed");

  console.log("\nTable preferences API smoke passed.");
}

runAsCli(runTablePreferencesSmoke);
