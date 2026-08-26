/**
 * Cross-check Team Chat CRM routes from live Swagger.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/chat/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  addCrmConversationMember,
  addCrmMessageReaction,
  createCrmChatMessage,
  createCrmConversation,
  deleteCrmChatMessage,
  deleteCrmConversation,
  getCrmChatUnreadCount,
  getCrmConversation,
  listCrmChatMessages,
  listCrmConversations,
  markCrmConversationRead,
  markCrmMessageRead,
  normalizeCrmConversation,
  normalizeCrmMessage,
  removeCrmConversationMember,
  removeCrmMessageReaction,
  updateCrmChatMessage,
  updateCrmConversation,
  workspaceChatPath,
} from "@/lib/chat/api";
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

const CONV_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MSG_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const USER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const REACTION = "👍";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/chat/conversations` },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/chat/conversations` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/conversations/${CONV_ID}`,
  },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/conversations/${CONV_ID}`,
  },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/conversations/${CONV_ID}`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/conversations/${CONV_ID}/members`,
  },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/conversations/${CONV_ID}/members/${USER_ID}`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/conversations/${CONV_ID}/messages`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/conversations/${CONV_ID}/messages`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/conversations/${CONV_ID}/read`,
  },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/messages/${MSG_ID}`,
  },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/messages/${MSG_ID}`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/messages/${MSG_ID}/read`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/messages/${MSG_ID}/reactions`,
  },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/messages/${MSG_ID}/reactions/${encodeURIComponent(REACTION)}`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/chat/unread-count`,
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

export function smokeChatWiring() {
  const api = readSrc("src/lib/chat/api.ts");
  for (const name of [
    "listCrmConversations",
    "getCrmConversation",
    "createCrmConversation",
    "updateCrmConversation",
    "deleteCrmConversation",
    "addCrmConversationMember",
    "removeCrmConversationMember",
    "listCrmChatMessages",
    "createCrmChatMessage",
    "updateCrmChatMessage",
    "deleteCrmChatMessage",
    "markCrmConversationRead",
    "markCrmMessageRead",
    "addCrmMessageReaction",
    "removeCrmMessageReaction",
    "getCrmChatUnreadCount",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`chat client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/workspaces/${workspaceId}/chat${suffix}`")) {
    fail("chat client missing workspace chat path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/workspaces/:workspaceId/chat/conversations"',
    'path: "/workspaces/:workspaceId/chat/conversations/:conversationId"',
    'path: "/workspaces/:workspaceId/chat/conversations/:conversationId/members"',
    'path: "/workspaces/:workspaceId/chat/conversations/:conversationId/messages"',
    'path: "/workspaces/:workspaceId/chat/conversations/:conversationId/read"',
    'path: "/workspaces/:workspaceId/chat/messages/:messageId"',
    'path: "/workspaces/:workspaceId/chat/messages/:messageId/reactions"',
    'path: "/workspaces/:workspaceId/chat/unread-count"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/activities/team-chat/page.tsx");
  if (!page.includes("useCrmChat")) {
    fail("team-chat page does not call useCrmChat");
  }
  if (!page.includes("createCrmChatMessage")) {
    fail("team-chat page does not call createCrmChatMessage");
  }

  const conv = normalizeCrmConversation(
    {
      id: CONV_ID,
      name: "sales",
      type: "GROUP",
      unreadCount: 3,
      description: "Pipeline",
      lastMessage: { body: "Hello", createdAt: "2026-08-25T01:00:00.000Z" },
    },
    0,
  );
  if (!conv.name.includes("sales") || conv.unread !== 3) {
    fail("normalizeCrmConversation did not map Swagger-shaped fields");
  }

  const msg = normalizeCrmMessage(
    {
      id: MSG_ID,
      body: "Ping",
      authorName: "Ada",
      createdAt: "2026-08-25T01:00:00.000Z",
    },
    CONV_ID,
    0,
  );
  if (msg.body !== "Ping" || msg.channelId !== CONV_ID) {
    fail("normalizeCrmMessage did not map Swagger-shaped fields");
  }
}

export async function smokeChatMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(url);
    hits.push(`${method} ${parsed.pathname}`);

    if (parsed.pathname.endsWith("/unread-count")) {
      return new Response(JSON.stringify({ statusCode: 200, data: { count: 2 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (parsed.pathname.includes("/messages") && method === "GET") {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            items: [
              {
                id: MSG_ID,
                body: "Hello",
                authorName: "Ada",
                createdAt: "2026-08-25T01:00:00.000Z",
              },
            ],
          },
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
              id: CONV_ID,
              name: "sales",
              type: "GROUP",
              unreadCount: 1,
              description: "Pipeline",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmConversations();
    await getCrmConversation(CONV_ID);
    await createCrmConversation({ name: "ops", type: "GROUP" });
    await updateCrmConversation(CONV_ID, { name: "sales-2" });
    await addCrmConversationMember(CONV_ID, USER_ID);
    await listCrmChatMessages(CONV_ID);
    await createCrmChatMessage(CONV_ID, { body: "Hi" });
    await markCrmConversationRead(CONV_ID);
    await updateCrmChatMessage(MSG_ID, "Updated");
    await markCrmMessageRead(MSG_ID);
    await addCrmMessageReaction(MSG_ID, REACTION);
    await removeCrmMessageReaction(MSG_ID, REACTION);
    await getCrmChatUnreadCount();
    await removeCrmConversationMember(CONV_ID, USER_ID);
    await deleteCrmChatMessage(MSG_ID);
    await deleteCrmConversation(CONV_ID);

    const base = workspaceChatPath(SESSION.workspaceId);
    const expected = [
      `GET ${base}/conversations`,
      `GET ${base}/conversations/${CONV_ID}`,
      `POST ${base}/conversations`,
      `PATCH ${base}/conversations/${CONV_ID}`,
      `POST ${base}/conversations/${CONV_ID}/members`,
      `GET ${base}/conversations/${CONV_ID}/messages`,
      `POST ${base}/conversations/${CONV_ID}/messages`,
      `POST ${base}/conversations/${CONV_ID}/read`,
      `PATCH ${base}/messages/${MSG_ID}`,
      `POST ${base}/messages/${MSG_ID}/read`,
      `POST ${base}/messages/${MSG_ID}/reactions`,
      `DELETE ${base}/messages/${MSG_ID}/reactions/${encodeURIComponent(REACTION)}`,
      `GET ${base}/unread-count`,
      `DELETE ${base}/conversations/${CONV_ID}/members/${USER_ID}`,
      `DELETE ${base}/messages/${MSG_ID}`,
      `DELETE ${base}/conversations/${CONV_ID}`,
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

export async function smokeChatLive(): Promise<{
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

  for (const route of LIVE_ROUTES) {
    try {
      const res = await fetch(`${base}${route.path}`, {
        method: route.method,
        headers: {
          Accept: "application/json",
          ...(route.method === "POST" || route.method === "PATCH"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body:
          route.method === "POST" || route.method === "PATCH" ? "{}" : undefined,
      });
      const routed = res.status !== 404 && res.status !== 405;
      if (!routed) ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: res.status,
        note:
          res.status === 401 || res.status === 403
            ? "route live, auth required"
            : routed
              ? `HTTP ${res.status}`
              : "missing route",
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

export async function runChatSmoke() {
  installSmokePolyfill();
  console.log("Team Chat API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeChatWiring();
  console.log("   OK — chat client, catalog, team-chat page");

  console.log("\n2) Mock fetch…");
  await smokeChatMock();
  console.log("   OK — conversations / messages / reactions / read / unread");

  console.log("\n3) Live CRM probe…");
  const live = await smokeChatLive();
  for (const row of live.rows) {
    const mark =
      row.status !== 404 && row.status !== 405 && row.status !== 0
        ? "OK"
        : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (!live.ok) fail("one or more live team-chat routes are missing");

  console.log("\nTeam Chat API smoke passed.");
}

runAsCli(runChatSmoke);
