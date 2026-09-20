/**
 * Cross-check Payments Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/finance/payments/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  createCrmPayment,
  deleteCrmPayment,
  getCrmPayment,
  listCrmPayments,
  normalizePayment,
  paymentsPath,
  refundCrmPayment,
  updateCrmPayment,
} from "@/lib/finance/payments/api";
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
const DECOY_PATH = "/v1/__no_such_module_payments_probe__";

/** All 5 Swagger payment routes (DELETE = refund). */
const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/payments" },
  { method: "GET", path: `/v1/payments/${ID}` },
  { method: "POST", path: "/v1/payments" },
  { method: "PATCH", path: `/v1/payments/${ID}` },
  { method: "DELETE", path: `/v1/payments/${ID}` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokePaymentsWiring() {
  const api = readSrc("src/lib/finance/payments/api.ts");
  for (const name of [
    "listCrmPayments",
    "getCrmPayment",
    "createCrmPayment",
    "updateCrmPayment",
    "deleteCrmPayment",
    "refundCrmPayment",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`payments client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/payments${suffix}`")) {
    fail("payments client missing /v1/payments path");
  }

  if (!api.includes("crmWorkspaceFetch")) {
    fail("payments client must use crmWorkspaceFetch (BFF) for live 200s");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/payments"',
    'path: "/payments/:id"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }
  if (!catalog.includes('module: "payments"')) {
    fail("endpoint catalog missing payments module");
  }
  if (!catalog.includes("Refund a payment") && !catalog.includes("Record payment")) {
    fail("endpoint catalog missing payments route notes");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"payments"')) {
    fail("BFF proxy ALLOWED_ROOTS must include payments");
  }

  if (LIVE_ROUTES.length !== 5) {
    fail(
      `smoke LIVE_ROUTES must cover all 5 Swagger payment routes (got ${LIVE_ROUTES.length})`,
    );
  }

  const page = readSrc("src/app/(dashboard)/finance/payments/page.tsx");
  if (!page.includes("useCrmPayments")) {
    fail("payments page does not call useCrmPayments");
  }

  const createForm = readSrc(
    "src/components/finance/payments/CreatePaymentForm.tsx",
  );
  if (!createForm.includes("createCrmPayment")) {
    fail("create payment form does not call createCrmPayment");
  }

  const detail = readSrc(
    "src/components/finance/payments/PaymentDetailClient.tsx",
  );
  for (const name of [
    "getCrmPayment",
    "updateCrmPayment",
    "refundCrmPayment",
  ]) {
    if (!detail.includes(name)) {
      fail(`payment detail client does not call ${name}`);
    }
  }

  const hook = readSrc("src/lib/finance/payments/use-crm-payments.ts");
  if (!hook.includes("replaceCrmPayments")) {
    fail("payments hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("payments hook must mark a successful empty list as Live CRM");
  }

  const normalized = normalizePayment(
    {
      id: ID,
      paymentNumber: "PAY-9999",
      invoiceId: "inv-123",
      amount: 450,
      paymentMethod: "STRIPE",
      status: "COMPLETED",
      reference: "txn_123",
      notes: "Settlement",
      paymentDate: "2026-08-15T10:00:00.000Z",
    },
    0,
  );
  if (normalized.paymentId !== "PAY-9999" || normalized.amount !== 450) {
    fail("normalizePayment did not map paymentNumber/amount");
  }
  if (normalized.method !== "Stripe" || normalized.status !== "Completed") {
    fail("normalizePayment did not map paymentMethod/status");
  }
}

export async function smokePaymentsMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const raw =
      typeof input === "string"
        ? input
        : ((input as Request).url ?? String(input));
    const parsed = new URL(raw, SESSION.baseUrl);
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          items: [
            {
              id: ID,
              paymentNumber: "PAY-1001",
              amount: 500,
              paymentMethod: "BANK_TRANSFER",
              status: "COMPLETED",
            },
          ],
          count: 1,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmPayments();
    await getCrmPayment(ID);
    await createCrmPayment({ invoiceId: "inv-1", amount: 500 });
    await updateCrmPayment(ID, { amount: 550 });
    await refundCrmPayment(ID);

    const expected = [
      `GET ${paymentsPath()}`,
      `GET ${paymentsPath(`/${ID}`)}`,
      `POST ${paymentsPath()}`,
      `PATCH ${paymentsPath(`/${ID}`)}`,
      `DELETE ${paymentsPath(`/${ID}`)}`,
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
  if (hit.status === 502 || hit.status === 503 || hit.status === 504) {
    await new Promise((r) => setTimeout(r, 800));
    hit = await send();
  }
  return hit;
}

function isAuthRequired(status: number, message: string, method = "GET") {
  return isFinanceLiveOk(status, message, method);
}

export async function smokePaymentsLive() {
  const base = (
    getCrmApiBaseUrl() || "https://finconnex.payperless.app"
  ).replace(/\/$/, "");
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
    nonDecoy.every((row) => [502, 503, 504].includes(row.status));
  if (allGateway) {
    return { ok: true, gatewayDown: true as const, rows };
  }

  return { ok, gatewayDown: false as const, rows };
}

export async function runPaymentsSmoke() {
  installSmokePolyfill();
  console.log("Payments API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokePaymentsWiring();
  console.log("   OK — client, catalog, page, form, detail");

  console.log("\n2) Mock fetch…");
  await smokePaymentsMock();
  console.log("   OK — all 5 Swagger routes hit");

  console.log("\n3) Live CRM probe (decoy 404 vs payments 401)…");
  const live = await smokePaymentsLive();
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
    fail("live payments probe failed");
  }

  console.log("\nPayments API smoke passed.");
}

runAsCli(runPaymentsSmoke);
