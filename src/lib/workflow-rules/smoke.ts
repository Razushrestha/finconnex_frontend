/**
 * Cross-check workflow-rules Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/workflow-rules/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  createCrmWorkflowRule,
  deleteCrmWorkflowRule,
  getCrmWorkflowRule,
  listCrmWorkflowRules,
  mapWorkflowRuleTrigger,
  normalizeWorkflowRule,
  suggestCrmWorkflowRule,
  updateCrmWorkflowRule,
  workflowRulesPath,
} from "@/lib/workflow-rules/api";
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
const DECOY_PATH = "/v1/__no_such_module_workflow_rules_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/workflow-rules" },
  { method: "POST", path: "/v1/workflow-rules" },
  { method: "GET", path: `/v1/workflow-rules/${ID}` },
  { method: "PATCH", path: `/v1/workflow-rules/${ID}` },
  { method: "DELETE", path: `/v1/workflow-rules/${ID}` },
  { method: "POST", path: "/v1/workflow-rules/suggest" },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeWorkflowRulesWiring() {
  const api = readSrc("src/lib/workflow-rules/api.ts");
  for (const name of [
    "listCrmWorkflowRules",
    "getCrmWorkflowRule",
    "createCrmWorkflowRule",
    "updateCrmWorkflowRule",
    "deleteCrmWorkflowRule",
    "suggestCrmWorkflowRule",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`workflow-rules client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/workflow-rules${suffix}`")) {
    fail("workflow-rules client missing /v1/workflow-rules path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/workflow-rules"',
    'path: "/workflow-rules/:id"',
    'path: "/workflow-rules/suggest"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc(
    "src/app/(dashboard)/settings/[category]/[subpage]/page.tsx",
  );
  if (!page.includes("WorkflowRulesSettingsClient")) {
    fail("settings page does not mount WorkflowRulesSettingsClient");
  }

  const ui = readSrc("src/components/settings/WorkflowRulesSettingsClient.tsx");
  for (const name of [
    "useCrmWorkflowRules",
    "createCrmWorkflowRule",
    "updateCrmWorkflowRule",
    "deleteCrmWorkflowRule",
    "suggestCrmWorkflowRule",
  ]) {
    if (!ui.includes(name)) {
      fail(`workflow rules UI does not call ${name}`);
    }
  }

  const hook = readSrc("src/lib/workflow-rules/use-crm-workflow-rules.ts");
  if (!hook.includes("replaceCrmWorkflowRules")) {
    fail("workflow-rules hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("workflow-rules hook must mark a successful empty list as Live CRM");
  }

  const normalized = normalizeWorkflowRule(
    {
      id: ID,
      name: "Assign website leads",
      triggerType: "LEAD_CREATED",
      status: "ACTIVE",
      enabled: true,
    },
    0,
  );
  if (
    normalized.name !== "Assign website leads" ||
    mapWorkflowRuleTrigger("LEAD_CREATED") !== "Lead Created" ||
    normalized.status !== "Active"
  ) {
    fail("normalizeWorkflowRule did not map Swagger-shaped fields");
  }
}

export async function smokeWorkflowRulesMock() {
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
              name: "Assign website leads",
              triggerType: "LEAD_CREATED",
              status: "ACTIVE",
              enabled: true,
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmWorkflowRules();
    await getCrmWorkflowRule(ID);
    await createCrmWorkflowRule({
      name: "New",
      trigger: "Lead Created",
      enabled: true,
    });
    await updateCrmWorkflowRule(ID, { name: "Updated" });
    await suggestCrmWorkflowRule("When a lead is created, assign John");
    await deleteCrmWorkflowRule(ID);

    const expected = [
      `GET ${workflowRulesPath()}`,
      `GET ${workflowRulesPath(`/${ID}`)}`,
      `POST ${workflowRulesPath()}`,
      `PATCH ${workflowRulesPath(`/${ID}`)}`,
      `POST ${workflowRulesPath("/suggest")}`,
      `DELETE ${workflowRulesPath(`/${ID}`)}`,
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

export async function smokeWorkflowRulesLive() {
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

export async function runWorkflowRulesSmoke() {
  installSmokePolyfill();
  console.log("Workflow rules API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeWorkflowRulesWiring();
  console.log("   OK — client, catalog, settings UI");

  console.log("\n2) Mock fetch…");
  await smokeWorkflowRulesMock();
  console.log("   OK — all 6 Swagger routes hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokeWorkflowRulesLive();
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
  if (!live.ok) fail("live workflow-rules probe failed");

  console.log("\nWorkflow rules API smoke passed.");
}

runAsCli(runWorkflowRulesSmoke);
