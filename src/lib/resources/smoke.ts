/**
 * Cross-check Resources Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/resources/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  createCrmResource,
  deleteCrmResource,
  getCrmResource,
  listCrmResources,
  normalizeResource,
  resourcesPath,
  updateCrmResource,
} from "@/lib/resources/api";
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
const DECOY_PATH = "/v1/__no_such_module_resources_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/resources" },
  { method: "GET", path: `/v1/resources/${ID}` },
  { method: "POST", path: "/v1/resources" },
  { method: "PATCH", path: `/v1/resources/${ID}` },
  { method: "DELETE", path: `/v1/resources/${ID}` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeResourcesWiring() {
  const api = readSrc("src/lib/resources/api.ts");
  for (const name of [
    "listCrmResources",
    "getCrmResource",
    "createCrmResource",
    "updateCrmResource",
    "deleteCrmResource",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`resources client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/resources${suffix}`")) {
    fail("resources client missing /v1/resources path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/resources"',
    'path: "/resources/:id"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/resources/page.tsx");
  if (!page.includes("useCrmResources")) {
    fail("resources page does not call useCrmResources");
  }

  const hook = readSrc("src/lib/resources/use-crm-resources.ts");
  if (!hook.includes("replaceCrmResources")) {
    fail("resources hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("resources hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc("src/components/resources/CreateResourceForm.tsx");
  if (!create.includes("createCrmResource")) {
    fail("create resource form does not call createCrmResource");
  }

  const detail = readSrc("src/components/resources/ResourceDetailClient.tsx");
  for (const name of ["getCrmResource", "updateCrmResource", "deleteCrmResource"]) {
    if (!detail.includes(name)) {
      fail(`resource detail does not call ${name}`);
    }
  }

  const normalized = normalizeResource(
    {
      id: ID,
      name: "Home loan pitch deck",
      type: "DOCUMENT",
      category: "SALES",
      accessLevel: "INTERNAL",
      url: "FinConnex_Pitch_Deck.pdf",
    },
    0,
  );
  if (normalized.name !== "Home loan pitch deck" || normalized.type !== "Document") {
    fail("normalizeResource did not map Swagger-shaped fields");
  }
  if (normalized.accessLevel !== "Internal") {
    fail("normalizeResource did not map access INTERNAL");
  }
}

export async function smokeResourcesMock() {
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
              name: "Home loan pitch deck",
              type: "DOCUMENT",
              category: "SALES",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmResources();
    await getCrmResource(ID);
    await createCrmResource({ name: "New" });
    await updateCrmResource(ID, { name: "Updated" });
    await deleteCrmResource(ID);

    const expected = [
      `GET ${resourcesPath()}`,
      `GET ${resourcesPath(`/${ID}`)}`,
      `POST ${resourcesPath()}`,
      `PATCH ${resourcesPath(`/${ID}`)}`,
      `DELETE ${resourcesPath(`/${ID}`)}`,
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

export async function smokeResourcesLive() {
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

export async function runResourcesSmoke() {
  installSmokePolyfill();
  console.log("Resources API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeResourcesWiring();
  console.log("   OK — client, catalog, list page, create, detail");

  console.log("\n2) Mock fetch…");
  await smokeResourcesMock();
  console.log("   OK — all 5 Swagger routes hit");

  console.log("\n3) Live CRM probe (decoy 404 vs resources 401)…");
  const live = await smokeResourcesLive();
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
  if (!live.ok) fail("live resources probe failed");

  console.log("\nResources API smoke passed.");
}

runAsCli(runResourcesSmoke);
