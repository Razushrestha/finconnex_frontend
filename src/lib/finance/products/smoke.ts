/**
 * Cross-check Products Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/finance/products/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  createCrmProduct,
  deleteCrmProduct,
  getCrmProduct,
  listCrmProducts,
  normalizeProduct,
  productsPath,
  updateCrmProduct,
} from "@/lib/finance/products/api";
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
const DECOY_PATH = "/v1/__no_such_module_products_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/products" },
  { method: "GET", path: `/v1/products/${ID}` },
  { method: "POST", path: "/v1/products" },
  { method: "PATCH", path: `/v1/products/${ID}` },
  { method: "DELETE", path: `/v1/products/${ID}` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeProductsWiring() {
  const api = readSrc("src/lib/finance/products/api.ts");
  for (const name of [
    "listCrmProducts",
    "getCrmProduct",
    "createCrmProduct",
    "updateCrmProduct",
    "deleteCrmProduct",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`products client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/products${suffix}`")) {
    fail("products client missing /v1/products path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/products"',
    'path: "/products/:id"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/finance/products/page.tsx");
  if (!page.includes("useCrmProducts")) {
    fail("products page does not call useCrmProducts");
  }

  const createForm = readSrc("src/components/finance/products/CreateProductForm.tsx");
  if (!createForm.includes("createCrmProduct")) {
    fail("create product form does not call createCrmProduct");
  }

  const hook = readSrc("src/lib/finance/products/use-crm-products.ts");
  if (!hook.includes("replaceCrmProducts")) {
    fail("products hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("products hook must mark a successful empty list as Live CRM");
  }

  const normalized = normalizeProduct(
    {
      id: ID,
      sku: "SVC-PACK",
      name: "Loan Packaging",
      type: "SERVICE",
      status: "ACTIVE",
      unitPrice: 1200,
      taxRate: 10,
      unit: "job",
    },
    0,
  );
  if (normalized.name !== "Loan Packaging" || normalized.unitPrice !== 1200) {
    fail("normalizeProduct did not map name/unitPrice");
  }
  if (normalized.type !== "Service" || normalized.status !== "Active") {
    fail("normalizeProduct did not map type/status");
  }
}

export async function smokeProductsMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const raw = typeof input === "string" ? input : (input as Request).url ?? String(input);
    const parsed = new URL(raw, SESSION.baseUrl);
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          items: [
            {
              id: ID,
              sku: "SVC-PACK",
              name: "Loan Packaging",
              type: "SERVICE",
              status: "ACTIVE",
              unitPrice: 1200,
            },
          ],
          count: 1,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmProducts();
    await getCrmProduct(ID);
    await createCrmProduct({ name: "Loan Packaging", unitPrice: 1200 });
    await updateCrmProduct(ID, { unitPrice: 1300 });
    await deleteCrmProduct(ID);

    const expected = [
      `GET ${productsPath()}`,
      `GET ${productsPath(`/${ID}`)}`,
      `POST ${productsPath()}`,
      `PATCH ${productsPath(`/${ID}`)}`,
      `DELETE ${productsPath(`/${ID}`)}`,
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

export async function smokeProductsLive() {
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

export async function runProductsSmoke() {
  installSmokePolyfill();
  console.log("Products API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeProductsWiring();
  console.log("   OK — client, catalog, page, form");

  console.log("\n2) Mock fetch…");
  await smokeProductsMock();
  console.log("   OK — products routes hit");

  console.log("\n3) Live CRM probe (decoy 404 vs products 401)…");
  const live = await smokeProductsLive();
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
  if (!live.ok) fail("live products probe failed");

  console.log("\nProducts API smoke passed.");
}

runAsCli(runProductsSmoke);
