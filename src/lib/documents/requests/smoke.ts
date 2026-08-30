/**
 * Cross-check Document Requests Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/documents/requests/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  approveCrmDocumentRequest,
  createCrmDocumentRequest,
  deleteCrmDocumentRequest,
  expireCrmDocumentRequest,
  getCrmDocumentRequest,
  globalDocumentRequestsPath,
  listCrmDocumentRequests,
  normalizeDocumentRequest,
  receiveCrmDocumentRequest,
  rejectCrmDocumentRequest,
  restoreCrmDocumentRequest,
  sendCrmDocumentRequest,
  updateCrmDocumentRequest,
  workspaceDocumentRequestsPath,
} from "@/lib/documents/requests/api";
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
const DECOY_PATH = "/v1/__no_such_module_document_requests_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/document-requests" },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests`,
  },
  { method: "GET", path: `/v1/document-requests/${ID}` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests/${ID}`,
  },
  { method: "POST", path: "/v1/document-requests" },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests`,
  },
  { method: "PATCH", path: `/v1/document-requests/${ID}` },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests/${ID}`,
  },
  { method: "DELETE", path: `/v1/document-requests/${ID}` },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests/${ID}`,
  },
  { method: "POST", path: `/v1/document-requests/${ID}/restore` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests/${ID}/restore`,
  },
  { method: "POST", path: `/v1/document-requests/${ID}/send` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests/${ID}/send`,
  },
  { method: "POST", path: `/v1/document-requests/${ID}/receive` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests/${ID}/receive`,
  },
  { method: "POST", path: `/v1/document-requests/${ID}/approve` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests/${ID}/approve`,
  },
  { method: "POST", path: `/v1/document-requests/${ID}/reject` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests/${ID}/reject`,
  },
  { method: "POST", path: `/v1/document-requests/${ID}/expire` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/document-requests/${ID}/expire`,
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

export function smokeDocumentRequestsWiring() {
  const api = readSrc("src/lib/documents/requests/api.ts");
  if (!api.includes("workspaceDocumentRequestsPath")) {
    fail("document-requests client missing workspaceDocumentRequestsPath");
  }
  if (!api.includes("globalDocumentRequestsPath")) {
    fail("document-requests client missing globalDocumentRequestsPath");
  }
  for (const name of [
    "listCrmDocumentRequests",
    "getCrmDocumentRequest",
    "createCrmDocumentRequest",
    "updateCrmDocumentRequest",
    "deleteCrmDocumentRequest",
    "restoreCrmDocumentRequest",
    "sendCrmDocumentRequest",
    "receiveCrmDocumentRequest",
    "approveCrmDocumentRequest",
    "rejectCrmDocumentRequest",
    "expireCrmDocumentRequest",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`document-requests client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/document-requests"',
    'path: "/document-requests/:id"',
    'path: "/document-requests/:id/send"',
    'path: "/document-requests/:id/receive"',
    'path: "/document-requests/:id/approve"',
    'path: "/document-requests/:id/reject"',
    'path: "/document-requests/:id/expire"',
    'path: "/document-requests/:id/restore"',
    'path: "/workspaces/:workspaceId/document-requests"',
    'path: "/workspaces/:workspaceId/document-requests/:id/send"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/documents/requests/page.tsx");
  if (!page.includes("useCrmDocumentRequests")) {
    fail("document-requests page does not call useCrmDocumentRequests");
  }
  const all = readSrc("src/app/(dashboard)/documents/requests/all/page.tsx");
  if (!all.includes("useCrmDocumentRequests")) {
    fail("all-requests page does not call useCrmDocumentRequests");
  }

  const hook = readSrc(
    "src/lib/documents/requests/use-crm-document-requests.ts",
  );
  if (!hook.includes("replaceDocumentRequests")) {
    fail("document-requests hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("document-requests hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc(
    "src/components/documents/requests/CreateDocumentRequestForm.tsx",
  );
  if (!create.includes("createCrmDocumentRequest")) {
    fail("create form does not call createCrmDocumentRequest");
  }

  const detail = readSrc(
    "src/components/documents/requests/DocumentRequestDetailClient.tsx",
  );
  for (const name of [
    "getCrmDocumentRequest",
    "syncCrmDocumentRequestStatus",
    "updateCrmDocumentRequest",
  ]) {
    if (!detail.includes(name)) {
      fail(`document-request detail does not call ${name}`);
    }
  }

  const normalized = normalizeDocumentRequest(
    {
      id: ID,
      title: "ID pack",
      status: "PENDING",
      clientName: "Greystone",
      documentType: "ID_PROOF",
    },
    0,
  );
  if (
    normalized.title !== "ID pack" ||
    normalized.status !== "Pending" ||
    normalized.documentType !== "ID Proof" ||
    normalized.requestedFrom !== "Greystone"
  ) {
    fail("normalizeDocumentRequest did not map Swagger-shaped fields");
  }
}

export async function smokeDocumentRequestsMock() {
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
              title: "ID pack",
              status: "REQUESTED",
              clientName: "Greystone",
              documentType: "ID_PROOF",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmDocumentRequests();
    await getCrmDocumentRequest(ID);
    await createCrmDocumentRequest({ title: "New" });
    await updateCrmDocumentRequest(ID, { title: "Updated" });
    await restoreCrmDocumentRequest(ID);
    await sendCrmDocumentRequest(ID);
    await receiveCrmDocumentRequest(ID);
    await approveCrmDocumentRequest(ID);
    await rejectCrmDocumentRequest(ID, "Missing pages");
    await expireCrmDocumentRequest(ID);
    await deleteCrmDocumentRequest(ID);

    const expected = [
      `GET ${workspaceDocumentRequestsPath(SESSION.workspaceId)}`,
      `GET ${workspaceDocumentRequestsPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceDocumentRequestsPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceDocumentRequestsPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceDocumentRequestsPath(SESSION.workspaceId, `/${ID}/restore`)}`,
      `POST ${workspaceDocumentRequestsPath(SESSION.workspaceId, `/${ID}/send`)}`,
      `POST ${workspaceDocumentRequestsPath(SESSION.workspaceId, `/${ID}/receive`)}`,
      `POST ${workspaceDocumentRequestsPath(SESSION.workspaceId, `/${ID}/approve`)}`,
      `POST ${workspaceDocumentRequestsPath(SESSION.workspaceId, `/${ID}/reject`)}`,
      `POST ${workspaceDocumentRequestsPath(SESSION.workspaceId, `/${ID}/expire`)}`,
      `DELETE ${workspaceDocumentRequestsPath(SESSION.workspaceId, `/${ID}`)}`,
    ];
    for (const hit of expected) {
      if (!hits.includes(hit)) {
        fail(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
    if (hits.some((hit) => hit.includes(globalDocumentRequestsPath()))) {
      fail("workspace session should not fall back to /v1/document-requests");
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

export async function smokeDocumentRequestsLive() {
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

export async function runDocumentRequestsSmoke() {
  installSmokePolyfill();
  console.log("Document Requests API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeDocumentRequestsWiring();
  console.log("   OK — client, catalog, dashboard, all, create, detail");

  console.log("\n2) Mock fetch (workspace routes)…");
  await smokeDocumentRequestsMock();
  console.log("   OK — all 11 workspace-scoped Swagger operations hit");

  console.log("\n3) Live CRM probe (decoy 404 vs document-requests 401)…");
  const live = await smokeDocumentRequestsLive();
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
  if (!live.ok) fail("live document-requests probe failed");

  console.log("\nDocument Requests API smoke passed.");
}

runAsCli(runDocumentRequestsSmoke);
