/**
 * Cross-check Calculator CRM routes from live Swagger.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/calculator/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  calculationsPath,
  createCrmCalculation,
  deleteCrmCalculation,
  getCrmCalculation,
  listCrmCalculations,
  mapCalculatorType,
  toCreateCalculationBody,
} from "@/lib/calculator/api";
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

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/calculations" },
  { method: "POST", path: "/v1/calculations" },
  { method: "GET", path: `/v1/calculations/${ID}` },
  { method: "DELETE", path: `/v1/calculations/${ID}` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeCalculationsWiring() {
  const api = readSrc("src/lib/calculator/api.ts");
  for (const name of [
    "listCrmCalculations",
    "getCrmCalculation",
    "createCrmCalculation",
    "deleteCrmCalculation",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`calculations client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/calculations${suffix}`")) {
    fail("calculations client missing /v1/calculations path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/calculations"',
    'path: "/calculations/:id"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"calculations"')) {
    fail("BFF proxy does not allow /v1/calculations");
  }

  const loan = readSrc("src/components/calculator/LoanRepaymentsView.tsx");
  if (!loan.includes("persistCalculatorResult")) {
    fail("Loan repayments does not POST saved calculations");
  }
  const history = readSrc("src/app/(dashboard)/calculator/history/page.tsx");
  if (!history.includes("loadCalculatorHistory")) {
    fail("history page does not GET /v1/calculations");
  }
  if (!history.includes("removeCalculatorRecord")) {
    fail("history page does not DELETE /v1/calculations/:id");
  }
  if (!history.includes("getCrmCalculation")) {
    fail("history page does not GET /v1/calculations/:id");
  }

  if (mapCalculatorType("LOAN") !== "Loan") {
    fail("mapCalculatorType did not map LOAN");
  }
  const body = toCreateCalculationBody({
    title: "Harbour loan",
    type: "Loan",
    currency: "AUD",
    inputs: { principal: "500000" },
    result: {
      primaryLabel: "Monthly",
      primaryValue: 1,
      primaryFormat: "money",
      formula: "PMT",
      lines: [],
    },
    formula: "PMT",
  });
  if (body.type !== "LOAN" || "sharedWith" in body) {
    fail("create body must send LOAN and omit empty sharedWith");
  }
}

export async function smokeCalculationsMock() {
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
              title: "Harbour loan",
              type: "LOAN",
              currency: "AUD",
              inputs: { principal: "500000" },
              result: { primaryLabel: "Monthly", primaryValue: 3060, primaryFormat: "money", lines: [] },
            },
          ],
          id: ID,
          title: "Harbour loan",
          type: "LOAN",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmCalculations();
    await getCrmCalculation(ID);
    await createCrmCalculation({ title: "Harbour loan", type: "LOAN" });
    await deleteCrmCalculation(ID);
    const expected = [
      `GET ${calculationsPath()}?limit=100`,
      `GET ${calculationsPath(`/${ID}`)}`,
      `POST ${calculationsPath()}`,
      `DELETE ${calculationsPath(`/${ID}`)}`,
    ];
    for (const hit of expected) {
      if (!hits.includes(hit) && !hits.some((h) => h.startsWith(hit.split("?")[0]))) {
        fail(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
    if (!hits.includes(`DELETE ${calculationsPath(`/${ID}`)}`)) {
      fail(`mock fetch missed DELETE (got ${hits.join(", ")})`);
    }
  } finally {
    bindCrmSession(null);
    globalThis.fetch = origFetch;
  }
}

export async function smokeCalculationsLive() {
  const base = (getCrmApiBaseUrl() || "https://finconnex.payperless.app").replace(
    /\/$/,
    "",
  );
  const rows: Array<{ method: string; path: string; status: number; note: string }> =
    [];
  let ok = true;
  for (const route of LIVE_ROUTES) {
    try {
      const res = await fetch(`${base}${route.path}`, {
        method: route.method,
        headers: {
          Accept: "application/json",
          ...(route.method === "POST"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body: route.method === "POST" ? JSON.stringify({ title: "smoke" }) : undefined,
      });
      const routed = res.status !== 404 && res.status !== 405;
      if (!routed) ok = false;
      rows.push({
        method: route.method,
        path: route.path,
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
        method: route.method,
        path: route.path,
        status: 0,
        note: err instanceof Error ? err.message : "network error",
      });
    }
  }
  return { ok, rows };
}

export async function runCalculationsSmoke() {
  installSmokePolyfill();
  console.log("Calculations API smoke…");
  smokeCalculationsWiring();
  console.log("   OK — client, catalog, BFF, loan save, history list/delete");
  await smokeCalculationsMock();
  console.log("   OK — GET list/get, POST save, DELETE soft-delete");
  const live = await smokeCalculationsLive();
  for (const row of live.rows) {
    const mark =
      row.status !== 404 && row.status !== 405 && row.status !== 0 ? "OK" : "FAIL";
    console.log(`   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`);
  }
  if (!live.ok) fail("one or more live calculations routes are missing");
  console.log("\nCalculations API smoke passed.");
}

runAsCli(runCalculationsSmoke);
