/**
 * Cross-check Record Search Swagger route.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/search/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  hrefForRecordType,
  normalizeRecordSearchHit,
  searchCrmRecords,
  workspaceRecordSearchPath,
} from "@/lib/search/api";
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
const DECOY_PATH = "/v1/__no_such_module_record_search_probe__";

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeRecordSearchWiring() {
  const api = readSrc("src/lib/search/api.ts");
  if (!api.includes("`/v1/workspaces/${workspaceId}/search/records${query}`")) {
    fail("record search client missing workspace path");
  }
  if (!api.includes("export async function searchCrmRecords")) {
    fail("record search client missing searchCrmRecords");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  if (!catalog.includes('path: "/workspaces/:workspaceId/search/records"')) {
    fail("endpoint catalog missing search/records");
  }

  const modal = readSrc("src/components/layout/SearchModal.tsx");
  if (!modal.includes("useCrmRecordSearch")) {
    fail("SearchModal does not call useCrmRecordSearch");
  }

  const hook = readSrc("src/lib/search/use-crm-record-search.ts");
  if (!hook.includes("searchCrmRecords")) {
    fail("search hook does not call searchCrmRecords");
  }

  const hit = normalizeRecordSearchHit(
    {
      id: ID,
      type: "LEAD",
      title: "Priya Mehta",
      email: "priya@greystone.example",
    },
    0,
  );
  if (hit.title !== "Priya Mehta" || !hit.href.includes("/sales/leads/detail/")) {
    fail("normalizeRecordSearchHit did not map Swagger-shaped fields");
  }
  if (!hrefForRecordType("deal", ID).includes("/sales/deals/detail/")) {
    fail("hrefForRecordType did not map deals");
  }
}

export async function smokeRecordSearchMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(String(input));
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          items: [
            {
              id: ID,
              type: "CONTACT",
              title: "Marcus Chen",
              email: "marcus@harbour.example",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const rows = await searchCrmRecords({ q: "marcus" });
    if (rows.length !== 1 || rows[0]?.title !== "Marcus Chen") {
      fail("searchCrmRecords did not unwrap CRM items");
    }
    const expected = `GET ${workspaceRecordSearchPath(SESSION.workspaceId)}`;
    if (!hits.includes(expected)) {
      fail(`mock fetch missed ${expected} (got ${hits.join(", ")})`);
    }
  } finally {
    bindCrmSession(null);
    globalThis.fetch = origFetch;
  }
}

async function probeLive(base: string, method: string, path: string) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Accept: "application/json" },
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

export async function smokeRecordSearchLive() {
  const base = (getCrmApiBaseUrl() || "https://finconnex.payperless.app").replace(
    /\/$/,
    "",
  );
  const path = `/v1/workspaces/${SESSION.workspaceId}/search/records`;
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

  try {
    const hit = await probeLive(base, "GET", path);
    const routed = isAuthRequired(hit.status, hit.message);
    if (!routed) ok = false;
    rows.push({
      method: "GET",
      path,
      status: hit.status,
      note: routed
        ? `routed + auth required: ${hit.message}`
        : `unexpected ${hit.status}: ${hit.message}`,
    });
  } catch (err) {
    ok = false;
    rows.push({
      method: "GET",
      path,
      status: 0,
      note: err instanceof Error ? err.message : "network error",
    });
  }

  return { ok, rows };
}

export async function runRecordSearchSmoke() {
  installSmokePolyfill();
  console.log("Record search API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeRecordSearchWiring();
  console.log("   OK — client, catalog, SearchModal");

  console.log("\n2) Mock fetch…");
  await smokeRecordSearchMock();
  console.log("   OK — GET /workspaces/:id/search/records");

  console.log("\n3) Live CRM probe…");
  const live = await smokeRecordSearchLive();
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
  if (!live.ok) fail("live record search probe failed");

  console.log("\nRecord search API smoke passed.");
}

runAsCli(runRecordSearchSmoke);
