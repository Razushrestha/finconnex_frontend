/**
 * Cross-check Companies CRM routes from live Swagger.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/companies/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  bulkCrmCompanies,
  companiesPath,
  createCrmCompany,
  deleteCrmCompany,
  exportCrmCompanies,
  getCrmCompany,
  getCrmCompanyTransfer,
  importCrmCompanies,
  listCrmCompanies,
  mergeCrmCompanies,
  normalizeCrmCompany,
  updateCrmCompany,
} from "@/lib/companies/api";
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
const SOURCE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TRANSFER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/companies" },
  { method: "GET", path: `/v1/companies/${ID}` },
  { method: "GET", path: `/v1/companies/transfers/${TRANSFER_ID}` },
  { method: "POST", path: "/v1/companies" },
  { method: "PATCH", path: `/v1/companies/${ID}` },
  { method: "DELETE", path: `/v1/companies/${ID}` },
  { method: "POST", path: "/v1/companies/bulk" },
  { method: "POST", path: "/v1/companies/import" },
  { method: "POST", path: "/v1/companies/export" },
  { method: "POST", path: `/v1/companies/${ID}/merge` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeCompaniesWiring() {
  const api = readSrc("src/lib/companies/api.ts");
  for (const name of [
    "listCrmCompanies",
    "getCrmCompany",
    "getCrmCompanyTransfer",
    "createCrmCompany",
    "updateCrmCompany",
    "deleteCrmCompany",
    "bulkCrmCompanies",
    "importCrmCompanies",
    "exportCrmCompanies",
    "mergeCrmCompanies",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`companies client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/companies${suffix}`")) {
    fail("companies client missing /v1/companies path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/companies"',
    'path: "/companies/:id"',
    'path: "/companies/bulk"',
    'path: "/companies/import"',
    'path: "/companies/export"',
    'path: "/companies/:id/merge"',
    'path: "/companies/transfers/:transferId"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/sales/companies/page.tsx");
  if (!page.includes("useCrmCompanies")) {
    fail("companies page does not call useCrmCompanies");
  }
  if (!page.includes("exportCrmCompanies")) {
    fail("companies page does not call exportCrmCompanies");
  }

  const store = readSrc("src/lib/companies/store.ts");
  if (!store.includes("createCrmCompany")) {
    fail("companies store does not sync create to CRM");
  }
  if (!store.includes("deleteCrmCompany")) {
    fail("companies store does not sync delete to CRM");
  }
  if (!store.includes("updateCrmCompany")) {
    fail("companies store does not sync update to CRM");
  }

  const merge = readSrc("src/lib/sales/merge.ts");
  if (!merge.includes("mergeCrmCompanies")) {
    fail("mergeCompanies does not call mergeCrmCompanies");
  }

  const kanban = readSrc(
    "src/components/sales/companies/CompaniesKanbanBoard.tsx",
  );
  if (!kanban.includes("updateCrmCompany")) {
    fail("kanban board does not sync status moves to CRM");
  }

  const normalized = normalizeCrmCompany(
    {
      id: "c1",
      name: "Acme Corp",
      status: "CUSTOMER",
      website: "https://acme.example",
      industry: "Technology",
      ownerName: "Ada",
    },
    0,
  );
  if (
    normalized.company.name !== "Acme Corp" ||
    normalized.status !== "Customer"
  ) {
    fail("normalizeCrmCompany did not map Swagger-shaped fields");
  }
}

export async function smokeCompaniesMock() {
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
              name: "Acme Corp",
              status: "CUSTOMER",
              website: "https://acme.example",
              industry: "Technology",
              ownerName: "Ada",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmCompanies();
    await getCrmCompany(ID);
    await getCrmCompanyTransfer(TRANSFER_ID);
    await createCrmCompany({
      name: "New Co",
      status: "Prospect",
      owner: "Ada",
    });
    await updateCrmCompany(ID, { name: "Acme Updated", status: "Active" });
    await bulkCrmCompanies({ ids: [ID], operation: "DELETE" });
    await importCrmCompanies({ rows: [{ name: "Import Co" }] });
    await exportCrmCompanies({ ids: [ID] });
    await mergeCrmCompanies({ survivorId: ID, sourceId: SOURCE_ID });
    await deleteCrmCompany(ID);

    const expected = [
      `GET ${companiesPath()}`,
      `GET ${companiesPath(`/${ID}`)}`,
      `GET ${companiesPath(`/transfers/${TRANSFER_ID}`)}`,
      `POST ${companiesPath()}`,
      `PATCH ${companiesPath(`/${ID}`)}`,
      `POST ${companiesPath("/bulk")}`,
      `POST ${companiesPath("/import")}`,
      `POST ${companiesPath("/export")}`,
      `POST ${companiesPath(`/${ID}/merge`)}`,
      `DELETE ${companiesPath(`/${ID}`)}`,
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

export async function smokeCompaniesLive(): Promise<{
  ok: boolean;
  rows: Array<{ method: string; path: string; status: number; note: string }>;
}> {
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

  for (const route of LIVE_ROUTES) {
    try {
      const res = await fetch(`${base}${route.path}`, {
        method: route.method,
        headers: {
          Accept: "application/json",
          ...(route.method === "POST" || route.method === "PATCH"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body:
          route.method === "POST" || route.method === "PATCH" ? "{}" : undefined,
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

export async function runCompaniesSmoke() {
  installSmokePolyfill();
  console.log("Companies API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeCompaniesWiring();
  console.log("   OK — companies client, catalog, page, store, merge, kanban");

  console.log("\n2) Mock fetch…");
  await smokeCompaniesMock();
  console.log("   OK — list/get/create/update/bulk/import/export/merge/delete");

  console.log("\n3) Live CRM probe…");
  const live = await smokeCompaniesLive();
  for (const row of live.rows) {
    const mark =
      row.status !== 404 && row.status !== 405 && row.status !== 0
        ? "OK"
        : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (!live.ok) fail("one or more live companies routes are missing");

  console.log("\nCompanies API smoke passed.");
}

runAsCli(runCompaniesSmoke);
