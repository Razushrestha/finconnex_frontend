/**
 * Cross-check Settings CRM routes from live Swagger.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/settings/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  getCrmSecuritySettings,
  getCrmSmtpTestStatus,
  getCrmWorkspaceCapabilities,
  getCrmWorkspaceSettings,
  normalizeCrmCapabilities,
  normalizeCrmSecuritySettings,
  normalizeCrmWorkspaceSettings,
  overlayCatalogValues,
  overlaySecurityValues,
  overlaySettingsValues,
  patchCrmWorkspaceSettings,
  getCrmSettingsCatalog,
  getCrmSettingsPage,
  putCrmSettingsPage,
  queueCrmSmtpTest,
  settingsPath,
  smtpIdempotencyKey,
  flagsFromCapabilities,
} from "@/lib/settings/api";
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

const JOB_ID = "smtp-test-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-1";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/settings" },
  { method: "GET", path: "/v1/settings/security" },
  { method: "GET", path: "/v1/settings/capabilities" },
  { method: "PATCH", path: "/v1/settings" },
  { method: "POST", path: "/v1/settings/smtp-test" },
  { method: "GET", path: `/v1/settings/smtp-test/${JOB_ID}` },
  { method: "GET", path: "/v1/settings/pages" },
  { method: "GET", path: "/v1/settings/pages/organization/company-profile" },
  { method: "PUT", path: "/v1/settings/pages/organization/company-profile" },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeSettingsWiring() {
  const api = readSrc("src/lib/settings/api.ts");
  for (const name of [
    "getCrmWorkspaceSettings",
    "patchCrmWorkspaceSettings",
    "getCrmSecuritySettings",
    "getCrmWorkspaceCapabilities",
    "queueCrmSmtpTest",
    "getCrmSmtpTestStatus",
    "getCrmSettingsCatalog",
    "getCrmSettingsPage",
    "putCrmSettingsPage",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`settings client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/settings${suffix}`")) {
    fail("settings client missing /v1/settings path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/settings"',
    'path: "/settings/security"',
    'path: "/settings/capabilities"',
    'path: "/settings/smtp-test"',
    'path: "/settings/smtp-test/:jobId"',
    'path: "/settings/pages"',
    'path: "/settings/pages/:category/:subpage"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const form = readSrc("src/components/settings/SettingsFormClient.tsx");
  if (!form.includes("useCrmSettings")) {
    fail("SettingsFormClient does not call useCrmSettings");
  }
  if (!form.includes("patchCrmWorkspaceSettings")) {
    fail("SettingsFormClient does not call patchCrmWorkspaceSettings");
  }
  if (!form.includes("overlayCatalogValues")) {
    fail("SettingsFormClient does not overlay catalog pages");
  }
  if (!form.includes("overlaySecurityValues")) {
    fail("SettingsFormClient does not overlay GET /settings/security");
  }
  if (!form.includes("catalog:")) {
    fail("SettingsFormClient does not PATCH catalog pages");
  }

  const smtp = readSrc("src/components/settings/SmtpSettingsClient.tsx");
  if (!smtp.includes("queueCrmSmtpTest")) {
    fail("SmtpSettingsClient does not call queueCrmSmtpTest");
  }
  if (!smtp.includes("Idempotency-Key") && !readSrc("src/lib/settings/api.ts").includes("Idempotency-Key")) {
    fail("SMTP test is not sent as an idempotent job");
  }

  const hook = readSrc("src/lib/settings/use-crm-settings.tsx");
  if (!hook.includes("SettingsCrmProvider")) {
    fail("settings hook missing SettingsCrmProvider");
  }
  if (!hook.includes("Promise.allSettled")) {
    fail("settings hook does not load GET settings/security/capabilities together");
  }

  const layout = readSrc("src/app/(dashboard)/settings/layout.tsx");
  if (!layout.includes("SettingsCrmProvider")) {
    fail("settings layout does not share one CRM settings session");
  }
  if (!layout.includes("SettingsCrmBadge")) {
    fail("settings layout missing SettingsCrmBadge");
  }

  const page = readSrc(
    "src/app/(dashboard)/settings/[category]/[subpage]/page.tsx",
  );
  if (!page.includes("CapabilitiesSettingsClient")) {
    fail("settings subpage does not mount CapabilitiesSettingsClient");
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"settings"')) {
    fail("BFF proxy does not allow /v1/settings");
  }

  const docs = readSrc("docs/settings-api.md");
  for (const fragment of [
    "GET /v1/settings",
    "PATCH /v1/settings",
    "GET /v1/settings/pages",
    "PUT /v1/settings/pages/:category/:subpage",
  ]) {
    if (!docs.includes(fragment)) {
      fail(`settings API docs missing ${fragment}`);
    }
  }

  const backendRoot = path.join(repoRoot(), "multi-crm-backend-main");
  if (existsSync(backendRoot)) {
    const mainCtl = readSrc(
      "multi-crm-backend-main/src/modules/settings/controllers/settings.controller.ts",
    );
    const extraCtl = readSrc(
      "multi-crm-backend-main/src/modules/settings/controllers/settings-enhancement.controller.ts",
    );
    if (!mainCtl.includes("@Get()") || !mainCtl.includes("@Patch()")) {
      fail("backend SettingsController missing GET/PATCH /v1/settings");
    }
    if (!extraCtl.includes("@Get('pages')")) {
      fail("backend missing GET /v1/settings/pages");
    }
    if (!extraCtl.includes("@Get('pages/:category/:subpage')")) {
      fail("backend missing GET /v1/settings/pages/:category/:subpage");
    }
    if (!extraCtl.includes("@Put('pages/:category/:subpage')")) {
      fail("backend missing PUT /v1/settings/pages/:category/:subpage");
    }
    if (!extraCtl.includes("@Get('capabilities')")) {
      fail("backend missing GET /v1/settings/capabilities");
    }
    const schema = readSrc("multi-crm-backend-main/prisma/schema.prisma");
    if (!schema.includes("catalog Json?")) {
      fail("Prisma WorkspaceSettings is missing catalog Json");
    }
    const migration = path.join(
      backendRoot,
      "prisma/migrations/20260913013000_workspace_settings_catalog/migration.sql",
    );
    if (!existsSync(migration)) {
      fail("catalog Prisma migration is missing");
    }
  }

  const settings = normalizeCrmWorkspaceSettings({
    id: "s1",
    primaryColor: "#3B82F6",
    dateFormat: "MM/DD/YYYY",
    enableLeads: true,
    passwordMinLength: 10,
    revision: 2,
  });
  if (settings.primaryColor !== "#3B82F6" || settings.passwordMinLength !== 10) {
    fail("normalizeCrmWorkspaceSettings did not map Swagger-shaped fields");
  }
  const overlaid = overlaySettingsValues(
    { minLength: 12, primaryColor: "#000" },
    settings,
  );
  if (overlaid.primaryColor !== "#3B82F6" || overlaid.minLength !== 10) {
    fail("overlaySettingsValues did not map form fields");
  }
  const cataloged = overlayCatalogValues(
    { companyName: "Local" },
    {
      ...settings,
      catalog: {
        "organization/company-profile": { companyName: "Acme Brokers" },
      },
    },
    "organization/company-profile",
  );
  if (cataloged.companyName !== "Acme Brokers") {
    fail("overlayCatalogValues did not apply catalog page values");
  }

  const security = normalizeCrmSecuritySettings({
    passwordMinLength: 8,
    enforce2FA: true,
    ipAllowlist: ["127.0.0.1"],
    sessionTimeoutMinutes: 60,
  });
  if (!security.enforce2FA || security.sessionTimeoutMinutes !== 60) {
    fail("normalizeCrmSecuritySettings did not map security fields");
  }
  const securityOverlay = overlaySecurityValues(
    { minLength: 12, idleMinutes: 30 },
    security,
  );
  if (
    securityOverlay.minLength !== 8 ||
    securityOverlay.idleMinutes !== 60
  ) {
    fail("overlaySecurityValues did not map password/session fields");
  }

  const caps = normalizeCrmCapabilities({
    workspaceId: SESSION.workspaceId,
    enabled: ["LEADS", "deals"],
    revision: 1,
  });
  if (!caps.enabled.includes("leads") || !caps.enabled.includes("deals")) {
    fail("normalizeCrmCapabilities did not map enabled modules");
  }
  const nested = normalizeCrmWorkspaceSettings({
    data: { settings: { primaryColor: "#abc", ipWhitelist: ["10.0.0.1"] } },
  });
  if (nested.primaryColor !== "#abc" || nested.ipAllowlist?.[0] !== "10.0.0.1") {
    fail("normalizeCrmWorkspaceSettings did not unwrap nested Swagger payloads");
  }
  const flags = flagsFromCapabilities(caps);
  if (!flags.enableLeads || !flags.enableDeals || flags.enablePosts) {
    fail("flagsFromCapabilities did not honor GET /settings/capabilities");
  }
  if (smtpIdempotencyKey("Admin@Example.com") !== "smtp-test:admin@example.com") {
    fail("smtp idempotency key is not stable per recipient");
  }
}

export async function smokeSettingsMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(url);
    hits.push(`${method} ${parsed.pathname}`);

    if (parsed.pathname.endsWith("/capabilities")) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: { workspaceId: SESSION.workspaceId, enabled: ["leads"], revision: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (parsed.pathname.endsWith("/security")) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            passwordMinLength: 8,
            enforce2FA: false,
            ipAllowlist: [],
            sessionTimeoutMinutes: 480,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (parsed.pathname.includes("/smtp-test")) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: { jobId: JOB_ID, id: JOB_ID, state: "queued" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (parsed.pathname.endsWith("/pages")) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data: {
            catalog: {
              "organization/company-profile": { companyName: "Acme Brokers" },
            },
            revision: 1,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (parsed.pathname.includes("/pages/")) {
      return new Response(
        JSON.stringify({
          statusCode: 200,
          data:
            method === "PUT"
              ? {
                  id: "s1",
                  workspaceId: SESSION.workspaceId,
                  revision: 2,
                  catalog: {
                    "organization/company-profile": { companyName: "Acme Brokers" },
                  },
                }
              : {
                  pageKey: "organization/company-profile",
                  values: { companyName: "Acme Brokers" },
                  revision: 1,
                },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          id: "s1",
          workspaceId: SESSION.workspaceId,
          primaryColor: "#3B82F6",
          enableLeads: true,
          revision: 1,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await getCrmWorkspaceSettings();
    await getCrmSecuritySettings();
    await getCrmWorkspaceCapabilities();
    await patchCrmWorkspaceSettings({ primaryColor: "#111111" });
    await queueCrmSmtpTest("admin@example.com");
    await getCrmSmtpTestStatus(JOB_ID);
    await getCrmSettingsCatalog();
    await getCrmSettingsPage("organization", "company-profile");
    await putCrmSettingsPage("organization", "company-profile", {
      companyName: "Acme Brokers",
    });

    const expected = [
      `GET ${settingsPath()}`,
      `GET ${settingsPath("/security")}`,
      `GET ${settingsPath("/capabilities")}`,
      `PATCH ${settingsPath()}`,
      `POST ${settingsPath("/smtp-test")}`,
      `GET ${settingsPath(`/smtp-test/${JOB_ID}`)}`,
      `GET ${settingsPath("/pages")}`,
      `GET ${settingsPath("/pages/organization/company-profile")}`,
      `PUT ${settingsPath("/pages/organization/company-profile")}`,
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

export async function smokeSettingsLive(): Promise<{
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
          ...(route.method === "POST" || route.method === "PATCH" || route.method === "PUT"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body:
          route.method === "POST"
            ? JSON.stringify({ recipient: "admin@example.com" })
            : route.method === "PATCH"
              ? "{}"
              : route.method === "PUT"
                ? JSON.stringify({ values: { companyName: "Acme Brokers" } })
                : undefined,
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

export async function runSettingsSmoke() {
  installSmokePolyfill();
  console.log("Settings API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeSettingsWiring();
  console.log("   OK — settings client, catalog, form/SMTP/capabilities UI");

  console.log("\n2) Mock fetch…");
  await smokeSettingsMock();
  console.log("   OK — GET/PATCH settings + pages catalog + security + smtp-test");

  console.log("\n3) Live CRM probe…");
  const live = await smokeSettingsLive();
  for (const row of live.rows) {
    const mark =
      row.status !== 404 && row.status !== 405 && row.status !== 0
        ? "OK"
        : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (!live.ok) fail("one or more live settings routes are missing");

  console.log("\nSettings API smoke passed.");
}

runAsCli(runSettingsSmoke);
