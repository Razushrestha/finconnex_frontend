/**
 * Cross-check workspace-members Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/workspace-members/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  cancelCrmWorkspaceInvitation,
  deleteCrmWorkspaceMember,
  getCrmWorkspaceMember,
  getCrmWorkspaceMembersSummary,
  inviteCrmWorkspaceMember,
  listCrmWorkspaceMembers,
  mapWorkspaceMemberRole,
  normalizeWorkspaceMember,
  resendCrmWorkspaceInvitation,
  transferCrmWorkspaceOwnership,
  updateCrmWorkspaceMember,
  workspaceMembersPath,
  workspaceMembersSummaryPath,
  workspaceOwnershipTransferPath,
} from "@/lib/workspace-members/api";
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

const MEMBER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DECOY_PATH = "/v1/__no_such_module_workspace_members_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/members`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/members-summary`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/members`,
  },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/${MEMBER_ID}`,
  },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/${MEMBER_ID}`,
  },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/${MEMBER_ID}`,
  },
  {
    method: "DELETE",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/${MEMBER_ID}/invitation`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/${MEMBER_ID}/invitation/resend`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/ownership-transfer`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/import`,
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

export function smokeWorkspaceMembersWiring() {
  const api = readSrc("src/lib/workspace-members/api.ts");
  for (const name of [
    "listCrmWorkspaceMembers",
    "getCrmWorkspaceMember",
    "getCrmWorkspaceMembersSummary",
    "inviteCrmWorkspaceMember",
    "updateCrmWorkspaceMember",
    "deleteCrmWorkspaceMember",
    "cancelCrmWorkspaceInvitation",
    "resendCrmWorkspaceInvitation",
    "transferCrmWorkspaceOwnership",
    "importCrmWorkspaceMembers",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`workspace-members client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/workspaces/:workspaceId/members"',
    'path: "/workspaces/:workspaceId/members-summary"',
    'path: "/workspaces/:workspaceId/members/:memberId"',
    'path: "/workspaces/:workspaceId/members/:memberId/invitation"',
    'path: "/workspaces/:workspaceId/members/:memberId/invitation/resend"',
    'path: "/workspaces/:workspaceId/ownership-transfer"',
    'path: "/workspaces/:workspaceId/members/import"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const sidebar = readSrc("src/components/layout/Sidebar.tsx");
  if (!sidebar.includes('href: "/users"')) {
    fail("Sidebar missing Users nav item");
  }
  const usersPage = readSrc("src/app/(dashboard)/users/page.tsx");
  if (!usersPage.includes("UsersSettingsClient")) {
    fail("Users page does not mount UsersSettingsClient");
  }

  const ui = readSrc("src/components/settings/UsersSettingsClient.tsx");
  for (const name of [
    "useCrmWorkspaceMembers",
    "inviteCrmWorkspaceMember",
    "updateCrmWorkspaceMember",
    "deleteCrmWorkspaceMember",
    "cancelCrmWorkspaceInvitation",
    "resendCrmWorkspaceInvitation",
    "transferCrmWorkspaceOwnership",
  ]) {
    if (!ui.includes(name)) {
      fail(`Users settings does not call ${name}`);
    }
  }

  const hook = readSrc("src/lib/workspace-members/use-crm-workspace-members.ts");
  if (!hook.includes("replaceCrmWorkspaceMembers")) {
    fail("workspace-members hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("workspace-members hook must mark a successful empty list as Live CRM");
  }

  const normalized = normalizeWorkspaceMember(
    {
      id: MEMBER_ID,
      email: "priya@example.com",
      role: "MANAGER",
      status: "PENDING",
      user: { firstName: "Priya", lastName: "Mehta" },
    },
    0,
  );
  if (
    normalized.email !== "priya@example.com" ||
    mapWorkspaceMemberRole("MANAGER") !== "Manager" ||
    normalized.status !== "Invited" ||
    normalized.name !== "Priya Mehta"
  ) {
    fail("normalizeWorkspaceMember did not map Swagger-shaped fields");
  }
}

export async function smokeWorkspaceMembersMock() {
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
              id: MEMBER_ID,
              email: "priya@example.com",
              role: "MANAGER",
              status: "JOINED",
            },
          ],
          joined: 1,
          pending: 0,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmWorkspaceMembers();
    await getCrmWorkspaceMembersSummary();
    await getCrmWorkspaceMember(MEMBER_ID);
    await inviteCrmWorkspaceMember({
      email: "new@example.com",
      role: "User",
    });
    await updateCrmWorkspaceMember(MEMBER_ID, { role: "Manager" });
    await resendCrmWorkspaceInvitation(MEMBER_ID);
    await cancelCrmWorkspaceInvitation(MEMBER_ID);
    await transferCrmWorkspaceOwnership(MEMBER_ID);
    await deleteCrmWorkspaceMember(MEMBER_ID);

    const expected = [
      `GET ${workspaceMembersPath(SESSION.workspaceId)}`,
      `GET ${workspaceMembersSummaryPath(SESSION.workspaceId)}`,
      `GET ${workspaceMembersPath(SESSION.workspaceId, `/${MEMBER_ID}`)}`,
      `POST ${workspaceMembersPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceMembersPath(SESSION.workspaceId, `/${MEMBER_ID}`)}`,
      `POST ${workspaceMembersPath(SESSION.workspaceId, `/${MEMBER_ID}/invitation/resend`)}`,
      `DELETE ${workspaceMembersPath(SESSION.workspaceId, `/${MEMBER_ID}/invitation`)}`,
      `POST ${workspaceOwnershipTransferPath(SESSION.workspaceId)}`,
      `DELETE ${workspaceMembersPath(SESSION.workspaceId, `/${MEMBER_ID}`)}`,
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

export async function smokeWorkspaceMembersLive() {
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

export async function runWorkspaceMembersSmoke() {
  installSmokePolyfill();
  console.log("Workspace members API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeWorkspaceMembersWiring();
  console.log("   OK — client, catalog, Users settings");

  console.log("\n2) Mock fetch…");
  await smokeWorkspaceMembersMock();
  console.log("   OK — all 9 Swagger routes hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokeWorkspaceMembersLive();
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
  if (!live.ok) fail("live workspace-members probe failed");

  console.log("\nWorkspace members API smoke passed.");
}

runAsCli(runWorkspaceMembersSmoke);
