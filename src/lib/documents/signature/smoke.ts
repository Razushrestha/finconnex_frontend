/**
 * Cross-check Signature Requests Swagger routes (global + workspace twins).
 * Run: npx tsx --tsconfig tsconfig.json src/lib/documents/signature/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  createCrmSignatureRequest,
  declineCrmSignatureRequest,
  deleteCrmSignatureRequest,
  downloadCrmSignatureRequest,
  getCrmSignatureRequest,
  globalSignatureRequestsPath,
  listCrmSignatureRequests,
  normalizeSignatureRequestRemote,
  sendCrmSignatureRequest,
  signCrmSignatureRequest,
  updateCrmSignatureRequest,
  viewCrmSignatureRequest,
  workspaceSignatureRequestsPath,
} from "@/lib/documents/signature/api";
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
const DECOY_PATH = "/v1/__no_such_module_signature_requests_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/signature-requests" },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/signature-requests`,
  },
  { method: "GET", path: `/v1/signature-requests/${ID}` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/signature-requests/${ID}`,
  },
  { method: "POST", path: "/v1/signature-requests" },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/signature-requests`,
  },
  { method: "PATCH", path: `/v1/signature-requests/${ID}` },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/signature-requests/${ID}`,
  },
  { method: "DELETE", path: `/v1/signature-requests/${ID}` },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/signature-requests/${ID}`,
  },
  { method: "GET", path: `/v1/signature-requests/${ID}/download` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/signature-requests/${ID}/download`,
  },
  { method: "POST", path: `/v1/signature-requests/${ID}/send` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/signature-requests/${ID}/send`,
  },
  { method: "POST", path: `/v1/signature-requests/${ID}/view` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/signature-requests/${ID}/view`,
  },
  { method: "POST", path: `/v1/signature-requests/${ID}/sign` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/signature-requests/${ID}/sign`,
  },
  { method: "POST", path: `/v1/signature-requests/${ID}/decline` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/signature-requests/${ID}/decline`,
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

export function smokeSignatureRequestsWiring() {
  const api = readSrc("src/lib/documents/signature/api.ts");
  for (const name of [
    "listCrmSignatureRequests",
    "getCrmSignatureRequest",
    "createCrmSignatureRequest",
    "updateCrmSignatureRequest",
    "deleteCrmSignatureRequest",
    "downloadCrmSignatureRequest",
    "sendCrmSignatureRequest",
    "viewCrmSignatureRequest",
    "signCrmSignatureRequest",
    "declineCrmSignatureRequest",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`signature-requests client missing ${name}`);
    }
  }
  if (!api.includes("workspaceSignatureRequestsPath")) {
    fail("signature-requests client missing workspaceSignatureRequestsPath");
  }
  if (!api.includes("`/v1/signature-requests${suffix}`")) {
    fail("signature-requests client missing global /v1/signature-requests path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/signature-requests"',
    'path: "/signature-requests/:id"',
    'path: "/signature-requests/:id/download"',
    'path: "/signature-requests/:id/send"',
    'path: "/signature-requests/:id/view"',
    'path: "/signature-requests/:id/sign"',
    'path: "/signature-requests/:id/decline"',
    'path: "/workspaces/:workspaceId/signature-requests"',
    'path: "/workspaces/:workspaceId/signature-requests/:id/send"',
    'path: "/workspaces/:workspaceId/signature-requests/:id/decline"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const list = readSrc(
    "src/components/documents/signature/documents/DocumentsList.tsx",
  );
  if (!list.includes("useCrmSignatureRequests")) {
    fail("DocumentsList does not call useCrmSignatureRequests");
  }

  const hook = readSrc(
    "src/lib/documents/signature/use-crm-signature-requests.ts",
  );
  if (!hook.includes("replaceCrmSignatureRequests")) {
    fail("signature-requests hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("signature-requests hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc(
    "src/components/documents/signature/CreateSignatureForm.tsx",
  );
  if (!create.includes("createCrmSignatureRequest")) {
    fail("create form does not call createCrmSignatureRequest");
  }

  const detail = readSrc(
    "src/components/documents/signature/SignatureDetailClient.tsx",
  );
  for (const name of [
    "getCrmSignatureRequest",
    "sendCrmSignatureRequest",
    "deleteCrmSignatureRequest",
    "downloadCrmSignatureRequest",
  ]) {
    if (!detail.includes(name)) {
      fail(`signature detail does not call ${name}`);
    }
  }

  const publicSign = readSrc(
    "src/components/documents/signature/PublicSignClient.tsx",
  );
  for (const name of [
    "viewCrmSignatureRequest",
    "signCrmSignatureRequest",
    "declineCrmSignatureRequest",
  ]) {
    if (!publicSign.includes(name)) {
      fail(`public sign client does not call ${name}`);
    }
  }

  const normalized = normalizeSignatureRequestRemote(
    {
      id: ID,
      documentName: "Home loan pack",
      status: "SENT",
      signers: [{ name: "Olivia", email: "olivia@example.com", role: "SIGNER" }],
    },
    0,
  );
  if (normalized.documentName !== "Home loan pack" || normalized.status !== "Sent") {
    fail("normalizeSignatureRequestRemote did not map Swagger-shaped fields");
  }
}

export async function smokeSignatureRequestsMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(String(input));
    hits.push(`${method} ${parsed.pathname}`);
    if (parsed.pathname.endsWith("/download")) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: { url: "https://crm.smoke.test/signed.pdf" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          items: [
            {
              id: ID,
              documentName: "Home loan pack",
              status: "DRAFT",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmSignatureRequests();
    await getCrmSignatureRequest(ID);
    await createCrmSignatureRequest({ documentName: "New" });
    await updateCrmSignatureRequest(ID, { documentName: "Updated" });
    await sendCrmSignatureRequest(ID);
    await viewCrmSignatureRequest(ID);
    await signCrmSignatureRequest(ID, { signatureData: "typed:Olivia" });
    await declineCrmSignatureRequest(ID);
    await downloadCrmSignatureRequest(ID);
    await deleteCrmSignatureRequest(ID);

    const expected = [
      `GET ${workspaceSignatureRequestsPath(SESSION.workspaceId)}`,
      `GET ${workspaceSignatureRequestsPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceSignatureRequestsPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceSignatureRequestsPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceSignatureRequestsPath(SESSION.workspaceId, `/${ID}/send`)}`,
      `POST ${workspaceSignatureRequestsPath(SESSION.workspaceId, `/${ID}/view`)}`,
      `POST ${workspaceSignatureRequestsPath(SESSION.workspaceId, `/${ID}/sign`)}`,
      `POST ${workspaceSignatureRequestsPath(SESSION.workspaceId, `/${ID}/decline`)}`,
      `GET ${workspaceSignatureRequestsPath(SESSION.workspaceId, `/${ID}/download`)}`,
      `DELETE ${workspaceSignatureRequestsPath(SESSION.workspaceId, `/${ID}`)}`,
    ];
    for (const hit of expected) {
      if (!hits.includes(hit)) {
        fail(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
    if (!globalSignatureRequestsPath().startsWith("/v1/signature-requests")) {
      fail("globalSignatureRequestsPath is wrong");
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

export async function smokeSignatureRequestsLive() {
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

export async function runSignatureRequestsSmoke() {
  installSmokePolyfill();
  console.log("Signature Requests API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeSignatureRequestsWiring();
  console.log("   OK — client, catalog, list, create, detail, public sign");

  console.log("\n2) Mock fetch…");
  await smokeSignatureRequestsMock();
  console.log("   OK — workspace-scoped signature-request routes hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokeSignatureRequestsLive();
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
  if (!live.ok) fail("live signature-requests probe failed");

  console.log("\nSignature Requests API smoke passed.");
}

runAsCli(runSignatureRequestsSmoke);
