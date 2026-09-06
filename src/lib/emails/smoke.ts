/**
 * Cross-check CRM Emails Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/emails/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  applyCrmEmailTemplate,
  attachCrmEmailObject,
  cancelCrmEmail,
  createCrmEmail,
  deleteCrmEmail,
  deleteCrmEmailAttachment,
  downloadCrmEmailAttachment,
  getCrmEmail,
  listCrmEmails,
  listRelatedCrmEmails,
  normalizeCrmEmail,
  relatedEmailsPath,
  retryCrmEmail,
  sendCrmEmail,
  updateCrmEmail,
  workspaceEmailsPath,
} from "@/lib/emails/api";
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
const ATTACHMENT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const RELATED_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const DECOY_PATH = "/v1/__no_such_module_emails_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/emails" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/emails` },
  { method: "GET", path: `/v1/emails/${ID}` },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/emails/${ID}` },
  { method: "POST", path: "/v1/emails" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/emails` },
  { method: "PATCH", path: `/v1/emails/${ID}` },
  { method: "PATCH", path: `/v1/workspaces/${SESSION.workspaceId}/emails/${ID}` },
  { method: "DELETE", path: `/v1/emails/${ID}` },
  { method: "DELETE", path: `/v1/workspaces/${SESSION.workspaceId}/emails/${ID}` },
  { method: "POST", path: `/v1/emails/${ID}/send` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/emails/${ID}/send`,
  },
  { method: "POST", path: `/v1/emails/${ID}/retry` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/emails/${ID}/retry`,
  },
  { method: "POST", path: `/v1/emails/${ID}/cancel` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/emails/${ID}/cancel`,
  },
  { method: "POST", path: `/v1/emails/${ID}/apply-template` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/emails/${ID}/apply-template`,
  },
  { method: "POST", path: `/v1/emails/${ID}/attachments` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/emails/${ID}/attachments`,
  },
  {
    method: "DELETE",
    path: `/v1/emails/${ID}/attachments/${ATTACHMENT_ID}`,
  },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/emails/${ID}/attachments/${ATTACHMENT_ID}`,
  },
  {
    method: "GET",
    path: `/v1/emails/${ID}/attachments/${ATTACHMENT_ID}/download`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/emails/${ID}/attachments/${ATTACHMENT_ID}/download`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/LEAD/${RELATED_ID}/emails`,
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

export function smokeEmailsWiring() {
  const api = readSrc("src/lib/emails/api.ts");
  if (!api.includes("workspaceEmailsPath")) {
    fail("emails client missing workspaceEmailsPath");
  }
  for (const name of [
    "listCrmEmails",
    "getCrmEmail",
    "listRelatedCrmEmails",
    "createCrmEmail",
    "updateCrmEmail",
    "deleteCrmEmail",
    "sendCrmEmail",
    "retryCrmEmail",
    "cancelCrmEmail",
    "applyCrmEmailTemplate",
    "attachCrmEmailObject",
    "deleteCrmEmailAttachment",
    "downloadCrmEmailAttachment",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`emails client missing ${name}`);
    }
  }

  if (!api.includes("crmBffFetch")) {
    fail("emails client must call crmBffFetch in the browser");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"emails"') || !bff.includes('path.includes("emails")')) {
    fail("BFF proxy does not allow emails");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/emails"',
    'path: "/emails/:id"',
    'path: "/emails/:id/send"',
    'path: "/emails/:id/retry"',
    'path: "/emails/:id/cancel"',
    'path: "/emails/:id/apply-template"',
    'path: "/emails/:id/attachments"',
    'path: "/emails/:id/attachments/:attachmentId"',
    'path: "/emails/:id/attachments/:attachmentId/download"',
    'path: "/workspaces/:workspaceId/emails"',
    'path: "/workspaces/:workspaceId/:relatedType/:relatedId/emails"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/activities/emails/page.tsx");
  if (!page.includes("useCrmEmails")) {
    fail("emails page does not call useCrmEmails");
  }
  if (!page.includes("onSync={crm.refresh}")) {
    fail("emails page does not sync through useCrmEmails.refresh");
  }

  const hook = readSrc("src/lib/emails/use-crm-emails.ts");
  if (!hook.includes("replaceCrmEmails")) {
    fail("emails hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("emails hook must mark a successful empty list as Live CRM");
  }

  const workspace = readSrc(
    "src/components/activities/emails/EmailsWorkspace.tsx",
  );
  if (!workspace.includes("onSync")) {
    fail("email workspace does not accept an onSync CRM refresh");
  }

  const store = readSrc("src/lib/emails/store.ts");
  if (store.includes("withMissingSeeds")) {
    fail("emails store must not re-inject demo seed rows");
  }

  const detail = readSrc(
    "src/components/activities/emails/detail/EmailDetailClient.tsx",
  );
  for (const name of [
    "getCrmEmail",
    "sendCrmEmail",
    "retryCrmEmail",
    "cancelCrmEmail",
    "deleteCrmEmail",
    "downloadCrmEmailAttachment",
    "deleteCrmEmailAttachment",
  ]) {
    if (!detail.includes(name)) {
      fail(`email detail does not call ${name}`);
    }
  }

  const create = readSrc(
    "src/components/activities/emails/create/CreateEmailForm.tsx",
  );
  if (!create.includes("createCrmEmail") || !create.includes("sendCrmEmail")) {
    fail("create email form does not call createCrmEmail/sendCrmEmail");
  }
  if (!create.includes("applyCrmEmailTemplate") || !create.includes("attachCrmEmailObject")) {
    fail("create email form does not call apply-template/attachments");
  }

  const normalized = normalizeCrmEmail(
    {
      id: "em1",
      subject: "Follow up",
      status: "SENT",
      to: ["ada@example.com"],
      from: "broker@finconnex.com",
      body: "Hello",
    },
    0,
  );
  if (normalized.subject !== "Follow up" || normalized.status !== "Sent") {
    fail("normalizeCrmEmail did not map Swagger-shaped fields");
  }
}

export async function smokeEmailsMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(String(input));
    hits.push(`${method} ${parsed.pathname}`);
    if (parsed.pathname.endsWith("/download")) {
      return new Response(new Blob(["pdf"], { type: "application/pdf" }), {
        status: 200,
      });
    }
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          items: [
            {
              id: ID,
              subject: "Follow up",
              status: "DRAFT",
              to: ["ada@example.com"],
              from: "broker@finconnex.com",
              body: "Hello",
            },
          ],
          id: ATTACHMENT_ID,
          name: "note.pdf",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmEmails();
    await getCrmEmail(ID);
    await listRelatedCrmEmails("LEAD", RELATED_ID);
    await createCrmEmail({
      subject: "New",
      body: "Hi",
      to: ["ada@example.com"],
    });
    await updateCrmEmail(ID, { subject: "Updated" });
    await sendCrmEmail(ID);
    await retryCrmEmail(ID);
    await cancelCrmEmail(ID);
    await applyCrmEmailTemplate(ID, { template: "Follow-up Template" });
    await attachCrmEmailObject(ID, { objectType: "DOCUMENT", objectId: RELATED_ID });
    await downloadCrmEmailAttachment(ID, ATTACHMENT_ID);
    await deleteCrmEmailAttachment(ID, ATTACHMENT_ID);
    await deleteCrmEmail(ID);

    const expected = [
      `GET ${workspaceEmailsPath(SESSION.workspaceId)}`,
      `GET ${workspaceEmailsPath(SESSION.workspaceId, `/${ID}`)}`,
      `GET ${relatedEmailsPath(SESSION.workspaceId, "LEAD", RELATED_ID)}`,
      `POST ${workspaceEmailsPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceEmailsPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceEmailsPath(SESSION.workspaceId, `/${ID}/send`)}`,
      `POST ${workspaceEmailsPath(SESSION.workspaceId, `/${ID}/retry`)}`,
      `POST ${workspaceEmailsPath(SESSION.workspaceId, `/${ID}/cancel`)}`,
      `POST ${workspaceEmailsPath(SESSION.workspaceId, `/${ID}/apply-template`)}`,
      `POST ${workspaceEmailsPath(SESSION.workspaceId, `/${ID}/attachments`)}`,
      `GET ${workspaceEmailsPath(SESSION.workspaceId, `/${ID}/attachments/${ATTACHMENT_ID}/download`)}`,
      `DELETE ${workspaceEmailsPath(SESSION.workspaceId, `/${ID}/attachments/${ATTACHMENT_ID}`)}`,
      `DELETE ${workspaceEmailsPath(SESSION.workspaceId, `/${ID}`)}`,
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

export async function smokeEmailsLive() {
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

export async function runEmailsSmoke() {
  installSmokePolyfill();
  console.log("CRM Emails API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeEmailsWiring();
  console.log("   OK — client, catalog, list page, create, detail");

  console.log("\n2) Mock fetch (workspace routes)…");
  await smokeEmailsMock();
  console.log("   OK — list/get/create/update/send/retry/cancel/template/attachments/delete");

  console.log("\n3) Live CRM probe (decoy 404 vs emails 401)…");
  const live = await smokeEmailsLive();
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
  if (!live.ok) fail("live emails probe failed");

  console.log("\nCRM Emails API smoke passed.");
}

runAsCli(runEmailsSmoke);
