/**
 * Cross-check workspaces Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/workspaces/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  createCrmWorkspace,
  deleteCrmWorkspace,
  getCrmWorkspace,
  listCrmMyWorkspaces,
  normalizeWorkspace,
  updateCrmWorkspace,
  workspacesMinePath,
  workspacesPath,
} from "@/lib/workspaces/api";
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

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DECOY_PATH = "/v1/__no_such_module_workspaces_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/workspaces/mine" },
  { method: "POST", path: "/v1/workspaces" },
  { method: "GET", path: `/v1/workspaces/${ID}` },
  { method: "PATCH", path: `/v1/workspaces/${ID}` },
  { method: "DELETE", path: `/v1/workspaces/${ID}` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeWorkspacesWiring() {
  const api = readSrc("src/lib/workspaces/api.ts");
  for (const name of [
    "listCrmMyWorkspaces",
    "getCrmWorkspace",
    "createCrmWorkspace",
    "updateCrmWorkspace",
    "deleteCrmWorkspace",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`workspaces client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/workspaces/mine"',
    'path: "/workspaces"',
    'path: "/workspaces/:workspaceId"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }
  const catalogHasDelete = catalog.includes(
    'method: "DELETE",\n    path: "/workspaces/:workspaceId"',
  );
  if (!catalogHasDelete) {
    fail("endpoint catalog missing DELETE /workspaces/:workspaceId");
  }

  const ui = readSrc("src/components/settings/WorkspacesSettingsClient.tsx");
  for (const name of [
    "useCrmMyWorkspaces",
    "listCrmMyWorkspaces",
    "createCrmWorkspace",
    "updateCrmWorkspace",
    "deleteCrmWorkspace",
    "getCrmWorkspace",
  ]) {
    if (name === "listCrmMyWorkspaces") continue;
    if (!ui.includes(name)) {
      fail(`Workspaces settings does not call ${name}`);
    }
  }

  const hook = readSrc("src/lib/workspaces/use-crm-my-workspaces.ts");
  if (!hook.includes("replaceCrmWorkspaces")) {
    fail("workspaces hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("workspaces hook must mark a successful empty list as Live CRM");
  }

  const normalized = normalizeWorkspace(
    { id: ID, name: "FinConnex HQ", slug: "finconnex-hq", status: "ACTIVE" },
    0,
  );
  if (normalized.name !== "FinConnex HQ" || normalized.slug !== "finconnex-hq") {
    fail("normalizeWorkspace did not map Swagger-shaped fields");
  }
}

export async function smokeWorkspacesMock() {
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
            { id: ID, name: "FinConnex HQ", slug: "finconnex-hq" },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmMyWorkspaces();
    await getCrmWorkspace(ID);
    await createCrmWorkspace({ name: "New space" });
    await updateCrmWorkspace(ID, { name: "Renamed" });
    await deleteCrmWorkspace(ID);

    const expected = [
      `GET ${workspacesMinePath()}`,
      `GET ${workspacesPath(`/${ID}`)}`,
      `POST ${workspacesPath()}`,
      `PATCH ${workspacesPath(`/${ID}`)}`,
      `DELETE ${workspacesPath(`/${ID}`)}`,
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

export async function smokeWorkspacesLive() {
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

export async function runWorkspacesSmoke() {
  installSmokePolyfill();
  console.log("Workspaces API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeWorkspacesWiring();
  console.log("   OK — client, catalog, Workspaces settings");

  console.log("\n2) Mock fetch…");
  await smokeWorkspacesMock();
  console.log("   OK — all 5 Swagger routes hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokeWorkspacesLive();
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
  if (!live.ok) fail("live workspaces probe failed");

  console.log("\nWorkspaces API smoke passed.");
}

runAsCli(runWorkspacesSmoke);
