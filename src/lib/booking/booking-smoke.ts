/**
 * Cross-check native booking Swagger routes vs client, catalog, BFF, and UI.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/booking/booking-smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  cancelCrmBooking,
  createCrmBooking,
  createCrmEventType,
  getCrmBookingSummary,
  linkCrmBooking,
  listCrmAvailableSlots,
  listCrmBookingHosts,
  listCrmBookings,
  listCrmConsultants,
  listCrmEventTypes,
  markCrmBookingNoShow,
  normalizeCrmBooking,
  normalizeCrmEventType,
  rescheduleCrmBooking,
  toCreateEventTypeBody,
  workspaceBookingPath,
} from "@/lib/booking/api";
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

const EVENT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const BOOKING = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const DECOY_PATH = "/v1/__no_such_module_booking_probe__";

const SWAGGER_PATHS = [
  "GET /workspaces/:workspaceId/booking/event-types",
  "POST /workspaces/:workspaceId/booking/event-types",
  "GET /workspaces/:workspaceId/booking/event-types/:eventTypeId",
  "PATCH /workspaces/:workspaceId/booking/event-types/:eventTypeId",
  "DELETE /workspaces/:workspaceId/booking/event-types/:eventTypeId",
  "GET /workspaces/:workspaceId/booking/event-types/:eventTypeId/hosts",
  "GET /workspaces/:workspaceId/booking/event-types/:eventTypeId/available-slots",
  "GET /workspaces/:workspaceId/booking/hosts",
  "POST /workspaces/:workspaceId/booking/hosts",
  "GET /workspaces/:workspaceId/booking/hosts/consultants",
  "GET /workspaces/:workspaceId/booking/hosts/home-consultants",
  "GET /workspaces/:workspaceId/booking/hosts/:hostId",
  "PATCH /workspaces/:workspaceId/booking/hosts/:hostId",
  "DELETE /workspaces/:workspaceId/booking/hosts/:hostId",
  "GET /workspaces/:workspaceId/booking/hosts/:hostId/schedules",
  "POST /workspaces/:workspaceId/booking/hosts/:hostId/schedules",
  "PATCH /workspaces/:workspaceId/booking/hosts/schedules/:scheduleId",
  "DELETE /workspaces/:workspaceId/booking/hosts/schedules/:scheduleId",
  "POST /workspaces/:workspaceId/booking/hosts/schedules/:scheduleId/overrides",
  "DELETE /workspaces/:workspaceId/booking/hosts/schedules/:scheduleId/overrides/:overrideId",
  "GET /workspaces/:workspaceId/booking/bookings",
  "POST /workspaces/:workspaceId/booking/bookings",
  "GET /workspaces/:workspaceId/booking/bookings/summary",
  "GET /workspaces/:workspaceId/booking/bookings/analytics",
  "GET /workspaces/:workspaceId/booking/bookings/:bookingId",
  "POST /workspaces/:workspaceId/booking/bookings/:bookingId/reschedule",
  "POST /workspaces/:workspaceId/booking/bookings/:bookingId/cancel",
  "POST /workspaces/:workspaceId/booking/bookings/:bookingId/no-show",
  "DELETE /workspaces/:workspaceId/booking/bookings/:bookingId/no-show",
  "PATCH /workspaces/:workspaceId/booking/bookings/:bookingId/crm-link",
  "GET /workspaces/:workspaceId/booking/links",
  "POST /workspaces/:workspaceId/booking/links",
  "PATCH /workspaces/:workspaceId/booking/links/:linkId",
  "DELETE /workspaces/:workspaceId/booking/links/:linkId",
] as const;

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/booking/event-types`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/booking/hosts`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/booking/hosts/consultants`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/booking/bookings`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/booking/bookings/summary`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/booking/links`,
  },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  const full = path.join(repoRoot(), rel);
  if (!existsSync(full)) fail(`missing ${rel}`);
  return readFileSync(full, "utf8");
}

function catalogPath(row: string) {
  return row.replace(/^(GET|POST|PATCH|PUT|DELETE)\s+/, "");
}

export function smokeBookingWiring() {
  const api = readSrc("src/lib/booking/api.ts");
  for (const name of [
    "listCrmEventTypes",
    "createCrmEventType",
    "listCrmAvailableSlots",
    "listCrmBookings",
    "createCrmBooking",
    "listCrmConsultants",
    "listCrmBookingHosts",
    "linkCrmBooking",
    "rescheduleCrmBooking",
    "cancelCrmBooking",
    "markCrmBookingNoShow",
    "getCrmBookingSummary",
  ]) {
    if (!api.includes(`export function ${name}`) && !api.includes(`export async function ${name}`)) {
      fail(`booking client missing ${name}`);
    }
  }
  if (!api.includes("crmBffFetch")) {
    fail("booking client must call crmBffFetch in the browser");
  }
  if (!api.includes("/event-types/${input.eventTypeId}/available-slots")) {
    fail("available-slots path must match Swagger event-types/{id}/available-slots");
  }
  if (!api.includes("/bookings/${bookingId}/crm-link")) {
    fail("crm-link path must match Swagger bookings/{id}/crm-link");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"booking"') || !bff.includes('path.includes("booking")')) {
    fail("BFF proxy does not allow booking");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const row of SWAGGER_PATHS) {
    const fragment = `path: "${catalogPath(row)}"`;
    if (!catalog.includes(fragment)) fail(`endpoint catalog missing ${fragment}`);
  }

  const board = readSrc("src/components/booking/ConsultationsBoard.tsx");
  if (!board.includes("createCrmEventType") || !board.includes("listCrmEventTypePages")) {
    fail("ConsultationsBoard is not wired to CRM event types");
  }

  const additional = readSrc("src/components/booking/BookingAdditionalSettingsStep.tsx");
  if (additional.includes("Third-party calendar settings")) {
    fail("consultation setup must use FinConnex calendar, not third-party calendar as the source");
  }
  if (!additional.includes("FinConnex calendar")) {
    fail("consultation additional settings must name the FinConnex calendar");
  }

  const modal = readSrc("src/components/booking/NewBookingModal.tsx");
  if (!modal.includes("createCrmBooking") || !modal.includes("linkCrmBooking")) {
    fail("NewBookingModal is not wired to CRM create booking + crm-link");
  }

  const assign = readSrc("src/components/booking/AssignConsultantsStep.tsx");
  if (!assign.includes("loadWorkspaceConsultants")) {
    fail("AssignConsultantsStep must list workspace users as consultants");
  }

  const hook = readSrc("src/lib/booking/use-crm-booking.ts");
  if (!hook.includes("listCrmBookings") || !hook.includes("listCrmConsultants")) {
    fail("useCrmBooking is not wired to CRM bookings/hosts");
  }

  const publicBook = readSrc("src/components/booking/PublicBookClient.tsx");
  if (!publicBook.includes("listCrmAvailableSlots")) {
    fail("PublicBookClient is not wired to CRM available-slots");
  }
  if (!publicBook.includes("/api/book/")) {
    fail("PublicBookClient must resolve published booking pages by slug");
  }

  const actions = readSrc("src/lib/booking/actions.ts");
  if (!actions.includes("createCrmBooking")) {
    fail("confirmPublicBooking is not wired to CRM create booking");
  }
  if (actions.includes('from "@/lib/contacts/store"')) {
    fail("guest confirm must not POST /contacts (expired host session 401s abort booking)");
  }
  if (!actions.includes("createCrmMeeting")) {
    fail("public confirm must try CRM meeting create for a real join URL");
  }
  if (!actions.includes("dispatchBookingNotifications")) {
    fail("booking confirm/cancel must dispatch channel prefs");
  }

  const notifyUi = readSrc("src/components/booking/BookingNotificationsStep.tsx");
  if (!notifyUi.includes("toggleChannel") || !notifyUi.includes("sendNotifyTest")) {
    fail("notification chips must toggle and support a real test send");
  }

  const eventType = normalizeCrmEventType({
    id: EVENT,
    name: "Discovery",
    duration: 30,
    locationType: "ZOOM",
  });
  if (eventType.durationMinutes !== 30 || eventType.name !== "Discovery") {
    fail("normalizeCrmEventType must read name and duration");
  }
  if (eventType.locationType !== "ZOOM") {
    fail("normalizeCrmEventType must read locationType");
  }
  const zoomBody = toCreateEventTypeBody({
    name: "Discovery",
    meetingPlace: "online",
    platform: "Zoom",
  });
  if (zoomBody.locationType !== "ZOOM" || zoomBody.location !== "Zoom") {
    fail("create event type must send locationType ZOOM");
  }
  const meetBody = toCreateEventTypeBody({
    name: "Discovery",
    meetingPlace: "online",
    platform: "Google Meet",
  });
  if (meetBody.locationType !== "GOOGLE_MEET") {
    fail("create event type must send locationType GOOGLE_MEET");
  }
  const booking = normalizeCrmBooking({
    id: BOOKING,
    guest_name: "Alex",
    start_time: "2026-09-18T01:00:00.000Z",
    status: "SCHEDULED",
  });
  if (booking.guestName !== "Alex" || !booking.startTime) {
    fail("normalizeCrmBooking must read guest_name and start_time");
  }
}

export async function smokeBookingMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;
  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(String(input), "https://crm.smoke.test");
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          items: [
            {
              id: EVENT,
              name: "Discovery",
              durationMinutes: 30,
              startTime: "2026-09-18T01:00:00.000Z",
              guestName: "Alex",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmEventTypes();
    await createCrmEventType({ name: "Discovery", durationMinutes: 30 });
    await listCrmAvailableSlots({
      eventTypeId: EVENT,
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T00:00:00.000Z",
    });
    await listCrmBookingHosts();
    await listCrmConsultants();
    await listCrmBookings();
    await createCrmBooking({
      eventTypeId: EVENT,
      startTime: "2026-09-18T01:00:00.000Z",
      name: "Alex",
      email: "alex@example.com",
    });
    await linkCrmBooking(BOOKING, { leadId: EVENT });
    await rescheduleCrmBooking(BOOKING, "2026-09-19T01:00:00.000Z");
    await cancelCrmBooking(BOOKING, "Guest cancelled");
    await markCrmBookingNoShow(BOOKING);
    await getCrmBookingSummary();
  } finally {
    bindCrmSession(null);
    globalThis.fetch = origFetch;
  }

  const expected = [
    `GET ${workspaceBookingPath(SESSION.workspaceId, "/event-types")}`,
    `POST ${workspaceBookingPath(SESSION.workspaceId, "/event-types")}`,
    `GET ${workspaceBookingPath(SESSION.workspaceId, `/event-types/${EVENT}/available-slots`)}`,
    `GET ${workspaceBookingPath(SESSION.workspaceId, "/hosts")}`,
    `GET ${workspaceBookingPath(SESSION.workspaceId, "/hosts/consultants")}`,
    `GET ${workspaceBookingPath(SESSION.workspaceId, "/bookings")}`,
    `POST ${workspaceBookingPath(SESSION.workspaceId, "/bookings")}`,
    `PATCH ${workspaceBookingPath(SESSION.workspaceId, `/bookings/${BOOKING}/crm-link`)}`,
    `POST ${workspaceBookingPath(SESSION.workspaceId, `/bookings/${BOOKING}/reschedule`)}`,
    `POST ${workspaceBookingPath(SESSION.workspaceId, `/bookings/${BOOKING}/cancel`)}`,
    `POST ${workspaceBookingPath(SESSION.workspaceId, `/bookings/${BOOKING}/no-show`)}`,
    `GET ${workspaceBookingPath(SESSION.workspaceId, "/bookings/summary")}`,
  ];
  for (const row of expected) {
    if (!hits.includes(row)) fail(`missing mock hit ${row}; got ${hits.join(", ")}`);
  }
}

async function probeLive(
  base: string,
  method: string,
  pathName: string,
  token?: string,
) {
  const res = await fetch(`${base}${pathName}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    if (Array.isArray(json.message) && typeof json.message[0] === "string") {
      message = json.message[0];
    }
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
      msg.includes("jwt") ||
      msg.includes("auth"))
  );
}

function readLocalEnv(name: string) {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  const envPath = path.join(repoRoot(), ".env.local");
  if (!existsSync(envPath)) return "";
  const raw = readFileSync(envPath, "utf8");
  const line = raw.split(/\r?\n/).find((row) => row.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : "";
}

export async function smokeBookingLive() {
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

  const token = readLocalEnv("CRM_ACCESS_TOKEN");
  const workspaceId = readLocalEnv("CRM_WORKSPACE_ID");
  if (token && workspaceId) {
    const authedPath = `/v1/workspaces/${workspaceId}/booking/event-types`;
    try {
      const hit = await probeLive(base, "GET", authedPath, token);
      const note =
        hit.status === 200
          ? "authed GET event-types 200"
          : hit.status === 404
            ? `authed module missing: ${hit.message}`
            : `authed GET ${hit.status}: ${hit.message}`;
      if (hit.status !== 200 && hit.status !== 401 && hit.status !== 403) {
        ok = hit.status !== 404 ? ok : false;
      }
      rows.push({
        method: "GET",
        path: "/v1/workspaces/{workspaceId}/booking/event-types",
        status: hit.status,
        note,
      });
    } catch (err) {
      ok = false;
      rows.push({
        method: "GET",
        path: "/v1/workspaces/{workspaceId}/booking/event-types",
        status: 0,
        note: err instanceof Error ? err.message : "network error",
      });
    }
  }

  return { ok, rows };
}

export async function runBookingSmoke() {
  installSmokePolyfill();
  console.log("Native booking API smoke…");

  console.log("\n1) Client + catalog + BFF + UI wiring…");
  smokeBookingWiring();
  console.log(`   OK — ${SWAGGER_PATHS.length} Swagger paths in catalog`);

  console.log("\n2) Mock fetch…");
  await smokeBookingMock();
  console.log("   OK — workspace-scoped booking ops hit");

  console.log("\n3) Live CRM probe (decoy 404 vs booking 401)…");
  const live = await smokeBookingLive();
  for (const row of live.rows) {
    const isDecoy = row.path === DECOY_PATH;
    const mark = isDecoy
      ? row.status === 404
        ? "OK"
        : "FAIL"
      : row.note.startsWith("routed + auth required") ||
          row.note.startsWith("authed GET event-types 200")
        ? "OK"
        : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (!live.ok) fail("live booking probe failed");

  console.log("\nPASS");
}

runAsCli(runBookingSmoke);
