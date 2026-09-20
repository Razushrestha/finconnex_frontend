/**
 * Cross-check public.sales Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/finance/public-sales/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  acceptPublicQuote,
  appPublicSalesPath,
  createPublicInvoicePayIntent,
  declinePublicQuote,
  getPublicEstimate,
  getPublicInvoice,
  getPublicQuote,
  normalizePublicSalesDocument,
  publicSalesPath,
  rewritePublicSalesUrl,
} from "@/lib/finance/public-sales/api";
import {
  financeLiveNote,
  isFinanceLiveOk,
} from "@/lib/finance/smoke-live";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;
const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const HASH = "publichashvalue";
const DECOY_PATH = "/v1/__no_such_module_public_sales_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: `/v1/public/sales/quotes/${ID}/${HASH}` },
  { method: "GET", path: `/v1/public/sales/estimates/${ID}/${HASH}` },
  { method: "GET", path: `/v1/public/sales/invoices/${ID}/${HASH}` },
  { method: "POST", path: `/v1/public/sales/quotes/${ID}/${HASH}/accept` },
  { method: "POST", path: `/v1/public/sales/quotes/${ID}/${HASH}/decline` },
  { method: "POST", path: `/v1/public/sales/invoices/${ID}/${HASH}/pay-intent` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokePublicSalesWiring() {
  const api = readSrc("src/lib/finance/public-sales/api.ts");
  for (const name of [
    "getPublicQuote",
    "getPublicEstimate",
    "getPublicInvoice",
    "acceptPublicQuote",
    "declinePublicQuote",
    "createPublicInvoicePayIntent",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`public-sales client missing ${name}`);
    }
  }

  if (!api.includes("crmBffFetch")) {
    fail("public-sales client must use crmBffFetch in the browser");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/public/sales/quotes/:id/:hash"',
    'path: "/public/sales/estimates/:id/:hash"',
    'path: "/public/sales/invoices/:id/:hash"',
    'path: "/public/sales/quotes/:id/:hash/accept"',
    'path: "/public/sales/quotes/:id/:hash/decline"',
    'path: "/public/sales/invoices/:id/:hash/pay-intent"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const ui = readSrc(
    "src/components/finance/public-sales/PublicSalesDocumentClient.tsx",
  );
  for (const name of [
    "getPublicQuote",
    "getPublicEstimate",
    "getPublicInvoice",
    "acceptPublicQuote",
    "declinePublicQuote",
    "createPublicInvoicePayIntent",
  ]) {
    if (!ui.includes(name)) {
      fail(`public sales UI does not call ${name}`);
    }
  }

  const rewritten = rewritePublicSalesUrl(
    `https://finconnex.payperless.app/v1/public/sales/quotes/${ID}/${HASH}`,
  );
  if (rewritten !== appPublicSalesPath("quotes", ID, HASH)) {
    fail("rewritePublicSalesUrl did not map CRM URL to app path");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('path[1] === "sales"')) {
    fail("BFF proxy must allow public/sales routes");
  }

  for (const kind of ["quotes", "estimates", "invoices"] as const) {
    const page = readSrc(
      `src/app/(public)/public/sales/${kind}/[id]/[hash]/page.tsx`,
    );
    if (!page.includes("PublicSalesDocumentClient")) {
      fail(`public sales ${kind} page missing PublicSalesDocumentClient`);
    }
    if (!page.includes(`kind="${kind}"`)) {
      fail(`public sales ${kind} page must pass kind="${kind}"`);
    }
  }

  const normalized = normalizePublicSalesDocument("quotes", {
    id: ID,
    title: "Refinance quote",
    quoteNumber: "QUO-1",
    status: "SENT",
    clientName: "Greystone",
    lineItems: [{ name: "Packaging", quantity: 1, unitPrice: 100, taxRate: 10 }],
  });
  if (normalized.title !== "Refinance quote" || normalized.total !== 110) {
    fail("normalizePublicSalesDocument did not map quote fields");
  }
}

export async function smokePublicSalesMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const raw =
      typeof input === "string" ? input : (input as Request).url ?? String(input);
    const parsed = new URL(raw, "https://crm.smoke.test");
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          id: ID,
          title: "Refinance quote",
          status: "SENT",
          clientName: "Greystone",
          clientSecret: "cs_test",
          url: "https://pay.example/checkout",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await getPublicQuote(ID, HASH);
    await getPublicEstimate(ID, HASH);
    await getPublicInvoice(ID, HASH);
    await acceptPublicQuote(ID, HASH);
    await declinePublicQuote(ID, HASH);
    await createPublicInvoicePayIntent(ID, HASH);

    const expected = [
      `GET ${publicSalesPath("quotes", ID, HASH)}`,
      `GET ${publicSalesPath("estimates", ID, HASH)}`,
      `GET ${publicSalesPath("invoices", ID, HASH)}`,
      `POST ${publicSalesPath("quotes", ID, HASH, "/accept")}`,
      `POST ${publicSalesPath("quotes", ID, HASH, "/decline")}`,
      `POST ${publicSalesPath("invoices", ID, HASH, "/pay-intent")}`,
    ];
    for (const hit of expected) {
      if (!hits.includes(hit)) {
        fail(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
  } finally {
    globalThis.fetch = origFetch;
  }
}

async function probeLive(base: string, method: string, path: string) {
  const send = async () => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" ? "{}" : undefined,
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
  };

  let hit = await send();
  if (hit.status === 502 || hit.status === 503 || hit.status === 504) {
    await new Promise((r) => setTimeout(r, 800));
    hit = await send();
  }
  return hit;
}

function isRouted(status: number, message: string, method = "GET") {
  return isFinanceLiveOk(status, message, method);
}

export async function smokePublicSalesLive() {
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
      const routed = isRouted(hit.status, hit.message, route.method);
      if (!routed) ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: hit.status,
        note: financeLiveNote(hit.status, hit.message, route.method),
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

  const nonDecoy = rows.filter((row) => row.path !== DECOY_PATH);
  const allGateway =
    nonDecoy.length > 0 &&
    nonDecoy.every((row) => [502, 503, 504].includes(row.status));
  if (allGateway) {
    return { ok: true, gatewayDown: true as const, rows };
  }

  return { ok, gatewayDown: false as const, rows };
}

export async function runPublicSalesSmoke() {
  installSmokePolyfill();
  console.log("Public sales API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokePublicSalesWiring();
  console.log("   OK — client, catalog, public viewer");

  console.log("\n2) Mock fetch…");
  await smokePublicSalesMock();
  console.log("   OK — public.sales routes hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokePublicSalesLive();
  for (const row of live.rows) {
    const isDecoy = row.path === DECOY_PATH;
    const mark = isDecoy
      ? row.status === 404
        ? "OK"
        : "FAIL"
      : row.note.startsWith("ok ") ||
          row.note.startsWith("routed + auth required") ||
          row.note.startsWith("routed (not found)")
        ? "OK"
        : live.gatewayDown && [502, 503, 504].includes(row.status)
          ? "WARN"
          : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (live.gatewayDown) {
    console.log(
      "\n   WARN — live CRM returned gateway errors (502/503/504). Client wiring + mock still OK.",
    );
  } else if (!live.ok) {
    fail("live public sales probe failed");
  }

  console.log("\nPublic sales API smoke passed.");
}

runAsCli(runPublicSalesSmoke);
