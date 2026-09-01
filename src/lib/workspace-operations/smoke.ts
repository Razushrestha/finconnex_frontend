/**
 * Cross-check workspace-operations Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/workspace-operations/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  activateCrmWorkspaceMember,
  deactivateCrmWorkspaceMember,
  getCrmWorkspaceMemberPreferences,
  getCrmWorkspaceProfile,
  leaveCrmWorkspace,
  listCrmWorkspaceMembersAdmin,
  normalizeWorkspaceProfile,
  updateCrmWorkspaceMemberPreferences,
  workspaceLeavePath,
  workspaceMemberActivatePath,
  workspaceMemberDeactivatePath,
  workspaceMemberPreferencesPath,
  workspaceMembersAdminPath,
  workspaceProfilePath,
} from "@/lib/workspace-operations/api";
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
const DECOY_PATH = "/v1/__no_such_module_workspace_operations_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/profile` },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/members-admin` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/me/preferences`,
  },
  {
    method: "PATCH",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/me/preferences`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/leave`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/${MEMBER_ID}/deactivate`,
  },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/members/${MEMBER_ID}/activate`,
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

export function smokeWorkspaceOperationsWiring() {
  const api = readSrc("src/lib/workspace-operations/api.ts");
  for (const name of [
    "getCrmWorkspaceProfile",
    "listCrmWorkspaceMembersAdmin",
    "getCrmWorkspaceMemberPreferences",
    "updateCrmWorkspaceMemberPreferences",
    "leaveCrmWorkspace",
    "deactivateCrmWorkspaceMember",
    "activateCrmWorkspaceMember",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`workspace-operations client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/workspaces/:workspaceId/profile"',
    'path: "/workspaces/:workspaceId/members-admin"',
    'path: "/workspaces/:workspaceId/members/me/preferences"',
    'path: "/workspaces/:workspaceId/members/leave"',
    'path: "/workspaces/:workspaceId/members/:memberId/deactivate"',
    'path: "/workspaces/:workspaceId/members/:memberId/activate"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const users = readSrc("src/components/settings/UsersSettingsClient.tsx");
  for (const name of [
    "listCrmWorkspaceMembersAdmin",
    "activateCrmWorkspaceMember",
    "deactivateCrmWorkspaceMember",
  ]) {
    if (!users.includes(name) && name !== "listCrmWorkspaceMembersAdmin") {
      fail(`Users settings does not call ${name}`);
    }
  }
  const hook = readSrc("src/lib/workspace-members/use-crm-workspace-members.ts");
  if (!hook.includes("listCrmWorkspaceMembersAdmin")) {
    fail("members hook does not search via members-admin");
  }

  const workspaces = readSrc(
    "src/components/settings/WorkspacesSettingsClient.tsx",
  );
  if (!workspaces.includes("useCrmWorkspaceProfile")) {
    fail("Workspaces settings does not load workspace profile");
  }
  if (!workspaces.includes("leaveCrmWorkspace")) {
    fail("Workspaces settings does not call leaveCrmWorkspace");
  }

  const form = readSrc("src/components/settings/SettingsFormClient.tsx");
  if (!form.includes("updateCrmWorkspaceMemberPreferences")) {
    fail("SettingsFormClient does not save member preferences");
  }
  if (!form.includes("useCrmWorkspaceMemberPreferences")) {
    fail("SettingsFormClient does not load member preferences");
  }

  const profile = normalizeWorkspaceProfile({
    name: "FinConnex HQ",
    status: "ACTIVE",
    plan: "GROWTH",
    locale: { timezone: "Australia/Sydney", language: "en", currency: "AUD" },
    checklist: [{ id: "branding", label: "Add logo", completed: true }],
  });
  if (
    profile.name !== "FinConnex HQ" ||
    profile.plan !== "GROWTH" ||
    profile.timezone !== "Australia/Sydney" ||
    !profile.checklist[0]?.done
  ) {
    fail("normalizeWorkspaceProfile did not map Swagger-shaped fields");
  }
}

export async function smokeWorkspaceOperationsMock() {
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
          name: "FinConnex HQ",
          plan: "GROWTH",
          items: [{ id: MEMBER_ID, email: "priya@example.com", role: "MEMBER" }],
          theme: "light",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await getCrmWorkspaceProfile();
    await listCrmWorkspaceMembersAdmin({ search: "priya" });
    await getCrmWorkspaceMemberPreferences();
    await updateCrmWorkspaceMemberPreferences({ theme: "dark" });
    await leaveCrmWorkspace();
    await deactivateCrmWorkspaceMember(MEMBER_ID);
    await activateCrmWorkspaceMember(MEMBER_ID);

    const expected = [
      `GET ${workspaceProfilePath(SESSION.workspaceId)}`,
      `GET ${workspaceMembersAdminPath(SESSION.workspaceId)}`,
      `GET ${workspaceMemberPreferencesPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceMemberPreferencesPath(SESSION.workspaceId)}`,
      `POST ${workspaceLeavePath(SESSION.workspaceId)}`,
      `POST ${workspaceMemberDeactivatePath(SESSION.workspaceId, MEMBER_ID)}`,
      `POST ${workspaceMemberActivatePath(SESSION.workspaceId, MEMBER_ID)}`,
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

export async function smokeWorkspaceOperationsLive() {
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

export async function runWorkspaceOperationsSmoke() {
  installSmokePolyfill();
  console.log("Workspace operations API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeWorkspaceOperationsWiring();
  console.log("   OK — client, catalog, Users / Workspaces / preferences");

  console.log("\n2) Mock fetch…");
  await smokeWorkspaceOperationsMock();
  console.log("   OK — all 7 Swagger routes hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokeWorkspaceOperationsLive();
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
  if (!live.ok) fail("live workspace-operations probe failed");

  console.log("\nWorkspace operations API smoke passed.");
}

runAsCli(runWorkspaceOperationsSmoke);
