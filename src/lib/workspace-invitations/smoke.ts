/**
 * Cross-check public.workspace-invitations Swagger route.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/workspace-invitations/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  acceptWorkspaceInvitation,
  normalizeInvitationAccept,
  workspaceInvitationAcceptPath,
} from "@/lib/workspace-invitations/api";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;
const DECOY_PATH = "/v1/__no_such_module_workspace_invitations_probe__";
const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "POST", path: "/v1/workspaces/invitations/accept" },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeWorkspaceInvitationsWiring() {
  const api = readSrc("src/lib/workspace-invitations/api.ts");
  if (!api.includes('"/v1/workspaces/invitations/accept"')) {
    fail("workspace invitation client missing accept path");
  }
  if (!api.includes("export async function acceptWorkspaceInvitation")) {
    fail("workspace invitation client missing acceptWorkspaceInvitation");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  if (!catalog.includes('path: "/workspaces/invitations/accept"')) {
    fail("endpoint catalog missing /workspaces/invitations/accept");
  }

  const page = readSrc("src/app/(public)/invite/accept/page.tsx");
  if (!page.includes("AcceptWorkspaceInviteClient")) {
    fail("invite accept page does not render AcceptWorkspaceInviteClient");
  }

  const ui = readSrc("src/components/auth/AcceptWorkspaceInviteClient.tsx");
  if (!ui.includes("/api/auth/workspace-invitation/accept")) {
    fail("invite client is not wired to the accept API route");
  }

  const route = readSrc("src/app/api/auth/workspace-invitation/accept/route.ts");
  if (!route.includes("acceptWorkspaceInvitation")) {
    fail("accept API route does not call acceptWorkspaceInvitation");
  }

  const proxy = readSrc("src/proxy.ts");
  if (!proxy.includes('"/invite/"')) {
    fail("proxy does not treat /invite as a public path");
  }

  const normalized = normalizeInvitationAccept({
    workspace: { id: "w1", name: "Northshore" },
    accessToken: "a",
    refreshToken: "r",
    user: { id: "u1", email: "ada@example.com" },
  });
  if (
    normalized.workspaceId !== "w1" ||
    normalized.workspaceName !== "Northshore" ||
    normalized.accessToken !== "a"
  ) {
    fail("normalizeInvitationAccept did not map invitation fields");
  }
}

export async function smokeWorkspaceInvitationsMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const raw =
      typeof input === "string" ? input : (input as Request).url ?? String(input);
    const parsed = new URL(raw, "https://crm.smoke.test");
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: { workspaceId: "w1", workspaceName: "Northshore" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const accepted = await acceptWorkspaceInvitation("invite-token");
    if (accepted.workspaceId !== "w1") {
      fail("acceptWorkspaceInvitation did not unwrap CRM data");
    }
    const expected = `POST ${workspaceInvitationAcceptPath()}`;
    if (!hits.includes(expected)) {
      fail(`mock fetch missed ${expected} (got ${hits.join(", ")})`);
    }
  } finally {
    globalThis.fetch = origFetch;
  }
}

async function probeLive(base: string, method: string, path: string) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? "{}" : undefined,
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

function isRouted(status: number, message: string) {
  if (status === 404 && message.toLowerCase().includes("cannot")) return false;
  return status !== 404;
}

export async function smokeWorkspaceInvitationsLive() {
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
      const routed = isRouted(hit.status, hit.message);
      if (!routed) ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: hit.status,
        note: routed
          ? `routed: ${hit.message}`
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

export async function runWorkspaceInvitationsSmoke() {
  installSmokePolyfill();
  console.log("Workspace invitations API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeWorkspaceInvitationsWiring();
  console.log("   OK — client, catalog, invite accept page");

  console.log("\n2) Mock fetch…");
  await smokeWorkspaceInvitationsMock();
  console.log("   OK — POST /workspaces/invitations/accept");

  console.log("\n3) Live CRM probe…");
  const live = await smokeWorkspaceInvitationsLive();
  for (const row of live.rows) {
    const isDecoy = row.path === DECOY_PATH;
    const mark = isDecoy
      ? row.status === 404
        ? "OK"
        : "FAIL"
      : row.note.startsWith("routed:")
        ? "OK"
        : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (!live.ok) fail("live workspace invitations probe failed");

  console.log("\nWorkspace invitations API smoke passed.");
}

runAsCli(runWorkspaceInvitationsSmoke);
