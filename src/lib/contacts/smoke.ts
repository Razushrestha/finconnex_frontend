/**
 * Cross-check Contacts CRM routes from live Swagger.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/contacts/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  bulkCrmContacts,
  contactsPath,
  createCrmContact,
  deleteCrmContact,
  getCrmContact,
  importCrmContacts,
  listCrmContactBoard,
  listCrmContacts,
  loadCrmContacts,
  mergeCrmContacts,
  normalizeCrmContact,
  updateCrmContact,
} from "@/lib/contacts/api";
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

const DECOY_PATH = "/v1/__no_such_module_contacts_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/contacts" },
  { method: "GET", path: "/v1/contacts/board" },
  { method: "GET", path: `/v1/contacts/${ID}` },
  { method: "POST", path: "/v1/contacts" },
  { method: "PATCH", path: `/v1/contacts/${ID}` },
  { method: "DELETE", path: `/v1/contacts/${ID}` },
  { method: "POST", path: "/v1/contacts/import" },
  { method: "POST", path: "/v1/contacts/bulk" },
  { method: "POST", path: `/v1/contacts/${ID}/merge` },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeContactsWiring() {
  const api = readSrc("src/lib/contacts/api.ts");
  for (const name of [
    "listCrmContacts",
    "listCrmContactBoard",
    "loadCrmContacts",
    "getCrmContact",
    "createCrmContact",
    "updateCrmContact",
    "deleteCrmContact",
    "bulkCrmContacts",
    "importCrmContacts",
    "mergeCrmContacts",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`contacts client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/contacts${suffix}`")) {
    fail("contacts client missing /v1/contacts path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/contacts"',
    'path: "/contacts/board"',
    'path: "/contacts/:id"',
    'path: "/contacts/bulk"',
    'path: "/contacts/import"',
    'path: "/contacts/:id/merge"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/sales/contacts/page.tsx");
  if (!page.includes("useCrmContacts")) {
    fail("contacts page does not call useCrmContacts");
  }
  if (!page.includes("importCrmContacts")) {
    fail("contacts page does not call importCrmContacts");
  }
  if (!page.includes("bulkCrmContacts")) {
    fail("contacts page does not call bulkCrmContacts");
  }

  const store = readSrc("src/lib/contacts/store.ts");
  if (!store.includes("createCrmContact")) {
    fail("contacts store does not sync create to CRM");
  }
  if (!store.includes("deleteCrmContact")) {
    fail("contacts store does not sync delete to CRM");
  }
  if (!store.includes("updateCrmContact")) {
    fail("contacts store does not sync update to CRM");
  }

  const merge = readSrc("src/lib/sales/merge.ts");
  if (!merge.includes("mergeCrmContacts")) {
    fail("mergeContacts does not call mergeCrmContacts");
  }

  const kanban = readSrc(
    "src/components/sales/contacts/ContactsKanbanBoard.tsx",
  );
  if (!kanban.includes("updateCrmContact")) {
    fail("kanban board does not sync status moves to CRM");
  }

  const normalized = normalizeCrmContact(
    {
      id: "c1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      status: "ACTIVE",
      source: "WEBSITE",
      ownerName: "John",
    },
    0,
  );
  if (
    normalized.contact.name !== "Ada Lovelace" ||
    normalized.status !== "Active" ||
    normalized.contact.source !== "Website"
  ) {
    fail("normalizeCrmContact did not map Swagger-shaped fields");
  }
}

export async function smokeContactsMock() {
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
              firstName: "Ada",
              lastName: "Lovelace",
              email: "ada@example.com",
              status: "ACTIVE",
              source: "WEBSITE",
              ownerName: "John",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmContacts();
    await listCrmContactBoard();
    await loadCrmContacts();
    await getCrmContact(ID);
    await createCrmContact({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      status: "Active",
      owner: "John",
    });
    await updateCrmContact(ID, { name: "Ada L", status: "Inactive" });
    await bulkCrmContacts({ ids: [ID], operation: "DELETE" });
    await importCrmContacts({ rows: [{ firstName: "Import" }] });
    await mergeCrmContacts({ survivorId: ID, sourceId: SOURCE_ID });
    await deleteCrmContact(ID);

    const expected = [
      `GET ${contactsPath()}`,
      `GET ${contactsPath("/board")}`,
      `GET ${contactsPath(`/${ID}`)}`,
      `POST ${contactsPath()}`,
      `PATCH ${contactsPath(`/${ID}`)}`,
      `POST ${contactsPath("/bulk")}`,
      `POST ${contactsPath("/import")}`,
      `POST ${contactsPath(`/${ID}/merge`)}`,
      `DELETE ${contactsPath(`/${ID}`)}`,
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

async function probeLive(
  base: string,
  method: string,
  path: string,
): Promise<{ status: number; message: string }> {
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
    /* keep snippet */
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

export async function smokeContactsLive(): Promise<{
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

  const decoy = await probeLive(base, "GET", DECOY_PATH);
  const decoyMissing = decoy.status === 404;
  rows.push({
    method: "GET",
    path: DECOY_PATH,
    status: decoy.status,
    note: decoyMissing
      ? `control 404 (missing route): ${decoy.message}`
      : `expected 404 for decoy, got ${decoy.status} ${decoy.message}`,
  });
  if (!decoyMissing) ok = false;

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
          : hit.status === 404 || hit.status === 405
            ? `missing route: ${hit.message}`
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

export async function runContactsSmoke() {
  installSmokePolyfill();
  console.log("Contacts API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeContactsWiring();
  console.log("   OK — contacts client, catalog, page, store, merge, kanban");

  console.log("\n2) Mock fetch…");
  await smokeContactsMock();
  console.log("   OK — list/get/create/update/bulk/import/merge/delete");

  console.log("\n3) Live CRM probe (decoy 404 vs contacts 401)…");
  const live = await smokeContactsLive();
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
  if (!live.ok) {
    fail("live contacts probe failed: decoy must 404, real routes must 401/403");
  }

  console.log("\nContacts API smoke passed.");
}

runAsCli(runContactsSmoke);
