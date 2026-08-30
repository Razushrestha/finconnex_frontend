/**
 * Cross-check Invoices Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/finance/invoices/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  addCrmInvoiceAttachment,
  createCrmInvoice,
  createCrmInvoiceStripePayment,
  deleteCrmInvoice,
  deleteCrmInvoiceAttachment,
  downloadCrmInvoicePdf,
  getCrmInvoice,
  getCrmInvoicePublicLink,
  invoicesPath,
  listCrmInvoiceAttachments,
  listCrmInvoices,
  normalizeInvoice,
  sendCrmInvoice,
  updateCrmInvoice,
} from "@/lib/finance/invoices/api";
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
const DECOY_PATH = "/v1/__no_such_module_invoices_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/invoices" },
  { method: "GET", path: `/v1/invoices/${ID}` },
  { method: "POST", path: "/v1/invoices" },
  { method: "PATCH", path: `/v1/invoices/${ID}` },
  { method: "DELETE", path: `/v1/invoices/${ID}` },
  { method: "POST", path: `/v1/invoices/${ID}/send` },
  { method: "GET", path: `/v1/invoices/${ID}/pdf` },
  { method: "GET", path: `/v1/invoices/${ID}/public-link` },
  { method: "GET", path: `/v1/invoices/${ID}/attachments` },
  { method: "POST", path: `/v1/invoices/${ID}/attachments` },
  {
    method: "DELETE",
    path: `/v1/invoices/${ID}/attachments/${ATTACHMENT_ID}`,
  },
  { method: "POST", path: `/v1/invoices/${ID}/payments/stripe` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeInvoicesWiring() {
  const api = readSrc("src/lib/finance/invoices/api.ts");
  for (const name of [
    "listCrmInvoices",
    "getCrmInvoice",
    "createCrmInvoice",
    "updateCrmInvoice",
    "deleteCrmInvoice",
    "sendCrmInvoice",
    "getCrmInvoicePublicLink",
    "downloadCrmInvoicePdf",
    "listCrmInvoiceAttachments",
    "addCrmInvoiceAttachment",
    "deleteCrmInvoiceAttachment",
    "createCrmInvoiceStripePayment",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`invoices client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/invoices${suffix}`")) {
    fail("invoices client missing /v1/invoices path");
  }
  if (api.includes("/restore")) {
    fail("invoices Swagger has no restore route");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/invoices"',
    'path: "/invoices/:id"',
    'path: "/invoices/:id/send"',
    'path: "/invoices/:id/pdf"',
    'path: "/invoices/:id/public-link"',
    'path: "/invoices/:id/attachments"',
    'path: "/invoices/:id/attachments/:attachmentId"',
    'path: "/invoices/:id/payments/stripe"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/finance/invoices/page.tsx");
  if (!page.includes("useCrmInvoices")) {
    fail("invoices page does not call useCrmInvoices");
  }

  const hook = readSrc("src/lib/finance/invoices/use-crm-invoices.ts");
  if (!hook.includes("replaceCrmInvoices")) {
    fail("invoices hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("invoices hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc("src/components/finance/invoices/CreateInvoiceForm.tsx");
  if (!create.includes("createCrmInvoice")) {
    fail("create invoice form does not call createCrmInvoice");
  }

  const detail = readSrc(
    "src/components/finance/invoices/InvoiceDetailClient.tsx",
  );
  for (const name of [
    "sendCrmInvoice",
    "downloadCrmInvoicePdf",
    "getCrmInvoicePublicLink",
    "deleteCrmInvoice",
    "addCrmInvoiceAttachment",
    "createCrmInvoiceStripePayment",
  ]) {
    if (!detail.includes(name)) {
      fail(`invoice detail does not call ${name}`);
    }
  }

  const normalized = normalizeInvoice(
    {
      id: "inv1",
      title: "Greystone refinance",
      status: "PARTIALLY_PAID",
      clientName: "Greystone",
      total: 2200,
      amountPaid: 1500,
    },
    0,
  );
  if (
    normalized.title !== "Greystone refinance" ||
    normalized.status !== "Partially Paid"
  ) {
    fail("normalizeInvoice did not map Swagger-shaped fields");
  }
}

export async function smokeInvoicesMock() {
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
          url: "https://crm.smoke.test/p/inv",
          id: ATTACHMENT_ID,
          name: "note.pdf",
          clientSecret: "pi_smoke_secret",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmInvoices();
    await getCrmInvoice(ID);
    await createCrmInvoice({ title: "New" });
    await updateCrmInvoice(ID, { title: "Updated" });
    await sendCrmInvoice(ID);
    await getCrmInvoicePublicLink(ID);
    await downloadCrmInvoicePdf(ID);
    await listCrmInvoiceAttachments(ID);
    await addCrmInvoiceAttachment(
      ID,
      new File(["x"], "note.pdf", { type: "application/pdf" }),
    );
    await deleteCrmInvoiceAttachment(ID, ATTACHMENT_ID);
    await createCrmInvoiceStripePayment(ID, { amount: 100 });
    await deleteCrmInvoice(ID);

    const expected = [
      `GET ${invoicesPath()}`,
      `GET ${invoicesPath(`/${ID}`)}`,
      `POST ${invoicesPath()}`,
      `PATCH ${invoicesPath(`/${ID}`)}`,
      `POST ${invoicesPath(`/${ID}/send`)}`,
      `GET ${invoicesPath(`/${ID}/public-link`)}`,
      `GET ${invoicesPath(`/${ID}/pdf`)}`,
      `GET ${invoicesPath(`/${ID}/attachments`)}`,
      `POST ${invoicesPath(`/${ID}/attachments`)}`,
      `DELETE ${invoicesPath(`/${ID}/attachments/${ATTACHMENT_ID}`)}`,
      `POST ${invoicesPath(`/${ID}/payments/stripe`)}`,
      `DELETE ${invoicesPath(`/${ID}`)}`,
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

export async function smokeInvoicesLive() {
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

export async function runInvoicesSmoke() {
  installSmokePolyfill();
  console.log("Invoices API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeInvoicesWiring();
  console.log("   OK — client, catalog, list page, create, detail");

  console.log("\n2) Mock fetch…");
  await smokeInvoicesMock();
  console.log("   OK — all 12 Swagger routes hit");

  console.log("\n3) Live CRM probe (decoy 404 vs invoices 401)…");
  const live = await smokeInvoicesLive();
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
  if (!live.ok) fail("live invoices probe failed");

  console.log("\nInvoices API smoke passed.");
}

runAsCli(runInvoicesSmoke);
