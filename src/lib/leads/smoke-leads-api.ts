/**
 * Lead API cross-check + smoke.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/leads/smoke-leads-api.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { CRM_LEAD_ENDPOINTS } from "@/lib/leads/api/catalog";
import {
  assignCrmLeadOwner,
  bindCrmLeadFetch,
  bindCrmLeadSession,
  bulkCrmLeads,
  changeCrmLeadLifecycleStage,
  changeCrmLeadRating,
  changeCrmLeadScore,
  changeCrmLeadStatus,
  convertCrmLead,
  createCrmLead,
  fetchLeadById,
  fetchLeadKanban,
  fetchLeadList,
  importCrmLeads,
  importCrmLeadsFromAds,
  importCrmLeadsFromSheets,
  fetchLeadConversations,
  postLeadConversation,
  fetchLeadCreditReport,
  linkCrmLeadCompany,
  softDeleteCrmLead,
  unassignCrmLeadOwner,
  unlinkCrmLeadCompany,
  updateCrmLead,
} from "@/lib/leads/api/client";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;
const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "33333333-3333-4333-8333-333333333333";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const DEAL_ID = "44444444-4444-4444-8444-444444444444";

const STUB_LEAD = {
  id: LEAD_ID,
  firstName: "Smoke",
  lastName: "Lead",
  email: "smoke.lead@example.com",
  status: "NEW",
};

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function normalizePath(url: string) {
  const u = new URL(url);
  return u.pathname.replace(/\/+$/, "") || "/";
}

function pathMatches(template: string, actual: string) {
  const expected = template.replace("{id}", LEAD_ID);
  if (actual === expected) return true;
  if (template === "/v1/leads" && actual === "/v1/leads") return true;
  if (template === "/v1/leads/kanban" && actual.startsWith("/v1/leads/kanban")) {
    return true;
  }
  return false;
}

export async function smokeLeadClientWiring() {
  const clientSrc = readFileSync(
    path.join(repoRoot(), "src/lib/leads/api/client.ts"),
    "utf8",
  );
  for (const ep of CRM_LEAD_ENDPOINTS) {
    const needle = ep.path.replace("{id}", "${id}");
    if (!clientSrc.includes(needle) && !clientSrc.includes(ep.path)) {
      fail(`client missing ${ep.method} ${ep.path}`);
    }
    if (!clientSrc.includes(`export async function ${ep.client}`)) {
      fail(`client missing function ${ep.client}`);
    }
  }
  if (CRM_LEAD_ENDPOINTS.length < 17) {
    fail(`expected at least 17 swagger lead routes, got ${CRM_LEAD_ENDPOINTS.length}`);
  }

  const catalog = readFileSync(
    path.join(repoRoot(), "src/lib/api/endpoints.ts"),
    "utf8",
  );
  for (const fragment of [
    'path: "/leads"',
    'path: "/leads/kanban"',
    'path: "/leads/:id"',
    'path: "/leads/:id/owner"',
    'path: "/leads/:id/company"',
    'path: "/leads/:id/status"',
    'path: "/leads/:id/lifecycle-stage"',
    'path: "/leads/:id/rating"',
    'path: "/leads/:id/score"',
    'path: "/leads/bulk"',
    'path: "/leads/import"',
    'path: "/leads/import/ads"',
    'path: "/leads/import/sheets"',
    'path: "/leads/:id/conversations"',
    'path: "/leads/:id/credit-report"',
    'path: "/leads/:id/convert"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readFileSync(
    path.join(repoRoot(), "src/app/(dashboard)/sales/leads/page.tsx"),
    "utf8",
  );
  if (!page.includes("refreshCrmLeadsBoard")) {
    fail("leads page does not call refreshCrmLeadsBoard");
  }
  if (!page.includes("bulkCrmLeads")) {
    fail("leads page does not call bulkCrmLeads");
  }

  const create = readFileSync(
    path.join(repoRoot(), "src/components/sales/leads/CreateLeadForm.tsx"),
    "utf8",
  );
  if (!create.includes("syncCreatedLead")) {
    fail("CreateLeadForm does not call syncCreatedLead");
  }

  const kanban = readFileSync(
    path.join(repoRoot(), "src/components/sales/leads/LeadKanbanBoard.tsx"),
    "utf8",
  );
  if (!kanban.includes("syncLeadStatus")) {
    fail("LeadKanbanBoard does not call syncLeadStatus");
  }

  const detail = readFileSync(
    path.join(repoRoot(), "src/components/sales/leads/LeadDetailView.tsx"),
    "utf8",
  );
  if (!detail.includes("convertCrmLead")) {
    fail("LeadDetailView does not call convertCrmLead");
  }
  for (const name of [
    "assignCrmLeadOwner",
    "unassignCrmLeadOwner",
    "linkCrmLeadCompany",
    "unlinkCrmLeadCompany",
    "changeCrmLeadLifecycleStage",
    "changeCrmLeadRating",
    "changeCrmLeadScore",
    "softDeleteCrmLead",
  ]) {
    if (!detail.includes(name)) {
      fail(`LeadDetailView does not call ${name}`);
    }
  }
  if (!clientSrc.includes("fetchLeadList")) {
    fail("refresh path must still use GET /v1/leads");
  }
}

export async function smokeLeadClientMock() {
  const hits: Array<{ method: string; path: string }> = [];

  bindCrmLeadSession({
    baseUrl: "https://crm.test",
    accessToken: "smoke-token",
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  });

  bindCrmLeadFetch(async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    hits.push({ method, path: normalizePath(url) });
    const body = { statusCode: 200, data: STUB_LEAD };
    if (url.includes("/bulk")) body.data = { affected: 1 } as never;
    if (url.includes("/kanban")) {
      body.data = [{ status: "NEW", records: [STUB_LEAD], total: 1 }] as never;
    }
    if (url.includes("/import")) {
      body.data = { created: 1, updated: 0, skipped: 0, errors: [] } as never;
    }
    if (url.includes("/conversations")) {
      body.data = { records: [], total: 0 } as never;
    }
    if (url.includes("/credit-report")) {
      body.data = { generatedAt: null, accounts: { active: 0, rows: [] } } as never;
    }
    if (url.match(/\/v1\/leads(\?|$)/) && method === "GET" && !url.includes(LEAD_ID)) {
      body.data = { items: [STUB_LEAD], metadata: { currentPage: 1, itemsPerPage: 20, totalItems: 1, totalPages: 1 } } as never;
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  await createCrmLead({
    firstName: "Smoke",
    lastName: "Lead",
    email: "smoke.lead@example.com",
  });
  await bulkCrmLeads({
    ids: [LEAD_ID],
    operation: "CHANGE_STATUS",
    status: "CONTACTED",
  });
  await importCrmLeads({
    rows: [
      {
        firstName: "Smoke",
        lastName: "Import",
        email: "smoke.import@example.com",
      },
    ],
    duplicateHandling: "SKIP",
  });
  await importCrmLeadsFromAds({
    platform: "meta",
    duplicateHandling: "SKIP",
    rows: [
      {
        firstName: "Ads",
        lastName: "Lead",
        email: "ads.lead@example.com",
      },
    ],
  });
  await importCrmLeadsFromSheets({
    spreadsheetId: "sheet-smoke",
    mapping: { Email: "email", First: "firstName", Last: "lastName" },
    duplicateHandling: "SKIP",
    records: [
      { Email: "sheet@example.com", First: "Sam", Last: "Sheet" },
    ],
  });
  await fetchLeadConversations(LEAD_ID, { limit: 20 });
  await postLeadConversation(LEAD_ID, {
    channel: "sms",
    body: "Smoke",
    send: false,
  });
  await fetchLeadCreditReport(LEAD_ID);
  await fetchLeadKanban();
  await fetchLeadList({ page: 1, limit: 20 });
  await fetchLeadById(LEAD_ID);
  await updateCrmLead(LEAD_ID, { phone: "0400000000" });
  await assignCrmLeadOwner(LEAD_ID, OWNER_ID);
  await unassignCrmLeadOwner(LEAD_ID);
  await linkCrmLeadCompany(LEAD_ID, COMPANY_ID);
  await unlinkCrmLeadCompany(LEAD_ID);
  await changeCrmLeadStatus(LEAD_ID, "CONTACTED");
  await changeCrmLeadLifecycleStage(LEAD_ID, "MQL");
  await changeCrmLeadRating(LEAD_ID, "HOT");
  await changeCrmLeadScore(LEAD_ID, 80);
  await convertCrmLead(LEAD_ID, { convertedDealId: DEAL_ID });
  await softDeleteCrmLead(LEAD_ID);

  for (const ep of CRM_LEAD_ENDPOINTS) {
    const hit = hits.find(
      (h) => h.method === ep.method && pathMatches(ep.path, h.path),
    );
    if (!hit) fail(`mock client never called ${ep.method} ${ep.path}`);
  }

  bindCrmLeadFetch(null);
  bindCrmLeadSession(null);
}

type LiveRow = {
  key: string;
  method: string;
  path: string;
  status: number;
  ok: boolean;
  note: string;
};

export async function smokeLeadLiveRoutes(): Promise<LiveRow[]> {
  const base = (
    process.env.NEXT_PUBLIC_CRM_API_URL ||
    process.env.CRM_API_URL ||
    "https://finconnex.payperless.app"
  ).replace(/\/$/, "");

  const rows: LiveRow[] = [];
  for (const ep of CRM_LEAD_ENDPOINTS) {
    const pathWithId = ep.path.replace("{id}", LEAD_ID);
    const init: RequestInit = {
      method: ep.method,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
    };
    if (ep.method !== "GET" && ep.method !== "DELETE") {
      init.body = JSON.stringify(liveBody(ep.key));
    }
    try {
      const res = await fetch(`${base}${pathWithId}`, init);
      const guarded = res.status === 401 || res.status === 403;
      const routed = res.status !== 404 && res.status !== 405;
      rows.push({
        key: ep.key,
        method: ep.method,
        path: pathWithId,
        status: res.status,
        ok: routed,
        note: guarded
          ? "route live, auth required"
          : routed
            ? `HTTP ${res.status}`
            : "missing route",
      });
    } catch (err) {
      rows.push({
        key: ep.key,
        method: ep.method,
        path: pathWithId,
        status: 0,
        ok: false,
        note: err instanceof Error ? err.message : "network error",
      });
    }
  }
  return rows;
}

function liveBody(key: string): unknown {
  switch (key) {
    case "create":
      return {
        firstName: "Smoke",
        lastName: "Probe",
        email: "smoke.probe@example.com",
      };
    case "bulk":
      return { ids: [LEAD_ID], operation: "SOFT_DELETE" };
    case "import":
      return {
        source: "CSV",
        duplicateHandling: "SKIP",
        rows: [
          {
            firstName: "Smoke",
            lastName: "Probe",
            email: "smoke.probe@example.com",
          },
        ],
      };
    case "importAds":
      return {
        platform: "meta",
        duplicateHandling: "SKIP",
        rows: [
          {
            firstName: "Smoke",
            lastName: "Ads",
            email: "smoke.ads@example.com",
          },
        ],
      };
    case "importSheets":
      return {
        spreadsheetId: "sheet-smoke",
        mapping: { Email: "email" },
        duplicateHandling: "SKIP",
        records: [{ Email: "smoke.sheet@example.com" }],
      };
    case "postConversation":
      return { channel: "sms", body: "Smoke", send: false };
    case "update":
      return { phone: "0400000000" };
    case "assignOwner":
      return { ownerId: OWNER_ID };
    case "linkCompany":
      return { companyId: COMPANY_ID };
    case "changeStatus":
      return { status: "CONTACTED" };
    case "changeLifecycle":
      return { lifecycleStage: "MQL" };
    case "changeRating":
      return { rating: "HOT" };
    case "changeScore":
      return { score: 50 };
    case "convert":
      return { convertedDealId: DEAL_ID };
    default:
      return {};
  }
}

export async function runSmokeLeadApis() {
  installSmokePolyfill();
  console.log("Lead API smoke…");

  console.log("\n1) Client wiring vs Swagger catalog…");
  await smokeLeadClientWiring();
  console.log(`   OK — ${CRM_LEAD_ENDPOINTS.length} endpoints exported`);

  console.log("\n2) Mock fetch — each client method hits the right path…");
  await smokeLeadClientMock();
  console.log(`   OK — all ${CRM_LEAD_ENDPOINTS.length} client calls recorded`);

  console.log("\n3) Live CRM routes (unauthenticated probe)…");
  const live = await smokeLeadLiveRoutes();
  const missing = live.filter((row) => !row.ok);
  for (const row of live) {
    const mark = row.ok ? "OK" : "FAIL";
    console.log(`   ${mark}  ${row.method.padEnd(6)} ${row.path}  ${row.status}  ${row.note}`);
  }
  if (missing.length) {
    fail(
      `live routes missing: ${missing.map((r) => `${r.method} ${r.path}`).join(", ")}`,
    );
  }
  console.log("\nLead API smoke passed.");
}

runAsCli(runSmokeLeadApis);
