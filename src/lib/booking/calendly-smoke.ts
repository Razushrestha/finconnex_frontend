/**
 * Cross-check Calendly booking Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/booking/calendly-smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession } from "@/lib/activity-timeline";
import {
  cancelCalendlyMeeting,
  createCalendlyBooking,
  createCalendlySchedulingLink,
  getCalendlyRescheduleLink,
  getCalendlySummary,
  linkCalendlyMeetingCrm,
  listCalendlyAvailabilitySchedules,
  listCalendlyAvailableTimes,
  listCalendlyBusyTimes,
  listCalendlyEventTypes,
  listCalendlyHosts,
  markCalendlyNoShow,
  normalizeCalendlyEventType,
  normalizeCalendlyHost,
  removeCalendlyNoShow,
  updateCalendlyHost,
  workspaceCalendlyPath,
} from "@/lib/booking/calendly-api";
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
const EVENT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function readSrc(rel: string) {
  const full = path.join(process.cwd(), rel);
  if (!existsSync(full)) fail(`missing ${rel}`);
  return readFileSync(full, "utf8");
}

export function smokeCalendlyWiring() {
  const api = readSrc("src/lib/booking/calendly-api.ts");
  for (const name of [
    "listCalendlyHosts",
    "updateCalendlyHost",
    "listCalendlyEventTypes",
    "listCalendlyAvailableTimes",
    "listCalendlyBusyTimes",
    "listCalendlyAvailabilitySchedules",
    "createCalendlySchedulingLink",
    "createCalendlyBooking",
    "cancelCalendlyMeeting",
    "getCalendlyRescheduleLink",
    "markCalendlyNoShow",
    "removeCalendlyNoShow",
    "linkCalendlyMeetingCrm",
    "getCalendlySummary",
  ]) {
    if (!api.includes(`export function ${name}`) && !api.includes(`export async function ${name}`)) {
      fail(`calendly client missing ${name}`);
    }
  }
  if (!api.includes("crmBffFetch")) {
    fail("calendly client must call crmBffFetch in the browser");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"calendly"') || !bff.includes('path.includes("calendly")')) {
    fail("BFF proxy does not allow calendly");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/workspaces/:workspaceId/calendly/hosts"',
    'path: "/workspaces/:workspaceId/calendly/hosts/:id"',
    'path: "/workspaces/:workspaceId/calendly/event-types"',
    'path: "/workspaces/:workspaceId/calendly/available-times"',
    'path: "/workspaces/:workspaceId/calendly/hosts/:id/busy-times"',
    'path: "/workspaces/:workspaceId/calendly/hosts/:id/availability-schedules"',
    'path: "/workspaces/:workspaceId/calendly/scheduling-links"',
    'path: "/workspaces/:workspaceId/calendly/bookings"',
    'path: "/workspaces/:workspaceId/calendly/meetings/:id/cancel"',
    'path: "/workspaces/:workspaceId/calendly/meetings/:id/reschedule-link"',
    'path: "/workspaces/:workspaceId/calendly/invitees/:id/no-show"',
    'path: "/workspaces/:workspaceId/calendly/meetings/:id/crm-link"',
    'path: "/workspaces/:workspaceId/calendly/summary"',
  ]) {
    if (!catalog.includes(fragment)) fail(`endpoint catalog missing ${fragment}`);
  }

  const host = normalizeCalendlyHost({
    id: ID,
    name: "Priya",
    email: "priya@example.com",
    isConsultant: true,
  });
  if (host.name !== "Priya" || !host.isConsultant) {
    fail("normalizeCalendlyHost did not map Swagger-shaped fields");
  }
  const eventType = normalizeCalendlyEventType({
    id: EVENT,
    name: "Discovery",
    duration: 30,
  });
  if (eventType.durationMinutes !== 30) {
    fail("normalizeCalendlyEventType must read duration");
  }
}

export async function smokeCalendlyMock() {
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
          items: [{ id: ID, name: "Priya", start_time: "2026-09-10T00:00:00.000Z" }],
          url: "https://calendly.com/share",
          meetingId: ID,
          inviteeId: EVENT,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCalendlyHosts({ consultant: true });
    await updateCalendlyHost(ID, { isConsultant: true });
    await listCalendlyEventTypes();
    await listCalendlyAvailableTimes({
      eventTypeId: EVENT,
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T00:00:00.000Z",
    });
    await listCalendlyBusyTimes(ID, {
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-07T00:00:00.000Z",
    });
    await listCalendlyAvailabilitySchedules(ID);
    await createCalendlySchedulingLink({ eventTypeId: EVENT, reusable: true });
    await createCalendlyBooking({
      idempotencyKey: EVENT,
      eventTypeId: EVENT,
      startTime: "2026-09-10T01:00:00.000Z",
      name: "Guest",
      email: "guest@example.com",
      timezone: "Australia/Sydney",
    });
    await cancelCalendlyMeeting(ID, "Guest cancelled");
    await getCalendlyRescheduleLink(ID, EVENT);
    await markCalendlyNoShow(EVENT);
    await removeCalendlyNoShow(EVENT);
    await linkCalendlyMeetingCrm(ID, { leadId: EVENT });
    await getCalendlySummary({
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T00:00:00.000Z",
    });

    const expected = [
      `GET ${workspaceCalendlyPath(SESSION.workspaceId, "/hosts")}`,
      `PATCH ${workspaceCalendlyPath(SESSION.workspaceId, `/hosts/${ID}`)}`,
      `GET ${workspaceCalendlyPath(SESSION.workspaceId, "/event-types")}`,
      `GET ${workspaceCalendlyPath(SESSION.workspaceId, "/available-times")}`,
      `GET ${workspaceCalendlyPath(SESSION.workspaceId, `/hosts/${ID}/busy-times`)}`,
      `GET ${workspaceCalendlyPath(SESSION.workspaceId, `/hosts/${ID}/availability-schedules`)}`,
      `POST ${workspaceCalendlyPath(SESSION.workspaceId, "/scheduling-links")}`,
      `POST ${workspaceCalendlyPath(SESSION.workspaceId, "/bookings")}`,
      `POST ${workspaceCalendlyPath(SESSION.workspaceId, `/meetings/${ID}/cancel`)}`,
      `GET ${workspaceCalendlyPath(SESSION.workspaceId, `/meetings/${ID}/reschedule-link`)}`,
      `POST ${workspaceCalendlyPath(SESSION.workspaceId, `/invitees/${EVENT}/no-show`)}`,
      `DELETE ${workspaceCalendlyPath(SESSION.workspaceId, `/invitees/${EVENT}/no-show`)}`,
      `PATCH ${workspaceCalendlyPath(SESSION.workspaceId, `/meetings/${ID}/crm-link`)}`,
      `GET ${workspaceCalendlyPath(SESSION.workspaceId, "/summary")}`,
    ];
    for (const row of expected) {
      const [method, pathname] = row.split(" ");
      const hit = hits.find(
        (item) => item.startsWith(`${method} `) && item.includes(pathname!),
      );
      if (!hit) fail(`smoke did not hit ${row}; got ${hits.join(", ")}`);
    }
  } finally {
    globalThis.fetch = origFetch;
  }
}

export function smokeCalendly() {
  smokeCalendlyWiring();
  return smokeCalendlyMock();
}

runAsCli(smokeCalendly);
