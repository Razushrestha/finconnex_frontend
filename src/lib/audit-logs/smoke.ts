/**
 * Cross-check GET /v1/audit-logs (AuditController_findAll_v1).
 * Run: npx tsx --tsconfig tsconfig.json src/lib/audit-logs/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import { listAuditLogs, normalizeAuditLog } from "@/lib/audit-logs/api";
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

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeAuditLogWiring() {
  const api = readSrc("src/lib/audit-logs/api.ts");
  if (!api.includes("/v1/audit-logs")) {
    fail("audit-logs client missing GET /v1/audit-logs");
  }
  if (!api.includes("export async function listAuditLogs")) {
    fail("audit-logs client missing listAuditLogs");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  if (!catalog.includes('path: "/audit-logs"')) {
    fail("endpoint catalog missing /audit-logs");
  }

  const page = readSrc(
    "src/app/(dashboard)/settings/[category]/[subpage]/page.tsx",
  );
  if (!page.includes("security/audit-logs")) {
    fail("settings page does not mount AuditLogsSettingsClient");
  }

  const ui = readSrc("src/components/settings/AuditLogsSettingsClient.tsx");
  if (!ui.includes("listAuditLogs")) {
    fail("Audit Logs settings UI is not calling listAuditLogs");
  }

  const normalized = normalizeAuditLog(
    {
      id: "1",
      action: "USER_LOGIN",
      actorEmail: "a@example.com",
      entityType: "USER",
      entityId: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    0,
  );
  if (normalized.action !== "USER_LOGIN" || normalized.actor !== "a@example.com") {
    fail("normalizeAuditLog did not map Swagger-shaped fields");
  }
}

export async function smokeAuditLogMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(url);
    hits.push(`${method} ${parsed.pathname}`);

    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          items: [
            {
              id: "log-1",
              action: "LEAD_UPDATE",
              actorEmail: "ops@example.com",
              entityType: "LEAD",
              entityId: "lead-1",
              createdAt: "2026-08-25T00:00:00.000Z",
            },
          ],
          metadata: { totalItems: 1, currentPage: 1, itemsPerPage: 50 },
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const page = await listAuditLogs({ page: 1, limit: 50, search: "lead" });
    if (page.items.length !== 1 || page.items[0]?.action !== "LEAD_UPDATE") {
      fail("listAuditLogs mock did not unwrap the CRM envelope");
    }
    if (page.total !== 1) fail("listAuditLogs mock missed metadata.totalItems");
    if (!hits.some((h) => h === "GET /v1/audit-logs")) {
      fail(`mock fetch missed GET /v1/audit-logs (got ${hits.join(", ")})`);
    }
  } finally {
    bindCrmSession(null);
    globalThis.fetch = origFetch;
  }
}

export async function smokeAuditLogLive(): Promise<{
  status: number;
  ok: boolean;
  note: string;
}> {
  const base = (getCrmApiBaseUrl() || "https://finconnex.payperless.app").replace(
    /\/$/,
    "",
  );
  try {
    const res = await fetch(`${base}/v1/audit-logs?page=1&limit=1`, {
      headers: { Accept: "application/json" },
    });
    const routed = res.status !== 404 && res.status !== 405;
    return {
      status: res.status,
      ok: routed,
      note:
        res.status === 401 || res.status === 403
          ? "route live, auth required"
          : routed
            ? `HTTP ${res.status}`
            : "missing route",
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      note: err instanceof Error ? err.message : "network error",
    };
  }
}

export async function runAuditLogSmoke() {
  installSmokePolyfill();
  console.log("Audit logs API smoke…");

  console.log("\n1) Client + settings wiring…");
  smokeAuditLogWiring();
  console.log("   OK — GET /v1/audit-logs client, catalog, Settings → Audit Logs");

  console.log("\n2) Mock fetch…");
  await smokeAuditLogMock();
  console.log("   OK — listAuditLogs hit GET /v1/audit-logs");

  console.log("\n3) Live CRM probe…");
  const live = await smokeAuditLogLive();
  const mark = live.ok ? "OK" : "FAIL";
  console.log(`   ${mark}  GET /v1/audit-logs  ${live.status}  ${live.note}`);
  if (!live.ok) fail(`live route missing: GET /v1/audit-logs (${live.note})`);

  console.log("\nAudit logs API smoke passed.");
}

runAsCli(runAuditLogSmoke);
