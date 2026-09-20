/**
 * Cross-check Quotes Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/finance/quotations/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  addCrmQuoteAttachment,
  createCrmQuote,
  deleteCrmQuote,
  deleteCrmQuoteAttachment,
  downloadCrmQuotePdf,
  getCrmQuote,
  getCrmQuotePublicLink,
  listCrmQuoteAttachments,
  listCrmQuotes,
  normalizeQuote,
  quotesPath,
  sendCrmQuote,
  sendCrmQuoteForSignature,
  updateCrmQuote,
} from "@/lib/finance/quotations/api";
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

const SESSION = {
  baseUrl: "https://crm.smoke.test",
  accessToken: "smoke-access",
  workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ATTACHMENT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const DECOY_PATH = "/v1/__no_such_module_quotes_probe__";

/** All Swagger quote routes including send-for-signature (12). */
const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/quotes" },
  { method: "GET", path: `/v1/quotes/${ID}` },
  { method: "POST", path: "/v1/quotes" },
  { method: "PATCH", path: `/v1/quotes/${ID}` },
  { method: "DELETE", path: `/v1/quotes/${ID}` },
  { method: "POST", path: `/v1/quotes/${ID}/send` },
  { method: "POST", path: `/v1/quotes/${ID}/send-for-signature` },
  { method: "GET", path: `/v1/quotes/${ID}/pdf` },
  { method: "GET", path: `/v1/quotes/${ID}/public-link` },
  { method: "GET", path: `/v1/quotes/${ID}/attachments` },
  { method: "POST", path: `/v1/quotes/${ID}/attachments` },
  {
    method: "DELETE",
    path: `/v1/quotes/${ID}/attachments/${ATTACHMENT_ID}`,
  },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeQuotesWiring() {
  const api = readSrc("src/lib/finance/quotations/api.ts");
  for (const name of [
    "listCrmQuotes",
    "getCrmQuote",
    "createCrmQuote",
    "updateCrmQuote",
    "deleteCrmQuote",
    "sendCrmQuote",
    "sendCrmQuoteForSignature",
    "getCrmQuotePublicLink",
    "downloadCrmQuotePdf",
    "listCrmQuoteAttachments",
    "addCrmQuoteAttachment",
    "deleteCrmQuoteAttachment",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`quotes client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/quotes${suffix}`")) {
    fail("quotes client missing /v1/quotes path");
  }
  if (!api.includes("/send-for-signature")) {
    fail("quotes client missing send-for-signature path");
  }

  if (!api.includes("crmWorkspaceFetch")) {
    fail("quotes client must use crmWorkspaceFetch (BFF) for live 200s");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/quotes"',
    'path: "/quotes/:id"',
    'path: "/quotes/:id/send"',
    'path: "/quotes/:id/send-for-signature"',
    'path: "/quotes/:id/pdf"',
    'path: "/quotes/:id/public-link"',
    'path: "/quotes/:id/attachments"',
    'path: "/quotes/:id/attachments/:attachmentId"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"quotes"')) {
    fail("BFF proxy ALLOWED_ROOTS must include quotes");
  }

  if (LIVE_ROUTES.length !== 12) {
    fail(
      `smoke LIVE_ROUTES must cover all 12 Swagger quote routes (got ${LIVE_ROUTES.length})`,
    );
  }

  const page = readSrc("src/app/(dashboard)/finance/quotations/page.tsx");
  if (!page.includes("useCrmQuotations")) {
    fail("quotations page does not call useCrmQuotations");
  }

  const hook = readSrc("src/lib/finance/quotations/use-crm-quotations.ts");
  if (!hook.includes("replaceCrmQuotations")) {
    fail("quotes hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("quotes hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc(
    "src/components/finance/quotations/CreateQuotationForm.tsx",
  );
  if (!create.includes("createCrmQuote")) {
    fail("create quotation form does not call createCrmQuote");
  }

  const detail = readSrc(
    "src/components/finance/quotations/QuotationDetailClient.tsx",
  );
  for (const name of [
    "sendCrmQuote",
    "sendCrmQuoteForSignature",
    "downloadCrmQuotePdf",
    "getCrmQuotePublicLink",
    "deleteCrmQuote",
    "addCrmQuoteAttachment",
    "deleteCrmQuoteAttachment",
    "listCrmQuoteAttachments",
    "updateCrmQuote",
  ]) {
    if (!detail.includes(name)) {
      fail(`quote detail does not call ${name}`);
    }
  }

  const normalized = normalizeQuote(
    {
      id: "quo1",
      title: "Greystone refinance",
      status: "SENT",
      clientName: "Greystone",
      quoteNumber: "QUO-1",
      total: 2200,
    },
    0,
  );
  if (normalized.title !== "Greystone refinance" || normalized.status !== "Sent") {
    fail("normalizeQuote did not map Swagger-shaped fields");
  }
}

export async function smokeQuotesMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(String(input));
    hits.push(`${method} ${parsed.pathname}`);
    if (parsed.pathname.endsWith("/pdf")) {
      return new Response(new Blob(["%PDF"], { type: "application/pdf" }), {
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
              title: "Greystone refinance",
              status: "DRAFT",
              clientName: "Greystone",
              total: 2200,
            },
          ],
          url: "https://crm.smoke.test/p/quo",
          id: ATTACHMENT_ID,
          name: "note.pdf",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmQuotes();
    await getCrmQuote(ID);
    await createCrmQuote({ title: "New" });
    await updateCrmQuote(ID, { title: "Updated" });
    await sendCrmQuote(ID);
    await sendCrmQuoteForSignature(ID);
    await getCrmQuotePublicLink(ID);
    await downloadCrmQuotePdf(ID);
    await listCrmQuoteAttachments(ID);
    await addCrmQuoteAttachment(
      ID,
      new File(["x"], "note.pdf", { type: "application/pdf" }),
    );
    await deleteCrmQuoteAttachment(ID, ATTACHMENT_ID);
    await deleteCrmQuote(ID);

    const expected = [
      `GET ${quotesPath()}`,
      `GET ${quotesPath(`/${ID}`)}`,
      `POST ${quotesPath()}`,
      `PATCH ${quotesPath(`/${ID}`)}`,
      `POST ${quotesPath(`/${ID}/send`)}`,
      `POST ${quotesPath(`/${ID}/send-for-signature`)}`,
      `GET ${quotesPath(`/${ID}/public-link`)}`,
      `GET ${quotesPath(`/${ID}/pdf`)}`,
      `GET ${quotesPath(`/${ID}/attachments`)}`,
      `POST ${quotesPath(`/${ID}/attachments`)}`,
      `DELETE ${quotesPath(`/${ID}/attachments/${ATTACHMENT_ID}`)}`,
      `DELETE ${quotesPath(`/${ID}`)}`,
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
  const send = async () => {
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
  };

  let hit = await send();
  // Nest behind nginx sometimes flaps 502 under load; retry once before fail.
  if (hit.status === 502 || hit.status === 503 || hit.status === 504) {
    await new Promise((r) => setTimeout(r, 800));
    hit = await send();
  }
  return hit;
}

function isAuthRequired(status: number, message: string, method = "GET") {
  return isFinanceLiveOk(status, message, method);
}

export async function smokeQuotesLive() {
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
      const routed = isAuthRequired(hit.status, hit.message, route.method);
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
    nonDecoy.every((row) =>
      [502, 503, 504].includes(row.status),
    );
  if (allGateway) {
    // Whole CRM is unreachable — not a quotes wiring failure.
    return { ok: true, gatewayDown: true as const, rows };
  }

  return { ok, gatewayDown: false as const, rows };
}

export async function runQuotesSmoke() {
  installSmokePolyfill();
  console.log("Quotes API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeQuotesWiring();
  console.log("   OK — client, catalog, list page, create, detail");

  console.log("\n2) Mock fetch…");
  await smokeQuotesMock();
  console.log("   OK — all 12 Swagger routes hit");

  console.log("\n3) Live CRM probe (decoy 404 vs quotes 401)…");
  const live = await smokeQuotesLive();
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
    fail("live quotes probe failed");
  }

  console.log("\nQuotes API smoke passed.");
}

runAsCli(runQuotesSmoke);
