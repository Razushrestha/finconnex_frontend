/**
 * Cross-check Tickets Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/support/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  addCrmTicketNote,
  addCrmTicketReply,
  createCrmTicket,
  deleteCrmTicket,
  getCrmTicket,
  listCrmTicketNotes,
  listCrmTicketReplies,
  listCrmTickets,
  mergeCrmTickets,
  normalizeTicket,
  suggestCrmTicketReply,
  ticketsPath,
  updateCrmTicket,
} from "@/lib/support/api";
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
const TARGET = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const DECOY_PATH = "/v1/__no_such_module_tickets_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/tickets" },
  { method: "POST", path: "/v1/tickets" },
  { method: "GET", path: `/v1/tickets/${ID}` },
  { method: "PATCH", path: `/v1/tickets/${ID}` },
  { method: "DELETE", path: `/v1/tickets/${ID}` },
  { method: "GET", path: `/v1/tickets/${ID}/replies` },
  { method: "POST", path: `/v1/tickets/${ID}/replies` },
  { method: "GET", path: `/v1/tickets/${ID}/notes` },
  { method: "POST", path: `/v1/tickets/${ID}/notes` },
  { method: "POST", path: `/v1/tickets/${ID}/merge` },
  { method: "POST", path: `/v1/tickets/${ID}/suggest-reply` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeTicketsWiring() {
  const api = readSrc("src/lib/support/api.ts");
  for (const name of [
    "listCrmTickets",
    "getCrmTicket",
    "createCrmTicket",
    "updateCrmTicket",
    "deleteCrmTicket",
    "listCrmTicketReplies",
    "addCrmTicketReply",
    "listCrmTicketNotes",
    "addCrmTicketNote",
    "mergeCrmTickets",
    "suggestCrmTicketReply",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`tickets client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/tickets${suffix}`")) {
    fail("tickets client missing /v1/tickets path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/tickets"',
    'path: "/tickets/:id"',
    'path: "/tickets/:id/replies"',
    'path: "/tickets/:id/notes"',
    'path: "/tickets/:id/merge"',
    'path: "/tickets/:id/suggest-reply"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }
  if (catalog.includes('path: "/tickets/:id/status"')) {
    fail("tickets Swagger has no /tickets/:id/status");
  }

  const page = readSrc("src/app/(dashboard)/support/page.tsx");
  if (!page.includes("useCrmTickets")) {
    fail("support page does not call useCrmTickets");
  }

  const hook = readSrc("src/lib/support/use-crm-tickets.ts");
  if (!hook.includes("replaceCrmTickets")) {
    fail("tickets hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("tickets hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc("src/components/support/CreateTicketForm.tsx");
  if (!create.includes("createCrmTicket")) {
    fail("create ticket form does not call createCrmTicket");
  }

  const detail = readSrc("src/components/support/TicketDetailClient.tsx");
  for (const name of [
    "hydrateCrmTicket",
    "updateCrmTicket",
    "deleteCrmTicket",
    "addCrmTicketNote",
    "addCrmTicketReply",
    "mergeCrmTickets",
    "suggestCrmTicketReply",
  ]) {
    if (!detail.includes(name)) {
      fail(`ticket detail does not call ${name}`);
    }
  }

  const normalized = normalizeTicket(
    {
      id: ID,
      subject: "Portal login fails",
      status: "IN_PROGRESS",
      priority: "HIGH",
      category: "TECHNICAL",
      requesterName: "Priya Mehta",
    },
    0,
  );
  if (
    normalized.subject !== "Portal login fails" ||
    normalized.status !== "In Progress" ||
    normalized.priority !== "High" ||
    normalized.category !== "Technical"
  ) {
    fail("normalizeTicket did not map Swagger-shaped fields");
  }
}

export async function smokeTicketsMock() {
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
              subject: "Portal login fails",
              status: "OPEN",
              priority: "HIGH",
            },
          ],
          suggestion: "Please try a password reset.",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmTickets();
    await getCrmTicket(ID);
    await createCrmTicket({
      subject: "New",
      requester: "Priya",
      priority: "Medium",
      status: "New",
      description: "Details",
    });
    await updateCrmTicket(ID, { subject: "Updated" });
    await listCrmTicketReplies(ID);
    await addCrmTicketReply(ID, "Thanks");
    await listCrmTicketNotes(ID);
    await addCrmTicketNote(ID, "Internal");
    await mergeCrmTickets(ID, TARGET);
    await suggestCrmTicketReply(ID);
    await deleteCrmTicket(ID);

    const expected = [
      `GET ${ticketsPath()}`,
      `GET ${ticketsPath(`/${ID}`)}`,
      `POST ${ticketsPath()}`,
      `PATCH ${ticketsPath(`/${ID}`)}`,
      `GET ${ticketsPath(`/${ID}/replies`)}`,
      `POST ${ticketsPath(`/${ID}/replies`)}`,
      `GET ${ticketsPath(`/${ID}/notes`)}`,
      `POST ${ticketsPath(`/${ID}/notes`)}`,
      `POST ${ticketsPath(`/${ID}/merge`)}`,
      `POST ${ticketsPath(`/${ID}/suggest-reply`)}`,
      `DELETE ${ticketsPath(`/${ID}`)}`,
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

export async function smokeTicketsLive() {
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

export async function runTicketsSmoke() {
  installSmokePolyfill();
  console.log("Tickets API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeTicketsWiring();
  console.log("   OK — client, catalog, list, create, detail");

  console.log("\n2) Mock fetch…");
  await smokeTicketsMock();
  console.log("   OK — all 11 Swagger routes hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokeTicketsLive();
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
  if (!live.ok) fail("live tickets probe failed");

  console.log("\nTickets API smoke passed.");
}

runAsCli(runTicketsSmoke);
