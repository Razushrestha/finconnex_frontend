/**
 * Cross-check recycle-bin Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/recycle-bin/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  listCrmRecycleBin,
  moduleFromEntityType,
  normalizeRecycleBinItem,
  purgeCrmRecycleBinItem,
  recycleBinPath,
  restoreCrmRecycleBinItem,
} from "@/lib/recycle-bin/api";
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
const DECOY_PATH = "/v1/__no_such_module_recycle_bin_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/recycle-bin" },
  { method: "POST", path: `/v1/recycle-bin/lead/${ID}/restore` },
  { method: "DELETE", path: `/v1/recycle-bin/lead/${ID}` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeRecycleBinWiring() {
  const api = readSrc("src/lib/recycle-bin/api.ts");
  for (const name of [
    "listCrmRecycleBin",
    "restoreCrmRecycleBinItem",
    "purgeCrmRecycleBinItem",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`recycle-bin client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/recycle-bin${suffix}`")) {
    fail("recycle-bin client missing /v1/recycle-bin path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/recycle-bin"',
    'path: "/recycle-bin/:entityType/:id/restore"',
    'path: "/recycle-bin/:entityType/:id"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const settings = readSrc(
    "src/components/settings/RecycleBinSettingsClient.tsx",
  );
  if (!settings.includes("useCrmRecycleBin")) {
    fail("RecycleBinSettingsClient does not call useCrmRecycleBin");
  }
  if (!settings.includes("restoreCrmRecycleBinItem")) {
    fail("settings recycle bin does not restore via CRM");
  }
  if (!settings.includes("purgeCrmRecycleBinItem")) {
    fail("settings recycle bin does not purge via CRM");
  }

  const hook = readSrc("src/lib/recycle-bin/use-crm-recycle-bin.ts");
  if (!hook.includes("replaceCrmRecycleBin")) {
    fail("recycle-bin hook does not replace the store from live CRM");
  }

  const row = normalizeRecycleBinItem(
    {
      id: ID,
      entityType: "lead",
      title: "Priya Mehta",
      deletedBy: "Ada",
    },
    0,
  );
  if (row.recordLabel !== "Priya Mehta" || row.module !== "sales.leads") {
    fail("normalizeRecycleBinItem did not map Swagger-shaped fields");
  }
  if (moduleFromEntityType("invoice") !== "finance.invoices") {
    fail("moduleFromEntityType did not map invoices");
  }
}

export async function smokeRecycleBinMock() {
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
              entityType: "lead",
              title: "Priya Mehta",
              deletedBy: "Ada",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const rows = await listCrmRecycleBin();
    if (rows.length !== 1 || rows[0]?.recordLabel !== "Priya Mehta") {
      fail("listCrmRecycleBin did not unwrap CRM items");
    }
    await restoreCrmRecycleBinItem("lead", ID);
    await purgeCrmRecycleBinItem("lead", ID);

    const expected = [
      `GET ${recycleBinPath()}`,
      `POST ${recycleBinPath(`/lead/${ID}/restore`)}`,
      `DELETE ${recycleBinPath(`/lead/${ID}`)}`,
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
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? "{}" : undefined,
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

export async function smokeRecycleBinLive() {
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

export async function runRecycleBinSmoke() {
  installSmokePolyfill();
  console.log("Recycle bin API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeRecycleBinWiring();
  console.log("   OK — client, catalog, settings recycle bin");

  console.log("\n2) Mock fetch…");
  await smokeRecycleBinMock();
  console.log("   OK — GET /recycle-bin + restore + purge");

  console.log("\n3) Live CRM probe…");
  const live = await smokeRecycleBinLive();
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
  if (!live.ok) fail("live recycle-bin probe failed");

  console.log("\nRecycle bin API smoke passed.");
}

runAsCli(runRecycleBinSmoke);
