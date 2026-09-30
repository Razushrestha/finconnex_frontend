/**
 * Platform Super Admin wiring + mock smoke.
 * Run via vitest: src/lib/platform/__tests__/platform.smoke.test.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession } from "@/lib/activity-timeline";
import {
  isPlatformAdminRole,
  isSuperAdminRole,
} from "@/lib/auth/platform";
import {
  activatePlatformWorkspace,
  getPlatformStats,
  listPlatformUsers,
  listPlatformWorkspaces,
  listPlatformWorkspaceMembers,
  platformStatsPath,
  platformUsersPath,
  platformWorkspacesPath,
  setPlatformUserGlobalRole,
  suspendPlatformWorkspace,
} from "@/lib/platform/api";

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

const SESSION = {
  baseUrl: "https://crm.smoke.test",
  accessToken: "smoke-access",
  workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

const WS_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

export function smokePlatformWiring() {
  if (!isPlatformAdminRole("ADMIN") || !isPlatformAdminRole("DEVELOPER")) {
    throw new Error("ADMIN and DEVELOPER must be platform admins");
  }
  if (!isPlatformAdminRole("SUPER_ADMIN") || !isSuperAdminRole("SUPER_ADMIN")) {
    throw new Error("SUPER_ADMIN must be recognized as platform + super admin");
  }
  if (isPlatformAdminRole("USER") || isPlatformAdminRole("OWNER")) {
    throw new Error("workspace OWNER/USER must not be treated as platform admin");
  }
  if (isSuperAdminRole("ADMIN")) {
    throw new Error("ADMIN must not satisfy isSuperAdminRole");
  }

  const login = readSrc("src/app/api/auth/login/route.ts");
  if (!login.includes("isPlatformAdmin")) {
    throw new Error("login route must flag platform admins");
  }
  if (!login.includes("crmListMyWorkspaces")) {
    throw new Error("platform login must not auto-select a tenant");
  }

  const form = readSrc("src/components/auth/LoginForm.tsx");
  if (!form.includes('"/platform"')) {
    throw new Error("LoginForm must send platform admins to /platform");
  }

  const dash = readSrc("src/app/(dashboard)/layout.tsx");
  if (!dash.includes('redirect("/platform")')) {
    throw new Error("dashboard must send workspace-less platform admins to /platform");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"admin"')) {
    throw new Error("BFF must allow /v1/admin");
  }
  if (!bff.includes('"platform"')) {
    throw new Error("BFF must allow /v1/platform");
  }
  if (!bff.includes("Platform admin access required")) {
    throw new Error("BFF must gate admin/platform routes on globalRole");
  }
  if (!bff.includes('path[0] === "admin" || path[0] === "platform"')) {
    throw new Error("BFF must gate both admin and platform roots");
  }

  const users = readSrc("src/components/settings/UsersSettingsClient.tsx");
  if (users.includes("deleteAdminUser")) {
    throw new Error("tenant Users settings must not call platform user delete");
  }

  const enter = readSrc("src/lib/admin/api.ts");
  if (!enter.includes("adoptCrmWorkspaceClient")) {
    throw new Error("enterWorkspace must adopt the new CRM browser session");
  }

  const activate = readSrc("src/lib/auth/crm-server.ts");
  if (activate.includes("crmListAdminWorkspaces(accessToken")) {
    throw new Error("activateWorkspace must not fall back to admin workspaces");
  }

  const api = readSrc("src/lib/platform/api.ts");
  for (const needle of [
    "platformStatsPath",
    "listPlatformUsers",
    "setPlatformUserGlobalRole",
    "listPlatformWorkspaces",
    "suspendPlatformWorkspace",
    "activatePlatformWorkspace",
    "restorePlatformWorkspace",
    "listPlatformWorkspaceMembers",
  ]) {
    if (!api.includes(needle)) {
      throw new Error(`platform api missing ${needle}`);
    }
  }

  const home = readSrc("src/components/platform/PlatformHome.tsx");
  if (!home.includes("getPlatformStats")) {
    throw new Error("PlatformHome must call getPlatformStats");
  }

  const workspaces = readSrc("src/components/platform/PlatformWorkspaces.tsx");
  if (!workspaces.includes("listPlatformWorkspaces")) {
    throw new Error("PlatformWorkspaces must call listPlatformWorkspaces");
  }
  if (!workspaces.includes("suspendPlatformWorkspace")) {
    throw new Error("PlatformWorkspaces must expose suspend");
  }

  const platformUsers = readSrc("src/components/platform/PlatformUsers.tsx");
  if (!platformUsers.includes("listPlatformUsers")) {
    throw new Error("PlatformUsers must call listPlatformUsers");
  }
  if (!platformUsers.includes("setPlatformUserGlobalRole")) {
    throw new Error("PlatformUsers must call setPlatformUserGlobalRole");
  }

  for (const rel of [
    "src/app/(platform)/platform/page.tsx",
    "src/app/(platform)/platform/workspaces/page.tsx",
    "src/app/(platform)/platform/users/page.tsx",
    "src/components/platform/PlatformShell.tsx",
    "src/lib/platform/api.ts",
  ]) {
    if (!existsSync(path.join(repoRoot(), rel))) {
      throw new Error(`missing ${rel}`);
    }
  }
}

export async function smokePlatformMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(String(input), SESSION.baseUrl);
    hits.push(`${method} ${parsed.pathname}`);

    if (parsed.pathname.endsWith("/platform/stats")) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            totalWorkspaces: 2,
            activeWorkspaces: 1,
            suspendedWorkspaces: 1,
            cancelledWorkspaces: 0,
            deletedWorkspaces: 0,
            totalUsers: 5,
            superAdmins: 1,
            workspacesByPlan: { FREE: 1, PRO: 1 },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (
      parsed.pathname.endsWith("/platform/users") &&
      method === "GET"
    ) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: [
            [
              {
                id: USER_ID,
                email: "ada@example.com",
                userName: "ada",
                name: "Ada Lovelace",
                globalRole: "USER",
                isVerified: true,
                workspaceCount: 1,
                createdAt: "2026-01-01T00:00:00.000Z",
                deletedAt: null,
              },
            ],
            1,
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (parsed.pathname.includes("/global-role") && method === "PATCH") {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            id: USER_ID,
            email: "ada@example.com",
            userName: "ada",
            name: "Ada Lovelace",
            globalRole: "ADMIN",
            isVerified: true,
            workspaceCount: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            deletedAt: null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (
      parsed.pathname.endsWith("/platform/workspaces") &&
      method === "GET"
    ) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: [
            [
              {
                id: WS_ID,
                name: "Acme",
                slug: "acme",
                status: "ACTIVE",
                plan: "PRO",
                memberCount: 3,
                owners: [],
                trialEndsAt: null,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-02T00:00:00.000Z",
                deletedAt: null,
              },
            ],
            1,
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (parsed.pathname.endsWith("/suspend") && method === "POST") {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            id: WS_ID,
            name: "Acme",
            slug: "acme",
            status: "SUSPENDED",
            plan: "PRO",
            memberCount: 3,
            owners: [],
            trialEndsAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
            deletedAt: null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (parsed.pathname.endsWith("/activate") && method === "POST") {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            id: WS_ID,
            name: "Acme",
            slug: "acme",
            status: "ACTIVE",
            plan: "PRO",
            memberCount: 3,
            owners: [],
            trialEndsAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
            deletedAt: null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (parsed.pathname.endsWith("/members") && method === "GET") {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: [
            {
              membershipId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
              userId: USER_ID,
              email: "ada@example.com",
              name: "Ada Lovelace",
              role: "OWNER",
              isActive: true,
              joinedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ statusCode: 404, message: "miss" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const stats = await getPlatformStats();
    if (stats.totalWorkspaces !== 2 || stats.superAdmins !== 1) {
      throw new Error("getPlatformStats did not map payload");
    }

    const users = await listPlatformUsers({ page: 1, limit: 20 });
    if (users.items[0]?.email !== "ada@example.com") {
      throw new Error("listPlatformUsers missed user");
    }

    const updated = await setPlatformUserGlobalRole(USER_ID, "ADMIN");
    if (updated.globalRole !== "ADMIN") {
      throw new Error("setPlatformUserGlobalRole failed");
    }

    const workspaces = await listPlatformWorkspaces({ page: 1 });
    if (workspaces.items[0]?.slug !== "acme") {
      throw new Error("listPlatformWorkspaces missed workspace");
    }

    const suspended = await suspendPlatformWorkspace(WS_ID);
    if (suspended.status !== "SUSPENDED") {
      throw new Error("suspendPlatformWorkspace failed");
    }
    const activated = await activatePlatformWorkspace(WS_ID);
    if (activated.status !== "ACTIVE") {
      throw new Error("activatePlatformWorkspace failed");
    }

    const members = await listPlatformWorkspaceMembers(WS_ID);
    if (members[0]?.role !== "OWNER") {
      throw new Error("listPlatformWorkspaceMembers missed member");
    }

    const expected = [
      `GET ${platformStatsPath()}`,
      `GET ${platformUsersPath()}`,
      `PATCH ${platformUsersPath(`/${USER_ID}/global-role`)}`,
      `GET ${platformWorkspacesPath()}`,
      `POST ${platformWorkspacesPath(`/${WS_ID}/suspend`)}`,
      `POST ${platformWorkspacesPath(`/${WS_ID}/activate`)}`,
      `GET ${platformWorkspacesPath(`/${WS_ID}/members`)}`,
    ];
    for (const hit of expected) {
      if (!hits.includes(hit)) {
        throw new Error(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
  } finally {
    bindCrmSession(null);
    globalThis.fetch = origFetch;
  }
}
