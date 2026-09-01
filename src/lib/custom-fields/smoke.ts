/**
 * Cross-check Custom Fields Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/custom-fields/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  bulkCrmCustomFieldValues,
  clearCrmCustomFieldValue,
  createCrmCustomField,
  customFieldsPath,
  deleteCrmCustomField,
  exportCrmCustomFieldDefinitions,
  getCrmCustomField,
  getCrmCustomFieldUsage,
  importCrmCustomFields,
  listCrmCustomFieldValues,
  listCrmCustomFields,
  normalizeCustomField,
  previewCrmCustomField,
  reorderCrmCustomFields,
  restoreCrmCustomField,
  searchCrmCustomFieldValues,
  setCrmCustomFieldValue,
  updateCrmCustomField,
} from "@/lib/custom-fields/api";
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
const ENTITY_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const DECOY_PATH = "/v1/__no_such_module_custom_fields_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/custom-fields" },
  { method: "GET", path: `/v1/custom-fields/${ID}` },
  { method: "POST", path: "/v1/custom-fields" },
  { method: "PATCH", path: `/v1/custom-fields/${ID}` },
  { method: "DELETE", path: `/v1/custom-fields/${ID}` },
  { method: "POST", path: `/v1/custom-fields/${ID}/restore` },
  { method: "GET", path: `/v1/custom-fields/values/${ENTITY_ID}` },
  { method: "POST", path: `/v1/custom-fields/${ID}/values` },
  { method: "DELETE", path: `/v1/custom-fields/${ID}/values/${ENTITY_ID}` },
  { method: "GET", path: "/v1/custom-fields/definitions/export" },
  { method: "GET", path: `/v1/custom-fields/${ID}/usage` },
  { method: "GET", path: `/v1/custom-fields/${ID}/value-search` },
  { method: "POST", path: "/v1/custom-fields/preview" },
  { method: "POST", path: "/v1/custom-fields/reorder" },
  { method: "POST", path: "/v1/custom-fields/import" },
  { method: "POST", path: "/v1/custom-fields/values/bulk" },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeCustomFieldsWiring() {
  const api = readSrc("src/lib/custom-fields/api.ts");
  for (const name of [
    "listCrmCustomFields",
    "getCrmCustomField",
    "createCrmCustomField",
    "updateCrmCustomField",
    "deleteCrmCustomField",
    "restoreCrmCustomField",
    "listCrmCustomFieldValues",
    "setCrmCustomFieldValue",
    "clearCrmCustomFieldValue",
    "exportCrmCustomFieldDefinitions",
    "getCrmCustomFieldUsage",
    "searchCrmCustomFieldValues",
    "previewCrmCustomField",
    "reorderCrmCustomFields",
    "importCrmCustomFields",
    "bulkCrmCustomFieldValues",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`custom-fields client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/custom-fields${suffix}`")) {
    fail("custom-fields client missing /v1/custom-fields path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/custom-fields"',
    'path: "/custom-fields/:id"',
    'path: "/custom-fields/:id/restore"',
    'path: "/custom-fields/values/:entityId"',
    'path: "/custom-fields/:id/values"',
    'path: "/custom-fields/:id/values/:entityId"',
    'path: "/custom-fields/definitions/export"',
    'path: "/custom-fields/:id/usage"',
    'path: "/custom-fields/:id/value-search"',
    'path: "/custom-fields/preview"',
    'path: "/custom-fields/reorder"',
    'path: "/custom-fields/import"',
    'path: "/custom-fields/values/bulk"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/components/settings/CustomFieldsSettingsClient.tsx");
  if (!page.includes("useCrmCustomFields")) {
    fail("custom fields settings does not call useCrmCustomFields");
  }
  if (!page.includes("createCrmCustomField")) {
    fail("custom fields settings does not create via CRM");
  }

  const hook = readSrc("src/lib/custom-fields/use-crm-custom-fields.ts");
  if (!hook.includes("replaceCrmCustomFields")) {
    fail("custom-fields hook does not replace the store from live CRM");
  }

  const normalized = normalizeCustomField(
    {
      id: ID,
      label: "Lead score",
      key: "leadScore",
      entityType: "LEAD",
      type: "NUMBER",
      isActive: true,
    },
    0,
  );
  if (
    normalized.label !== "Lead score" ||
    normalized.entity !== "Lead" ||
    normalized.type !== "number" ||
    !normalized.active
  ) {
    fail("normalizeCustomField did not map Swagger-shaped fields");
  }
}

export async function smokeCustomFieldsMock() {
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
              label: "Lead score",
              key: "leadScore",
              entityType: "LEAD",
              type: "NUMBER",
              isActive: true,
            },
          ],
          id: ID,
          entityId: ENTITY_ID,
          value: "82",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmCustomFields();
    await getCrmCustomField(ID);
    await createCrmCustomField({ label: "New" });
    await updateCrmCustomField(ID, { label: "Updated" });
    await restoreCrmCustomField(ID);
    await listCrmCustomFieldValues(ENTITY_ID);
    await setCrmCustomFieldValue(ID, { entityId: ENTITY_ID, value: "82" });
    await clearCrmCustomFieldValue(ID, ENTITY_ID);
    await exportCrmCustomFieldDefinitions();
    await getCrmCustomFieldUsage(ID);
    await searchCrmCustomFieldValues(ID, "82");
    await previewCrmCustomField({ label: "Preview" });
    await reorderCrmCustomFields([ID]);
    await importCrmCustomFields({ definitions: [] });
    await bulkCrmCustomFieldValues([
      { customFieldId: ID, entityId: ENTITY_ID, value: "82" },
    ]);
    await deleteCrmCustomField(ID);

    const expected = [
      `GET ${customFieldsPath()}`,
      `GET ${customFieldsPath(`/${ID}`)}`,
      `POST ${customFieldsPath()}`,
      `PATCH ${customFieldsPath(`/${ID}`)}`,
      `POST ${customFieldsPath(`/${ID}/restore`)}`,
      `GET ${customFieldsPath(`/values/${ENTITY_ID}`)}`,
      `POST ${customFieldsPath(`/${ID}/values`)}`,
      `DELETE ${customFieldsPath(`/${ID}/values/${ENTITY_ID}`)}`,
      `GET ${customFieldsPath("/definitions/export")}`,
      `GET ${customFieldsPath(`/${ID}/usage`)}`,
      `GET ${customFieldsPath(`/${ID}/value-search`)}`,
      `POST ${customFieldsPath("/preview")}`,
      `POST ${customFieldsPath("/reorder")}`,
      `POST ${customFieldsPath("/import")}`,
      `POST ${customFieldsPath("/values/bulk")}`,
      `DELETE ${customFieldsPath(`/${ID}`)}`,
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
    else if (Array.isArray(json.message)) message = json.message.join(", ");
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

export async function smokeCustomFieldsLive() {
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

export async function runCustomFieldsSmoke() {
  installSmokePolyfill();
  console.log("Custom Fields API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeCustomFieldsWiring();
  console.log("   OK — client, catalog, settings page");

  console.log("\n2) Mock fetch…");
  await smokeCustomFieldsMock();
  console.log("   OK — all 16 Swagger routes hit");

  console.log("\n3) Live CRM probe (decoy 404 vs custom-fields 401)…");
  const live = await smokeCustomFieldsLive();
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
  if (!live.ok) fail("live custom-fields probe failed");

  console.log("\nCustom Fields API smoke passed.");
}

runAsCli(runCustomFieldsSmoke);
