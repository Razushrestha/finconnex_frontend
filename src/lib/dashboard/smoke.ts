/**
 * Cross-check CRM Dashboard Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/dashboard/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  batchCrmDashboardWidgets,
  createCrmDashboardLayout,
  dashboardMetricsPath,
  deleteCrmDashboardLayout,
  duplicateCrmDashboardLayout,
  getCrmDashboardLayout,
  getCrmDashboardMetrics,
  getCrmDashboardWidget,
  getCrmDashboardWidgetData,
  listCrmDashboardLayouts,
  listCrmDashboardWidgetCatalog,
  mapCrmDashboardLayout,
  setDefaultCrmDashboardLayout,
  updateCrmDashboardLayout,
  workspaceDashboardLayoutsPath,
  workspaceDashboardWidgetsPath,
} from "@/lib/dashboard/api";
import { applyMetricsToStats } from "@/lib/dashboard/overlay";
import {
  computeDashboardStats,
  defaultDashboardFilters,
  defaultDashboardLayout,
} from "@/lib/dashboard/layout";
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

const LAYOUT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DECOY_PATH = "/v1/__no_such_module_dashboard_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/dashboard" },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/layouts`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/layouts/${LAYOUT_ID}`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/layouts`,
  },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/layouts/${LAYOUT_ID}`,
  },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/layouts/${LAYOUT_ID}`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/layouts/${LAYOUT_ID}/duplicate`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/layouts/${LAYOUT_ID}/set-default`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/widgets/catalog`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/widgets/kpis`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/widgets/kpis/data`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/dashboard/widgets/batch`,
  },
];

function readSrc(rel: string) {
  const full = path.join(process.cwd(), rel);
  if (!existsSync(full)) fail(`missing ${rel}`);
  return readFileSync(full, "utf8");
}

export function smokeDashboardWiring() {
  const api = readSrc("src/lib/dashboard/api.ts");
  for (const name of [
    "getCrmDashboardMetrics",
    "listCrmDashboardLayouts",
    "getCrmDashboardLayout",
    "createCrmDashboardLayout",
    "updateCrmDashboardLayout",
    "deleteCrmDashboardLayout",
    "duplicateCrmDashboardLayout",
    "setDefaultCrmDashboardLayout",
    "listCrmDashboardWidgetCatalog",
    "getCrmDashboardWidget",
    "getCrmDashboardWidgetData",
    "batchCrmDashboardWidgets",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`dashboard client missing ${name}`);
    }
  }
  if (!api.includes("crmBffFetch")) {
    fail("dashboard client must call crmBffFetch in the browser");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"dashboard"') || !bff.includes('path.includes("dashboard")')) {
    fail("BFF proxy does not allow dashboard");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/dashboard"',
    'path: "/workspaces/:workspaceId/dashboard/layouts"',
    'path: "/workspaces/:workspaceId/dashboard/widgets/catalog"',
    'path: "/workspaces/:workspaceId/dashboard/widgets/batch"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const ui = readSrc("src/components/dashboard/DashboardWorkspace.tsx");
  for (const name of [
    "useCrmDashboardStats",
    "listCrmDashboardLayouts",
    "upsertCrmDashboardLayout",
    "setDefaultCrmDashboardLayout",
    "Live CRM",
  ]) {
    if (!ui.includes(name)) {
      fail(`dashboard workspace does not use ${name}`);
    }
  }

  const mapped = mapCrmDashboardLayout({
    id: LAYOUT_ID,
    name: "Executive",
    isDefault: true,
    widgets: [
      { key: "kpis", hidden: false, order: 0 },
      { key: "pipeline", hidden: true, order: 1 },
    ],
    config: { filters: { dateRange: "30d", owner: "All" } },
  });
  if (!mapped || mapped.layout.order[0] !== "kpis") {
    fail("mapCrmDashboardLayout did not map widget order");
  }
  if (!mapped.layout.hidden.includes("pipeline")) {
    fail("mapCrmDashboardLayout did not map hidden widgets");
  }

  const stats = applyMetricsToStats(computeDashboardStats(defaultDashboardFilters()), {
    totalLeads: 0,
    pipelineValue: 0,
    conversionRate: 0,
  });
  if (stats.totalLeads !== 0 || stats.pipelineValue !== 0) {
    fail("empty CRM metrics must not keep demo KPI totals");
  }
}

export async function smokeDashboardMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;
  const layout = defaultDashboardLayout();

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(String(input));
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          id: LAYOUT_ID,
          name: "Executive",
          isDefault: true,
          totalLeads: 12,
          newLeads: 4,
          pipelineValue: 250000,
          widgets: [{ key: "kpis", hidden: false }],
          items: [{ key: "kpis", label: "KPIs" }],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await getCrmDashboardMetrics();
    await listCrmDashboardLayouts();
    await getCrmDashboardLayout(LAYOUT_ID);
    await createCrmDashboardLayout(layout);
    await updateCrmDashboardLayout(LAYOUT_ID, layout);
    await duplicateCrmDashboardLayout(LAYOUT_ID);
    await setDefaultCrmDashboardLayout(LAYOUT_ID);
    await listCrmDashboardWidgetCatalog();
    await getCrmDashboardWidget("kpis");
    await getCrmDashboardWidgetData("kpis");
    await batchCrmDashboardWidgets(["kpis"]);
    await deleteCrmDashboardLayout(LAYOUT_ID);

    const expected = [
      `GET ${dashboardMetricsPath()}`,
      `GET ${workspaceDashboardLayoutsPath(SESSION.workspaceId)}`,
      `GET ${workspaceDashboardLayoutsPath(SESSION.workspaceId, `/${LAYOUT_ID}`)}`,
      `POST ${workspaceDashboardLayoutsPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceDashboardLayoutsPath(SESSION.workspaceId, `/${LAYOUT_ID}`)}`,
      `POST ${workspaceDashboardLayoutsPath(SESSION.workspaceId, `/${LAYOUT_ID}/duplicate`)}`,
      `POST ${workspaceDashboardLayoutsPath(SESSION.workspaceId, `/${LAYOUT_ID}/set-default`)}`,
      `GET ${workspaceDashboardWidgetsPath(SESSION.workspaceId, "/catalog")}`,
      `GET ${workspaceDashboardWidgetsPath(SESSION.workspaceId, "/kpis")}`,
      `GET ${workspaceDashboardWidgetsPath(SESSION.workspaceId, "/kpis/data")}`,
      `POST ${workspaceDashboardWidgetsPath(SESSION.workspaceId, "/batch")}`,
      `DELETE ${workspaceDashboardLayoutsPath(SESSION.workspaceId, `/${LAYOUT_ID}`)}`,
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

export async function smokeDashboardLive() {
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
      const auth = isAuthRequired(hit.status, hit.message);
      rows.push({
        method: route.method,
        path: route.path,
        status: hit.status,
        note: auth ? "auth required" : hit.message,
      });
      if (!auth && hit.status !== 400 && hit.status !== 404 && hit.status !== 405) {
        if (hit.status >= 500) ok = false;
      }
    } catch (err) {
      ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: 0,
        note: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.table(rows);
  if (!ok) fail("dashboard live probe failed");
}

export async function smokeDashboard() {
  installSmokePolyfill();
  smokeDashboardWiring();
  await smokeDashboardMock();
}

runAsCli(async () => {
  await smokeDashboard();
  if (process.argv.includes("--live")) await smokeDashboardLive();
});
