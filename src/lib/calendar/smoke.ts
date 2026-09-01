/**
 * Cross-check Calendar GET routes from live Swagger.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/calendar/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  CALENDAR_SUFFIXES,
  fetchCalendarConflicts,
  fetchCalendarDay,
  fetchCalendarEvents,
  fetchCalendarMonth,
  fetchCalendarRange,
  fetchCalendarUpcoming,
  fetchCalendarWeek,
  normalizeCalendarItem,
  workspaceCalendarPath,
} from "@/lib/calendar/api";
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

const LIVE_PATHS = [
  "/v1/calendar",
  "/v1/calendar/events",
  "/v1/calendar/day",
  "/v1/calendar/week",
  "/v1/calendar/month",
  "/v1/calendar/upcoming",
  "/v1/calendar/conflicts",
  `/v1/workspaces/${SESSION.workspaceId}/calendar`,
  `/v1/workspaces/${SESSION.workspaceId}/calendar/events`,
  `/v1/workspaces/${SESSION.workspaceId}/calendar/day`,
  `/v1/workspaces/${SESSION.workspaceId}/calendar/week`,
  `/v1/workspaces/${SESSION.workspaceId}/calendar/month`,
  `/v1/workspaces/${SESSION.workspaceId}/calendar/upcoming`,
  `/v1/workspaces/${SESSION.workspaceId}/calendar/conflicts`,
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeCalendarWiring() {
  const api = readSrc("src/lib/calendar/api.ts");
  if (!api.includes("`/v1/workspaces/${workspaceId}/calendar${suffix}`")) {
    fail("calendar client missing workspace calendar path");
  }
  if (!api.includes("`/v1/calendar${suffix}`")) {
    fail("calendar client missing global calendar path");
  }
  for (const name of [
    "fetchCalendarRange",
    "fetchCalendarEvents",
    "fetchCalendarDay",
    "fetchCalendarWeek",
    "fetchCalendarMonth",
    "fetchCalendarUpcoming",
    "fetchCalendarConflicts",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`calendar client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  if (!catalog.includes('path: "/workspaces/:workspaceId/calendar"')) {
    fail("endpoint catalog missing workspace calendar");
  }
  if (!catalog.includes('path: "/workspaces/:workspaceId/calendar/conflicts"')) {
    fail("endpoint catalog missing calendar conflicts");
  }

  const page = readSrc("src/app/(dashboard)/activities/calendar/page.tsx");
  if (!page.includes("useCrmCalendar")) {
    fail("calendar page does not call useCrmCalendar");
  }

  const dash = readSrc("src/components/dashboard/static-cards.tsx");
  if (!dash.includes("fetchCalendarUpcoming")) {
    fail("Upcoming Meetings card is not calling fetchCalendarUpcoming");
  }

  const item = normalizeCalendarItem(
    {
      id: "e1",
      title: "Kickoff",
      type: "MEETING",
      startDateTime: "2026-08-25T14:00:00.000Z",
      endDateTime: "2026-08-25T15:00:00.000Z",
      ownerName: "Ada",
    },
    0,
  );
  if (!item || item.type !== "Meeting" || item.title !== "Kickoff") {
    fail("normalizeCalendarItem did not map Swagger-shaped fields");
  }
}

export async function smokeCalendarMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;
  const payload = {
    statusCode: 200,
    data: {
      items: [
        {
          id: "evt-1",
          title: "Discovery",
          type: "Event",
          start: "2026-08-25T10:00:00.000Z",
          end: "2026-08-25T10:30:00.000Z",
          ownerName: "Ada",
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

  const range = { from: "2026-08-24", to: "2026-08-30", timezone: "UTC" };

  try {
    const results = await Promise.all([
      fetchCalendarRange(range),
      fetchCalendarEvents(range),
      fetchCalendarDay("2026-08-25", "UTC"),
      fetchCalendarWeek("2026-08-24", "UTC"),
      fetchCalendarMonth(2026, 8, "UTC"),
      fetchCalendarUpcoming("UTC"),
      fetchCalendarConflicts(range),
    ]);
    if (
      results.some(
        (items) => items.length !== 1 || items[0]?.title !== "Discovery",
      )
    ) {
      fail("calendar mock did not unwrap the CRM envelope");
    }

    const expected = CALENDAR_SUFFIXES.map(
      (suffix) => `GET ${workspaceCalendarPath(SESSION.workspaceId, suffix)}`,
    );
    for (const hit of expected) {
      if (!hits.includes(hit)) {
        fail(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
    if (
      hits.some(
        (h) => h.startsWith("GET /v1/calendar") && !h.includes("/workspaces/"),
      )
    ) {
      fail(
        "workspace session should prefer /v1/workspaces/{id}/calendar* over global routes",
      );
    }
  } finally {
    bindCrmSession(null);
    globalThis.fetch = origFetch;
  }
}

export async function smokeCalendarLive(): Promise<{
  ok: boolean;
  rows: Array<{ path: string; status: number; note: string }>;
}> {
  const base = (getCrmApiBaseUrl() || "https://finconnex.payperless.app").replace(
    /\/$/,
    "",
  );
  const rows: Array<{ path: string; status: number; note: string }> = [];
  let ok = true;

  for (const pathName of LIVE_PATHS) {
    try {
      const res = await fetch(`${base}${pathName}`, {
        headers: { Accept: "application/json" },
      });
      const routed = res.status !== 404 && res.status !== 405;
      if (!routed) ok = false;
      rows.push({
        path: pathName,
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
        path: pathName,
        status: 0,
        note: err instanceof Error ? err.message : "network error",
      });
    }
  }

  return { ok, rows };
}

export async function runCalendarSmoke() {
  installSmokePolyfill();
  console.log("Calendar API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeCalendarWiring();
  console.log(
    "   OK — workspace calendar client, catalog, Calendar page, dashboard upcoming",
  );

  console.log("\n2) Mock fetch (7 workspace routes)…");
  await smokeCalendarMock();
  console.log(
    `   OK — ${CALENDAR_SUFFIXES.map((s) => workspaceCalendarPath(SESSION.workspaceId, s)).join(", ")}`,
  );

  console.log("\n3) Live CRM probe (14 Swagger GETs)…");
  const live = await smokeCalendarLive();
  for (const row of live.rows) {
    const mark =
      row.status !== 404 && row.status !== 405 && row.status !== 0
        ? "OK"
        : "FAIL";
    console.log(`   ${mark}  GET ${row.path}  ${row.status}  ${row.note}`);
  }
  if (!live.ok) fail("one or more live calendar routes are missing");

  console.log("\nCalendar API smoke passed.");
}

runAsCli(runCalendarSmoke);
