/**
 * Cross-check Deals Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/deals/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  addCrmDealContact,
  apiDealStage,
  bulkCrmDeals,
  cloneCrmDeal,
  createCrmDeal,
  deleteCrmDeal,
  dealsPath,
  getCrmDeal,
  getCrmDealForecast,
  getCrmDealPipeline,
  listCrmDealContacts,
  listCrmDeals,
  loadCrmDealsBoard,
  normalizeDeal,
  removeCrmDealContact,
  replaceCrmDealContacts,
  restoreCrmDeal,
  updateCrmDeal,
  updateCrmDealContactRole,
} from "@/lib/deals/api";
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
const CONTACT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const DECOY_PATH = "/v1/__no_such_module_deals_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/deals" },
  { method: "GET", path: "/v1/deals/pipeline" },
  { method: "GET", path: "/v1/deals/forecast" },
  { method: "GET", path: `/v1/deals/${ID}` },
  { method: "POST", path: "/v1/deals" },
  { method: "PATCH", path: `/v1/deals/${ID}` },
  { method: "DELETE", path: `/v1/deals/${ID}` },
  { method: "POST", path: "/v1/deals/bulk" },
  { method: "POST", path: `/v1/deals/${ID}/restore` },
  { method: "POST", path: `/v1/deals/${ID}/clone` },
  { method: "GET", path: `/v1/deals/${ID}/contacts` },
  { method: "POST", path: `/v1/deals/${ID}/contacts` },
  { method: "PUT", path: `/v1/deals/${ID}/contacts` },
  { method: "PATCH", path: `/v1/deals/${ID}/contacts/${CONTACT_ID}` },
  { method: "DELETE", path: `/v1/deals/${ID}/contacts/${CONTACT_ID}` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeDealsWiring() {
  const api = readSrc("src/lib/deals/api.ts");
  for (const name of [
    "listCrmDeals",
    "getCrmDealPipeline",
    "getCrmDealForecast",
    "loadCrmDealsBoard",
    "getCrmDeal",
    "createCrmDeal",
    "updateCrmDeal",
    "deleteCrmDeal",
    "restoreCrmDeal",
    "cloneCrmDeal",
    "bulkCrmDeals",
    "listCrmDealContacts",
    "addCrmDealContact",
    "replaceCrmDealContacts",
    "updateCrmDealContactRole",
    "removeCrmDealContact",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`deals client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/deals${suffix}`")) {
    fail("deals client missing /v1/deals path");
  }
  if (!api.includes('dealsGet("/pipeline")')) {
    fail("deals client missing GET /v1/deals/pipeline");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/deals"',
    'path: "/deals/pipeline"',
    'path: "/deals/forecast"',
    'path: "/deals/:id"',
    'path: "/deals/bulk"',
    'path: "/deals/:id/restore"',
    'path: "/deals/:id/clone"',
    'path: "/deals/:id/contacts"',
    'path: "/deals/:id/contacts/:contactId"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }
  if (catalog.includes('path: "/deals/pipelines"')) {
    fail("catalog still lists the invalid /deals/pipelines path");
  }

  const page = readSrc("src/app/(dashboard)/sales/deals/page.tsx");
  if (!page.includes("useCrmDeals")) {
    fail("deals page does not call useCrmDeals");
  }

  const store = readSrc("src/lib/deals/store.ts");
  if (!store.includes("createCrmDeal")) {
    fail("deals store does not sync create to CRM");
  }
  if (!store.includes("deleteCrmDeal")) {
    fail("deals store does not sync delete to CRM");
  }

  const mapped = normalizeDeal(
    {
      id: ID,
      name: "Greystone",
      companyName: "Greystone Realty",
      stage: "NEGOTIATION",
      value: 620000,
      ownerName: "Ada",
    },
    0,
  );
  if (
    mapped.name !== "Greystone" ||
    mapped.stageTitle !== "Negotiation" ||
    apiDealStage("Closed Won") !== "CLOSED_WON"
  ) {
    fail("normalizeDeal did not map Swagger-shaped fields");
  }
}

export async function smokeDealsMock() {
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
        data: {
          items: [
            {
              id: ID,
              name: "Greystone",
              stage: "NEGOTIATION",
              value: 620000,
              ownerName: "Ada",
            },
          ],
          stages: [
            {
              title: "NEGOTIATION",
              cards: [{ id: ID, name: "Greystone", value: 620000 }],
            },
          ],
          expected: 100,
          actual: 50,
          id: CONTACT_ID,
          contactId: CONTACT_ID,
          name: "Priya",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmDeals();
    await getCrmDealPipeline();
    await getCrmDealForecast();
    await loadCrmDealsBoard();
    await getCrmDeal(ID);
    await createCrmDeal({ name: "New" });
    await updateCrmDeal(ID, { stage: "PROPOSAL" });
    await restoreCrmDeal(ID);
    await cloneCrmDeal(ID);
    await bulkCrmDeals({ ids: [ID], operation: "DELETE" });
    await listCrmDealContacts(ID);
    await addCrmDealContact(ID, { contactId: CONTACT_ID });
    await replaceCrmDealContacts(ID, [{ contactId: CONTACT_ID }]);
    await updateCrmDealContactRole(ID, CONTACT_ID, "PRIMARY");
    await removeCrmDealContact(ID, CONTACT_ID);
    await deleteCrmDeal(ID);

    const expected = [
      `GET ${dealsPath()}`,
      `GET ${dealsPath("/pipeline")}`,
      `GET ${dealsPath("/forecast")}`,
      `GET ${dealsPath(`/${ID}`)}`,
      `POST ${dealsPath()}`,
      `PATCH ${dealsPath(`/${ID}`)}`,
      `POST ${dealsPath(`/${ID}/restore`)}`,
      `POST ${dealsPath(`/${ID}/clone`)}`,
      `POST ${dealsPath("/bulk")}`,
      `GET ${dealsPath(`/${ID}/contacts`)}`,
      `POST ${dealsPath(`/${ID}/contacts`)}`,
      `PUT ${dealsPath(`/${ID}/contacts`)}`,
      `PATCH ${dealsPath(`/${ID}/contacts/${CONTACT_ID}`)}`,
      `DELETE ${dealsPath(`/${ID}/contacts/${CONTACT_ID}`)}`,
      `DELETE ${dealsPath(`/${ID}`)}`,
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
      ...(method === "POST" || method === "PATCH" || method === "PUT"
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      method === "POST" || method === "PATCH" || method === "PUT"
        ? "{}"
        : undefined,
  });
  const text = await res.text();
  let message = text.slice(0, 180);
  try {
    const json = JSON.parse(text) as { message?: unknown };
    if (typeof json.message === "string") message = json.message;
    else if (Array.isArray(json.message)) message = json.message.join(", ");
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

export async function smokeDealsLive() {
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

export async function runDealsSmoke() {
  installSmokePolyfill();
  console.log("Deals API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeDealsWiring();
  console.log("   OK — client, catalog, deals page, store");

  console.log("\n2) Mock fetch…");
  await smokeDealsMock();
  console.log("   OK — all 15 Swagger routes hit");

  console.log("\n3) Live CRM probe (decoy 404 vs deals 401)…");
  const live = await smokeDealsLive();
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
  if (!live.ok) fail("live deals probe failed");

  console.log("\nDeals API smoke passed.");
}

runAsCli(runDealsSmoke);
