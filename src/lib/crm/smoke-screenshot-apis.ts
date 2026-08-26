/**
 * Cross-check the Swagger screenshot APIs:
 *   GET    /v1/workspaces/{workspaceId}/activity-timeline
 *   GET    /v1/workspaces/{workspaceId}/{relatedType}/{relatedId}/activity-timeline
 *   GET    /v1/admin/workspaces
 *   DELETE /v1/admin/user/{id}
 *   GET    /v1/analytics
 *
 * Run: npx tsx --tsconfig tsconfig.json src/lib/crm/smoke-screenshot-apis.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  bindCrmSession,
  fetchParentActivityTimeline,
  fetchWorkspaceActivityTimeline,
  getCrmApiBaseUrl,
} from "@/lib/activity-timeline";
import { deleteAdminUser, listAdminWorkspaces } from "@/lib/admin/api";
import {
  ANALYTICS_WIDGETS,
  fetchAnalyticsWidgets,
  overlayAnalyticsSnapshot,
} from "@/lib/analytics/crm";
import { getAnalyticsSnapshot } from "@/lib/analytics/types";
import { SCREENSHOT_ENDPOINTS } from "@/lib/api/endpoints";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;

const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RELATED_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const SESSION = {
  baseUrl: "https://crm.smoke.test",
  accessToken: "smoke-access",
  workspaceId: WORKSPACE_ID,
};

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeScreenshotWiring() {
  if (SCREENSHOT_ENDPOINTS.length !== 5) {
    fail(`expected 5 screenshot endpoints, got ${SCREENSHOT_ENDPOINTS.length}`);
  }

  const timeline = readSrc("src/lib/activity-timeline/client.ts");
  if (!timeline.includes("/activity-timeline")) {
    fail("activity-timeline client missing /activity-timeline");
  }

  const analytics = readSrc("src/lib/analytics/crm.ts");
  if (!analytics.includes("/v1/analytics")) {
    fail("analytics client missing /v1/analytics");
  }
  if (ANALYTICS_WIDGETS.length !== 15) {
    fail(`expected 15 analytics widgets, got ${ANALYTICS_WIDGETS.length}`);
  }

  const admin = readSrc("src/lib/admin/api.ts");
  if (!admin.includes("/v1/admin/workspaces")) {
    fail("admin client missing GET /v1/admin/workspaces");
  }
  if (!admin.includes("/v1/admin/user/")) {
    fail("admin client missing DELETE /v1/admin/user/:id");
  }

  const feed = readSrc("src/components/dashboard/WorkspaceActivityFeed.tsx");
  if (!feed.includes("useWorkspaceActivityTimeline")) {
    fail("dashboard feed is not using useWorkspaceActivityTimeline");
  }

  const settingsPage = readSrc(
    "src/app/(dashboard)/settings/[category]/[subpage]/page.tsx",
  );
  if (!settingsPage.includes("users-and-access/workspaces")) {
    fail("settings page does not mount WorkspacesSettingsClient");
  }
  if (!settingsPage.includes("users-and-access/users")) {
    fail("settings page does not mount UsersSettingsClient");
  }

  const mock = getAnalyticsSnapshot({
    period: "30d",
    team: "All",
    owner: "All",
  });
  const widgets = new Map();
  widgets.set("LEAD_CONVERSION_RATE", {
    widget: "LEAD_CONVERSION_RATE",
    period: { startDate: "2026-01-01", endDate: "2026-01-31", value: 41 },
  });
  const overlaid = overlayAnalyticsSnapshot(mock, widgets);
  const kpi = overlaid.kpis.find((row) => row.id === "leadConv");
  if (!kpi || kpi.numericValue !== 41) {
    fail("overlayAnalyticsSnapshot did not apply LEAD_CONVERSION_RATE");
  }
}

export async function smokeScreenshotMock() {
  const hits: Array<{ method: string; path: string }> = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(url);
    hits.push({ method, path: parsed.pathname });

    let payload: unknown = {
      items: [],
      metadata: {
        currentPage: 1,
        itemsPerPage: 8,
        totalItems: 0,
        totalPages: 0,
      },
    };
    if (parsed.pathname === "/v1/admin/workspaces") {
      payload = { items: [], metadata: { totalItems: 0 } };
    }
    if (parsed.pathname.startsWith("/v1/analytics")) {
      payload = {
        widget: parsed.searchParams.get("widget") ?? "UNKNOWN",
        period: { startDate: "2026-01-01", endDate: "2026-01-31", value: 1 },
      };
    }
    return new Response(JSON.stringify({ statusCode: 200, data: payload }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const workspacePage = await fetchWorkspaceActivityTimeline({
      page: 1,
      limit: 8,
    });
    if (!workspacePage) fail("workspace timeline returned null with bound session");

    const parentPage = await fetchParentActivityTimeline("LEAD", RELATED_ID, {
      page: 1,
      limit: 8,
    });
    if (!parentPage) fail("parent timeline returned null with bound session");

    const widgets = await fetchAnalyticsWidgets({
      period: "30d",
      compare: false,
    });
    if (widgets.size === 0) {
      fail("analytics widgets returned empty with bound session");
    }

    const admin = await listAdminWorkspaces({ page: 1, limit: 20 });
    if (!Array.isArray(admin.items)) fail("admin workspaces did not return items[]");

    await deleteAdminUser(USER_ID);

    const expectHit = (method: string, suffix: string) => {
      const hit = hits.find(
        (row) => row.method === method && row.path.includes(suffix),
      );
      if (!hit) fail(`mock fetch missed ${method} …${suffix}`);
    };

    expectHit("GET", `/v1/workspaces/${WORKSPACE_ID}/activity-timeline`);
    expectHit(
      "GET",
      `/v1/workspaces/${WORKSPACE_ID}/LEAD/${RELATED_ID}/activity-timeline`,
    );
    expectHit("GET", "/v1/admin/workspaces");
    expectHit("DELETE", `/v1/admin/user/${USER_ID}`);
    expectHit("GET", "/v1/analytics");
  } finally {
    bindCrmSession(null);
    globalThis.fetch = origFetch;
  }
}

type LiveRow = {
  key: string;
  method: string;
  path: string;
  status: number;
  ok: boolean;
  note: string;
};

export async function smokeScreenshotLive(): Promise<LiveRow[]> {
  const base = (getCrmApiBaseUrl() || "https://finconnex.payperless.app").replace(
    /\/$/,
    "",
  );
  const probes: Array<{ key: string; method: string; path: string }> = [
    {
      key: "workspaceTimeline",
      method: "GET",
      path: `/v1/workspaces/${WORKSPACE_ID}/activity-timeline`,
    },
    {
      key: "parentTimeline",
      method: "GET",
      path: `/v1/workspaces/${WORKSPACE_ID}/LEAD/${RELATED_ID}/activity-timeline`,
    },
    { key: "adminWorkspaces", method: "GET", path: "/v1/admin/workspaces" },
    {
      key: "adminDeleteUser",
      method: "DELETE",
      path: `/v1/admin/user/${USER_ID}`,
    },
    {
      key: "analyticsWidget",
      method: "GET",
      path: "/v1/analytics?widget=LEAD_CONVERSION_RATE",
    },
  ];

  const rows: LiveRow[] = [];
  for (const probe of probes) {
    try {
      const res = await fetch(`${base}${probe.path}`, {
        method: probe.method,
        headers: { Accept: "application/json" },
      });
      const routed = res.status !== 404 && res.status !== 405;
      rows.push({
        key: probe.key,
        method: probe.method,
        path: probe.path,
        status: res.status,
        ok: routed,
        note:
          res.status === 401 || res.status === 403
            ? "route live, auth required"
            : routed
              ? `HTTP ${res.status}`
              : "missing route",
      });
    } catch (err) {
      rows.push({
        key: probe.key,
        method: probe.method,
        path: probe.path,
        status: 0,
        ok: false,
        note: err instanceof Error ? err.message : "network error",
      });
    }
  }
  return rows;
}

export async function runScreenshotApiSmoke() {
  installSmokePolyfill();
  console.log("Screenshot API smoke…");

  console.log("\n1) Client wiring vs Swagger screenshot…");
  smokeScreenshotWiring();
  console.log("   OK — timeline, analytics, admin, dashboard feed, settings");

  console.log("\n2) Mock fetch — each client hits the right path…");
  await smokeScreenshotMock();
  console.log("   OK — 5 screenshot routes recorded");

  console.log("\n3) Live CRM routes (unauthenticated probe)…");
  const live = await smokeScreenshotLive();
  const missing = live.filter((row) => !row.ok);
  for (const row of live) {
    const mark = row.ok ? "OK" : "FAIL";
    console.log(
      `   ${mark}  ${row.method.padEnd(6)} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (missing.length) {
    fail(
      `live routes missing: ${missing.map((r) => `${r.method} ${r.path}`).join(", ")}`,
    );
  }
  console.log("\nScreenshot API smoke passed.");
}

runAsCli(runScreenshotApiSmoke);
