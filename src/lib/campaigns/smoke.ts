/**
 * Cross-check Campaigns + Client Portals Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/campaigns/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  campaignsPath,
  createCrmCampaign,
  deleteCrmCampaign,
  getCrmCampaign,
  launchCrmCampaign,
  listCrmCampaigns,
  normalizeEmailCampaign,
  updateCrmCampaign,
} from "@/lib/campaigns/api";
import {
  clientPortalsPath,
  createCrmClientPortal,
  deleteCrmClientPortal,
  getCrmClientPortal,
  listCrmClientPortals,
  normalizeClientPortal,
  resetCrmClientPortalPassword,
  updateCrmClientPortal,
} from "@/lib/portals/api";
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
  { method: "GET", path: "/v1/campaigns" },
  { method: "GET", path: `/v1/campaigns/${ID}` },
  { method: "POST", path: "/v1/campaigns" },
  { method: "PATCH", path: `/v1/campaigns/${ID}` },
  { method: "DELETE", path: `/v1/campaigns/${ID}` },
  { method: "POST", path: `/v1/campaigns/${ID}/launch` },
  { method: "GET", path: "/v1/client-portals" },
  { method: "GET", path: `/v1/client-portals/${ID}` },
  { method: "POST", path: "/v1/client-portals" },
  { method: "PATCH", path: `/v1/client-portals/${ID}` },
  { method: "DELETE", path: `/v1/client-portals/${ID}` },
  { method: "POST", path: `/v1/client-portals/${ID}/reset-password` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeCampaignsPortalsWiring() {
  const campaigns = readSrc("src/lib/campaigns/api.ts");
  for (const name of [
    "listCrmCampaigns",
    "createCrmCampaign",
    "updateCrmCampaign",
    "deleteCrmCampaign",
    "launchCrmCampaign",
  ]) {
    if (!campaigns.includes(`export async function ${name}`)) {
      fail(`campaigns client missing ${name}`);
    }
  }
  if (!campaigns.includes("`/v1/campaigns${suffix}`")) {
    fail("campaigns client missing /v1/campaigns path");
  }

  const portals = readSrc("src/lib/portals/api.ts");
  for (const name of [
    "listCrmClientPortals",
    "createCrmClientPortal",
    "updateCrmClientPortal",
    "deleteCrmClientPortal",
    "resetCrmClientPortalPassword",
  ]) {
    if (!portals.includes(`export async function ${name}`)) {
      fail(`portals client missing ${name}`);
    }
  }
  if (!portals.includes("`/v1/client-portals${suffix}`")) {
    fail("portals client missing /v1/client-portals path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  if (!catalog.includes('path: "/campaigns"')) {
    fail("endpoint catalog missing /campaigns");
  }
  if (!catalog.includes('path: "/client-portals"')) {
    fail("endpoint catalog missing /client-portals");
  }
  if (!catalog.includes('path: "/campaigns/:id/launch"')) {
    fail("endpoint catalog missing campaign launch");
  }
  if (!catalog.includes('path: "/client-portals/:id/reset-password"')) {
    fail("endpoint catalog missing portal reset-password");
  }

  const emailPage = readSrc("src/app/(dashboard)/marketing/email/page.tsx");
  if (!emailPage.includes("useCrmCampaigns")) {
    fail("email campaigns page does not call useCrmCampaigns");
  }
  const portalsPage = readSrc("src/app/(dashboard)/portals/page.tsx");
  if (!portalsPage.includes("useCrmPortals")) {
    fail("portals page does not call useCrmPortals");
  }
  const detail = readSrc(
    "src/components/marketing/email/EmailCampaignDetailClient.tsx",
  );
  if (!detail.includes("launchCrmCampaign")) {
    fail("email campaign detail does not call launchCrmCampaign");
  }
  const portalDetail = readSrc("src/components/portals/PortalDetailClient.tsx");
  if (!portalDetail.includes("resetCrmClientPortalPassword")) {
    fail("portal detail does not call resetCrmClientPortalPassword");
  }

  const email = normalizeEmailCampaign(
    {
      id: "c1",
      name: "July nurture",
      channel: "EMAIL",
      status: "DRAFT",
      subject: "Hello",
    },
    0,
  );
  if (email.name !== "July nurture" || email.status !== "Draft") {
    fail("normalizeEmailCampaign did not map Swagger-shaped fields");
  }

  const portal = normalizeClientPortal(
    {
      id: "p1",
      name: "Greystone Portal",
      status: "ACTIVE",
      accessLevel: "FULL",
      slug: "greystone",
      primaryContactEmail: "a@example.com",
      primaryContactName: "Ada",
    },
    0,
  );
  if (portal.name !== "Greystone Portal" || portal.status !== "Active") {
    fail("normalizeClientPortal did not map Swagger-shaped fields");
  }
}

export async function smokeCampaignsPortalsMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(url);
    hits.push(`${method} ${parsed.pathname}`);

    if (parsed.pathname.includes("client-portals")) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            items: [
              {
                id: ID,
                name: "Greystone Portal",
                status: "ACTIVE",
                slug: "greystone",
                primaryContactEmail: "a@example.com",
                primaryContactName: "Ada",
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          items: [
            {
              id: ID,
              name: "July nurture",
              channel: "EMAIL",
              status: "DRAFT",
              subject: "Hello",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmCampaigns();
    await getCrmCampaign(ID);
    await createCrmCampaign({ name: "New", channel: "EMAIL" });
    await updateCrmCampaign(ID, { name: "Updated" });
    await launchCrmCampaign(ID);
    await deleteCrmCampaign(ID);

    await listCrmClientPortals();
    await getCrmClientPortal(ID);
    await createCrmClientPortal({ name: "Portal" });
    await updateCrmClientPortal(ID, { name: "Updated portal" });
    await resetCrmClientPortalPassword(ID);
    await deleteCrmClientPortal(ID);

    const expected = [
      `GET ${campaignsPath()}`,
      `GET ${campaignsPath(`/${ID}`)}`,
      `POST ${campaignsPath()}`,
      `PATCH ${campaignsPath(`/${ID}`)}`,
      `POST ${campaignsPath(`/${ID}/launch`)}`,
      `DELETE ${campaignsPath(`/${ID}`)}`,
      `GET ${clientPortalsPath()}`,
      `GET ${clientPortalsPath(`/${ID}`)}`,
      `POST ${clientPortalsPath()}`,
      `PATCH ${clientPortalsPath(`/${ID}`)}`,
      `POST ${clientPortalsPath(`/${ID}/reset-password`)}`,
      `DELETE ${clientPortalsPath(`/${ID}`)}`,
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

export async function smokeCampaignsPortalsLive(): Promise<{
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

export async function runCampaignsPortalsSmoke() {
  installSmokePolyfill();
  console.log("Campaigns + Client Portals API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeCampaignsPortalsWiring();
  console.log("   OK — campaigns + portals clients, catalog, email/portals UI");

  console.log("\n2) Mock fetch…");
  await smokeCampaignsPortalsMock();
  console.log("   OK — CRUD + launch + reset-password");

  console.log("\n3) Live CRM probe…");
  const live = await smokeCampaignsPortalsLive();
  for (const row of live.rows) {
    const mark =
      row.status !== 404 && row.status !== 405 && row.status !== 0
        ? "OK"
        : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (!live.ok) fail("one or more live campaigns/portals routes are missing");

  console.log("\nCampaigns + Client Portals API smoke passed.");
}

runAsCli(runCampaignsPortalsSmoke);
