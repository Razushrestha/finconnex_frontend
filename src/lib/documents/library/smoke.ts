/**
 * Cross-check Documents Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/documents/library/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  createCrmDocument,
  deleteCrmDocument,
  getCrmDocument,
  getCrmDocumentDownload,
  globalDocumentsPath,
  listCrmDocuments,
  normalizeLibraryDocument,
  restoreCrmDocument,
  updateCrmDocument,
  workspaceDocumentsPath,
} from "@/lib/documents/library/api";
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
const DECOY_PATH = "/v1/__no_such_module_documents_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/documents" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/documents` },
  { method: "GET", path: `/v1/documents/${ID}` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/documents/${ID}`,
  },
  { method: "GET", path: `/v1/documents/${ID}/download` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/documents/${ID}/download`,
  },
  { method: "POST", path: "/v1/documents" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/documents` },
  { method: "PATCH", path: `/v1/documents/${ID}` },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/documents/${ID}`,
  },
  { method: "DELETE", path: `/v1/documents/${ID}` },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/documents/${ID}`,
  },
  { method: "POST", path: `/v1/documents/${ID}/restore` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/documents/${ID}/restore`,
  },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeDocumentsWiring() {
  const api = readSrc("src/lib/documents/library/api.ts");
  if (!api.includes("workspaceDocumentsPath")) {
    fail("documents client missing workspaceDocumentsPath");
  }
  if (!api.includes("globalDocumentsPath")) {
    fail("documents client missing globalDocumentsPath");
  }
  for (const name of [
    "listCrmDocuments",
    "getCrmDocument",
    "getCrmDocumentDownload",
    "createCrmDocument",
    "updateCrmDocument",
    "deleteCrmDocument",
    "restoreCrmDocument",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`documents client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/documents"',
    'path: "/documents/:id"',
    'path: "/documents/:id/download"',
    'path: "/documents/:id/restore"',
    'path: "/workspaces/:workspaceId/documents"',
    'path: "/workspaces/:workspaceId/documents/:id/download"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/documents/library/page.tsx");
  if (!page.includes("useCrmDocuments")) {
    fail("library page does not call useCrmDocuments");
  }
  for (const name of [
    "createCrmDocument",
    "updateCrmDocument",
    "deleteCrmDocument",
    "getCrmDocumentDownload",
  ]) {
    if (!page.includes(name)) {
      fail(`library page does not call ${name}`);
    }
  }

  const hook = readSrc("src/lib/documents/library/use-crm-documents.ts");
  if (!hook.includes("replaceLibraryDocuments")) {
    fail("documents hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("documents hook must mark a successful empty list as Live CRM");
  }

  const restore = readSrc("src/lib/rules/restore.ts");
  if (!restore.includes("restoreCrmDocument")) {
    fail("recycle-bin restore does not call restoreCrmDocument");
  }

  const normalized = normalizeLibraryDocument(
    {
      id: ID,
      fileName: "Greystone_Proposal.pdf",
      folder: "Deals",
      ownerName: "Ada",
      accessLevel: "TEAM",
      size: 1200000,
    },
    0,
  );
  if (
    normalized.fileName !== "Greystone_Proposal.pdf" ||
    normalized.accessLevel !== "Team" ||
    normalized.owner !== "Ada"
  ) {
    fail("normalizeLibraryDocument did not map Swagger-shaped fields");
  }
}

export async function smokeDocumentsMock() {
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
              fileName: "Greystone_Proposal.pdf",
              folder: "Deals",
              ownerName: "Ada",
              accessLevel: "TEAM",
            },
          ],
          url: "https://crm.smoke.test/files/proposal.pdf",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmDocuments();
    await getCrmDocument(ID);
    await getCrmDocumentDownload(ID);
    await createCrmDocument({ fileName: "New.pdf" });
    await updateCrmDocument(ID, { fileName: "Updated.pdf" });
    await restoreCrmDocument(ID);
    await deleteCrmDocument(ID);

    const expected = [
      `GET ${workspaceDocumentsPath(SESSION.workspaceId)}`,
      `GET ${workspaceDocumentsPath(SESSION.workspaceId, `/${ID}`)}`,
      `GET ${workspaceDocumentsPath(SESSION.workspaceId, `/${ID}/download`)}`,
      `POST ${workspaceDocumentsPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceDocumentsPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceDocumentsPath(SESSION.workspaceId, `/${ID}/restore`)}`,
      `DELETE ${workspaceDocumentsPath(SESSION.workspaceId, `/${ID}`)}`,
    ];
    for (const hit of expected) {
      if (!hits.includes(hit)) {
        fail(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
    if (
      hits.some((hit) =>
        hit.includes(`${globalDocumentsPath()}/`) ||
        hit.endsWith(` ${globalDocumentsPath()}`),
      )
    ) {
      fail("workspace session should not fall back to /v1/documents");
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
      ...(method === "POST" || method === "PATCH" || method === "DELETE"
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      method === "POST" || method === "PATCH" || method === "DELETE"
        ? "{}"
        : undefined,
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

export async function smokeDocumentsLive() {
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

export async function runDocumentsSmoke() {
  installSmokePolyfill();
  console.log("Documents API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeDocumentsWiring();
  console.log("   OK — client, catalog, library page, restore");

  console.log("\n2) Mock fetch (workspace routes)…");
  await smokeDocumentsMock();
  console.log("   OK — all 7 workspace-scoped Swagger operations hit");

  console.log("\n3) Live CRM probe (decoy 404 vs documents 401)…");
  const live = await smokeDocumentsLive();
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
  if (!live.ok) fail("live documents probe failed");

  console.log("\nDocuments API smoke passed.");
}

runAsCli(runDocumentsSmoke);
