/**
 * Cross-check Estimates Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/finance/estimates/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  addCrmEstimateAttachment,
  createCrmEstimate,
  deleteCrmEstimate,
  deleteCrmEstimateAttachment,
  downloadCrmEstimatePdf,
  estimatesPath,
  getCrmEstimate,
  getCrmEstimatePublicLink,
  listCrmEstimateAttachments,
  listCrmEstimates,
  normalizeEstimate,
  sendCrmEstimate,
  updateCrmEstimate,
} from "@/lib/finance/estimates/api";
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
const DECOY_PATH = "/v1/__no_such_module_estimates_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/estimates" },
  { method: "GET", path: `/v1/estimates/${ID}` },
  { method: "POST", path: "/v1/estimates" },
  { method: "PATCH", path: `/v1/estimates/${ID}` },
  { method: "DELETE", path: `/v1/estimates/${ID}` },
  { method: "POST", path: `/v1/estimates/${ID}/send` },
  { method: "GET", path: `/v1/estimates/${ID}/pdf` },
  { method: "GET", path: `/v1/estimates/${ID}/public-link` },
  { method: "GET", path: `/v1/estimates/${ID}/attachments` },
  { method: "POST", path: `/v1/estimates/${ID}/attachments` },
  {
    method: "DELETE",
    path: `/v1/estimates/${ID}/attachments/${ATTACHMENT_ID}`,
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

export function smokeEstimatesWiring() {
  const api = readSrc("src/lib/finance/estimates/api.ts");
  for (const name of [
    "listCrmEstimates",
    "getCrmEstimate",
    "createCrmEstimate",
    "updateCrmEstimate",
    "deleteCrmEstimate",
    "sendCrmEstimate",
    "getCrmEstimatePublicLink",
    "downloadCrmEstimatePdf",
    "listCrmEstimateAttachments",
    "addCrmEstimateAttachment",
    "deleteCrmEstimateAttachment",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`estimates client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/estimates${suffix}`")) {
    fail("estimates client missing /v1/estimates path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/estimates"',
    'path: "/estimates/:id"',
    'path: "/estimates/:id/send"',
    'path: "/estimates/:id/pdf"',
    'path: "/estimates/:id/public-link"',
    'path: "/estimates/:id/attachments"',
    'path: "/estimates/:id/attachments/:attachmentId"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/finance/estimates/page.tsx");
  if (!page.includes("useCrmEstimates")) {
    fail("estimates page does not call useCrmEstimates");
  }

  const hook = readSrc("src/lib/finance/estimates/use-crm-estimates.ts");
  if (!hook.includes("replaceCrmEstimates")) {
    fail("estimates hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("estimates hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc("src/components/finance/estimates/CreateEstimateForm.tsx");
  if (!create.includes("createCrmEstimate")) {
    fail("create estimate form does not call createCrmEstimate");
  }

  const detail = readSrc(
    "src/components/finance/estimates/EstimateDetailClient.tsx",
  );
  for (const name of [
    "sendCrmEstimate",
    "downloadCrmEstimatePdf",
    "getCrmEstimatePublicLink",
    "deleteCrmEstimate",
    "addCrmEstimateAttachment",
  ]) {
    if (!detail.includes(name)) {
      fail(`estimate detail does not call ${name}`);
    }
  }

  const normalized = normalizeEstimate(
    {
      id: "est1",
      title: "Greystone refinance",
      status: "SENT",
      clientName: "Greystone",
      total: 2200,
    },
    0,
  );
  if (normalized.title !== "Greystone refinance" || normalized.status !== "Sent") {
    fail("normalizeEstimate did not map Swagger-shaped fields");
  }
}

export async function smokeEstimatesMock() {
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
          url: "https://crm.smoke.test/p/est",
          id: ATTACHMENT_ID,
          name: "note.pdf",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmEstimates();
    await getCrmEstimate(ID);
    await createCrmEstimate({ title: "New" });
    await updateCrmEstimate(ID, { title: "Updated" });
    await sendCrmEstimate(ID);
    await getCrmEstimatePublicLink(ID);
    await downloadCrmEstimatePdf(ID);
    await listCrmEstimateAttachments(ID);
    await addCrmEstimateAttachment(
      ID,
      new File(["x"], "note.pdf", { type: "application/pdf" }),
    );
    await deleteCrmEstimateAttachment(ID, ATTACHMENT_ID);
    await deleteCrmEstimate(ID);

    const expected = [
      `GET ${estimatesPath()}`,
      `GET ${estimatesPath(`/${ID}`)}`,
      `POST ${estimatesPath()}`,
      `PATCH ${estimatesPath(`/${ID}`)}`,
      `POST ${estimatesPath(`/${ID}/send`)}`,
      `GET ${estimatesPath(`/${ID}/public-link`)}`,
      `GET ${estimatesPath(`/${ID}/pdf`)}`,
      `GET ${estimatesPath(`/${ID}/attachments`)}`,
      `POST ${estimatesPath(`/${ID}/attachments`)}`,
      `DELETE ${estimatesPath(`/${ID}/attachments/${ATTACHMENT_ID}`)}`,
      `DELETE ${estimatesPath(`/${ID}`)}`,
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

export async function smokeEstimatesLive() {
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

export async function runEstimatesSmoke() {
  installSmokePolyfill();
  console.log("Estimates API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeEstimatesWiring();
  console.log("   OK — client, catalog, list page, create, detail");

  console.log("\n2) Mock fetch…");
  await smokeEstimatesMock();
  console.log("   OK — all 11 Swagger routes hit");

  console.log("\n3) Live CRM probe (decoy 404 vs estimates 401)…");
  const live = await smokeEstimatesLive();
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
  if (!live.ok) fail("live estimates probe failed");

  console.log("\nEstimates API smoke passed.");
}

runAsCli(runEstimatesSmoke);
