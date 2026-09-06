/**
 * Cross-check Messages Swagger routes (global + workspace twins).
 * Run: npx tsx --tsconfig tsconfig.json src/lib/messages/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  attachCrmMessageObject,
  cancelCrmMessage,
  createCrmMessage,
  deleteCrmMessage,
  deleteCrmMessageAttachment,
  downloadCrmMessageAttachment,
  getCrmMessage,
  listAllCrmMessages,
  listCrmMessages,
  listRecentCrmMessages,
  listRelatedCrmMessages,
  listUnreadCrmMessages,
  markCrmMessageRead,
  markCrmMessageUnread,
  normalizeMessage,
  relatedMessagesPath,
  retryCrmMessage,
  sendCrmMessage,
  updateCrmMessage,
  workspaceMessagesPath,
} from "@/lib/messages/api";
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
const DECOY_PATH = "/v1/__no_such_module_messages_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/messages" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/messages` },
  { method: "GET", path: "/v1/messages/all" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/messages/all` },
  { method: "GET", path: "/v1/messages/recent" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/messages/recent` },
  { method: "GET", path: "/v1/messages/unread" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/messages/unread` },
  { method: "GET", path: `/v1/messages/${ID}` },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}` },
  { method: "POST", path: "/v1/messages" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/messages` },
  { method: "PATCH", path: `/v1/messages/${ID}` },
  { method: "PATCH", path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}` },
  { method: "DELETE", path: `/v1/messages/${ID}` },
  { method: "DELETE", path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}` },
  { method: "POST", path: `/v1/messages/${ID}/read` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}/read`,
  },
  { method: "POST", path: `/v1/messages/${ID}/unread` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}/unread`,
  },
  { method: "POST", path: `/v1/messages/${ID}/send` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}/send`,
  },
  { method: "POST", path: `/v1/messages/${ID}/retry` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}/retry`,
  },
  { method: "POST", path: `/v1/messages/${ID}/cancel` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}/cancel`,
  },
  { method: "POST", path: `/v1/messages/${ID}/attachments` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}/attachments`,
  },
  {
    method: "DELETE",
    path: `/v1/messages/${ID}/attachments/${ATTACHMENT_ID}`,
  },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}/attachments/${ATTACHMENT_ID}`,
  },
  {
    method: "GET",
    path: `/v1/messages/${ID}/attachments/${ATTACHMENT_ID}/download`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/messages/${ID}/attachments/${ATTACHMENT_ID}/download`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/LEAD/${RELATED_ID}/messages`,
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

export function smokeMessagesWiring() {
  const api = readSrc("src/lib/messages/api.ts");
  if (!api.includes("workspaceMessagesPath")) {
    fail("messages client missing workspaceMessagesPath");
  }
  if (!api.includes("relatedMessagesPath")) {
    fail("messages client missing relatedMessagesPath");
  }
  if (api.includes("/restore")) {
    fail("messages Swagger has no restore route");
  }
  if (api.includes("apply-template")) {
    fail("messages Swagger has no apply-template route");
  }
  for (const name of [
    "listCrmMessages",
    "listAllCrmMessages",
    "listRecentCrmMessages",
    "listUnreadCrmMessages",
    "getCrmMessage",
    "listRelatedCrmMessages",
    "createCrmMessage",
    "updateCrmMessage",
    "deleteCrmMessage",
    "markCrmMessageRead",
    "markCrmMessageUnread",
    "sendCrmMessage",
    "retryCrmMessage",
    "cancelCrmMessage",
    "attachCrmMessageObject",
    "deleteCrmMessageAttachment",
    "downloadCrmMessageAttachment",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`messages client missing ${name}`);
    }
  }

  if (!api.includes("crmBffFetch")) {
    fail("messages client must call crmBffFetch in the browser");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"messages"') || !bff.includes('path.includes("messages")')) {
    fail("BFF proxy does not allow messages");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/messages"',
    'path: "/messages/all"',
    'path: "/messages/recent"',
    'path: "/messages/unread"',
    'path: "/messages/:id"',
    'path: "/messages/:id/read"',
    'path: "/messages/:id/unread"',
    'path: "/messages/:id/send"',
    'path: "/messages/:id/retry"',
    'path: "/messages/:id/cancel"',
    'path: "/messages/:id/attachments"',
    'path: "/messages/:id/attachments/:attachmentId"',
    'path: "/messages/:id/attachments/:attachmentId/download"',
    'path: "/workspaces/:workspaceId/messages"',
    'path: "/workspaces/:workspaceId/messages/all"',
    'path: "/workspaces/:workspaceId/:relatedType/:relatedId/messages"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/activities/messages/page.tsx");
  if (!page.includes("useCrmMessages")) {
    fail("messages page does not call useCrmMessages");
  }

  const hook = readSrc("src/lib/messages/use-crm-messages.ts");
  if (!hook.includes("listAllCrmMessages") || !hook.includes("listUnreadCrmMessages")) {
    fail("messages hook does not load all/unread lists");
  }
  if (!hook.includes("replaceCrmMessages")) {
    fail("messages hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("messages hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc(
    "src/components/activities/messages/CreateMessageForm.tsx",
  );
  if (!create.includes("createCrmMessage") || !create.includes("sendCrmMessage")) {
    fail("create message form does not call createCrmMessage/sendCrmMessage");
  }

  const table = readSrc(
    "src/components/activities/messages/MessagesListTable.tsx",
  );
  for (const name of [
    "getCrmMessage",
    "sendCrmMessage",
    "retryCrmMessage",
    "cancelCrmMessage",
    "deleteCrmMessage",
    "downloadCrmMessageAttachment",
    "markCrmMessageRead",
    "markCrmMessageUnread",
  ]) {
    if (!table.includes(name)) {
      fail(`messages list table does not call ${name}`);
    }
  }

  const normalized = normalizeMessage(
    {
      id: "msg1",
      subject: "Follow up",
      status: "SENT",
      type: "EXTERNAL",
      to: "ada@example.com",
      from: "broker@finconnex.com",
      body: "Hello",
    },
    0,
  );
  if (normalized.subject !== "Follow up" || normalized.status !== "Sent") {
    fail("normalizeMessage did not map Swagger-shaped fields");
  }
  if (normalized.type !== "External") {
    fail("normalizeMessage did not map EXTERNAL type");
  }
}

export async function smokeMessagesMock() {
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
              type: "EXTERNAL",
              to: "ada@example.com",
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
    await listCrmMessages();
    await listAllCrmMessages();
    await listRecentCrmMessages();
    await listUnreadCrmMessages();
    await getCrmMessage(ID);
    await listRelatedCrmMessages("LEAD", RELATED_ID);
    await createCrmMessage({
      type: "External",
      subject: "New",
      body: "Hi",
      to: "ada@example.com",
    });
    await updateCrmMessage(ID, { subject: "Updated" });
    await markCrmMessageRead(ID);
    await markCrmMessageUnread(ID);
    await sendCrmMessage(ID);
    await retryCrmMessage(ID);
    await cancelCrmMessage(ID);
    await attachCrmMessageObject(ID, {
      fileName: "note.pdf",
      storageKey: "ws/note.pdf",
    });
    await downloadCrmMessageAttachment(ID, ATTACHMENT_ID);
    await deleteCrmMessageAttachment(ID, ATTACHMENT_ID);
    await deleteCrmMessage(ID);

    const expected = [
      `GET ${workspaceMessagesPath(SESSION.workspaceId)}`,
      `GET ${workspaceMessagesPath(SESSION.workspaceId, "/all")}`,
      `GET ${workspaceMessagesPath(SESSION.workspaceId, "/recent")}`,
      `GET ${workspaceMessagesPath(SESSION.workspaceId, "/unread")}`,
      `GET ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}`)}`,
      `GET ${relatedMessagesPath(SESSION.workspaceId, "LEAD", RELATED_ID)}`,
      `POST ${workspaceMessagesPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}/read`)}`,
      `POST ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}/unread`)}`,
      `POST ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}/send`)}`,
      `POST ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}/retry`)}`,
      `POST ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}/cancel`)}`,
      `POST ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}/attachments`)}`,
      `GET ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}/attachments/${ATTACHMENT_ID}/download`)}`,
      `DELETE ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}/attachments/${ATTACHMENT_ID}`)}`,
      `DELETE ${workspaceMessagesPath(SESSION.workspaceId, `/${ID}`)}`,
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

export async function smokeMessagesLive() {
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

export async function runMessagesSmoke() {
  installSmokePolyfill();
  console.log("Messages API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeMessagesWiring();
  console.log("   OK — client, catalog, list page, create, detail actions");

  console.log("\n2) Mock fetch…");
  await smokeMessagesMock();
  console.log("   OK — workspace-scoped unique ops hit");

  console.log("\n3) Live CRM probe (decoy 404 vs messages 401)…");
  const live = await smokeMessagesLive();
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
  if (!live.ok) fail("live messages probe failed");

  console.log("\nMessages API smoke passed.");
}

runAsCli(runMessagesSmoke);
