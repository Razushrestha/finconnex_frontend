/**
 * Cross-check Smart Link hub and short-link routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/smart-links/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getCrmApiBaseUrl } from "@/lib/activity-timeline";
import { prepareHubForSave, type BrokerHubConfig } from "@/lib/broker-hub/types";
import {
  createCrmSmartShortLink,
  deleteCrmSmartHub,
  deleteCrmSmartShortLink,
  fetchPublishedHubBySlug,
  getCrmSmartHub,
  listCrmSmartHubs,
  listCrmSmartShortLinks,
  persistCrmHub,
  resolvePublicShortLink,
  toHubBody,
} from "@/lib/smart-links/api";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;

const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DECOY_PATH = "/v1/__no_such_module_smart_links_probe__";

const AUTH_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/smart-hubs" },
  { method: "POST", path: "/v1/smart-hubs" },
  { method: "GET", path: `/v1/smart-hubs/${ID}` },
  { method: "PATCH", path: `/v1/smart-hubs/${ID}` },
  { method: "DELETE", path: `/v1/smart-hubs/${ID}` },
  { method: "GET", path: "/v1/smart-short-links" },
  { method: "POST", path: "/v1/smart-short-links" },
  { method: "DELETE", path: `/v1/smart-short-links/${ID}` },
];

const PUBLIC_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/public/smart-hubs/smoke-missing-hub" },
  { method: "GET", path: "/v1/public/smart-short-links/smoke-missing" },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

function sampleHub(id?: string): BrokerHubConfig {
  return prepareHubForSave({
    id,
    brokerId: "me",
    hubName: "Jane Advising",
    profile: {
      slug: "jane-advising",
      avatarUrl: null,
      title: "Jane Chen",
      bio: "x".repeat(2100),
    },
    links: [],
    socials: [],
    published: true,
    templateId: "blank",
  });
}

export function smokeSmartLinksWiring() {
  const api = readSrc("src/lib/smart-links/api.ts");
  for (const name of [
    "listCrmSmartHubs",
    "getCrmSmartHub",
    "persistCrmHub",
    "deleteCrmSmartHub",
    "listCrmSmartShortLinks",
    "createCrmSmartShortLink",
    "deleteCrmSmartShortLink",
    "fetchPublishedHubBySlug",
    "saveBrokerHub",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`smart-links client missing ${name}`);
    }
  }
  if (!api.includes("avatarUrl: prepared.profile.avatarUrl || null")) {
    fail("hub save must send null so a removed photo is cleared");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/smart-hubs"',
    'path: "/smart-hubs/:id"',
    'path: "/smart-short-links"',
    'path: "/public/smart-hubs/:slug"',
    'path: "/public/smart-short-links/:alias"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"smart-hubs"') || !bff.includes('"smart-short-links"')) {
    fail("BFF proxy does not allow smart-hubs");
  }

  const builder = readSrc("src/app/(dashboard)/smart-link/builder/page.tsx");
  if (!builder.includes("saveBrokerHub")) {
    fail("hub builder does not save through the CRM");
  }

  const preview = readSrc("src/components/smart-links/BrokerHubPreview.tsx");
  if (!preview.includes("contained") || preview.includes("overflow-y-auto")) {
    fail("live preview must fit the window without an inner scrollbar");
  }

  const pages = readSrc("src/app/(dashboard)/smart-link/templates/page.tsx");
  if (!pages.includes("deleteCrmSmartHub") || !pages.includes("listCrmSmartHubs")) {
    fail("hub pages are missing list or delete");
  }

  const body = toHubBody(sampleHub());
  if (
    body.slug !== "jane-advising" ||
    body.title !== "Jane Chen" ||
    body.avatarUrl !== null ||
    typeof body.bio !== "string" ||
    body.bio.length !== 2000 ||
    !Array.isArray(body.links) ||
    body.published !== true
  ) {
    fail("hub body must match CreateSmartHubDto, including a cleared photo and a 2000-character bio");
  }
}

export async function smokeSmartLinksMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const raw = String(input);
    const parsed = raw.startsWith("http")
      ? new URL(raw)
      : new URL(raw, "http://smoke.local");
    hits.push(`${method} ${parsed.pathname}`);
    return new Response(
      JSON.stringify({
        statusCode: 200,
        data: {
          id: ID,
          slug: "jane-advising",
          hubName: "Jane Advising",
          title: "Jane Chen",
          bio: "",
          avatarUrl: null,
          links: [],
          socials: [],
          published: true,
          alias: "q3-report",
          destination: "https://example.com",
          clicks: 0,
          generateQr: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmSmartHubs();
    await getCrmSmartHub(ID);
    await persistCrmHub(sampleHub());
    await persistCrmHub(sampleHub(ID));
    await deleteCrmSmartHub(ID);
    await listCrmSmartShortLinks();
    await createCrmSmartShortLink({ destination: "https://example.com" });
    await deleteCrmSmartShortLink(ID);
    await fetchPublishedHubBySlug("jane-advising");
    await resolvePublicShortLink("q3-report");

    const expected = [
      "GET /api/auth/smart-link/smart-hubs",
      `GET /api/auth/smart-link/smart-hubs/${ID}`,
      "POST /api/auth/smart-link/smart-hubs",
      `PATCH /api/auth/smart-link/smart-hubs/${ID}`,
      `DELETE /api/auth/smart-link/smart-hubs/${ID}`,
      "GET /api/auth/smart-link/smart-short-links",
      "POST /api/auth/smart-link/smart-short-links",
      `DELETE /api/auth/smart-link/smart-short-links/${ID}`,
      "GET /api/auth/smart-link/public/smart-hubs/jane-advising",
      "GET /api/auth/smart-link/public/smart-short-links/q3-report",
    ];
    for (const hit of expected) {
      if (!hits.includes(hit)) {
        fail(`mock fetch missed ${hit} (got ${hits.join(", ")})`);
      }
    }
  } finally {
    globalThis.fetch = origFetch;
  }
}

async function probeLive(base: string, method: string, routePath: string) {
  const res = await fetch(`${base}${routePath}`, {
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
    /* keep the raw body */
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

function isPublicRoute(status: number, message: string) {
  const msg = message.toLowerCase();
  return (
    (status === 400 || status === 404) &&
    !msg.includes("cannot get") &&
    !msg.includes("cannot post")
  );
}

export async function smokeSmartLinksLive() {
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

  for (const route of AUTH_ROUTES) {
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

  for (const route of PUBLIC_ROUTES) {
    try {
      const hit = await probeLive(base, route.method, route.path);
      const routed = isPublicRoute(hit.status, hit.message);
      if (!routed) ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: hit.status,
        note: routed
          ? `public route: ${hit.message}`
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

export async function runSmartLinksSmoke() {
  installSmokePolyfill();
  console.log("Smart Links API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeSmartLinksWiring();
  console.log("   OK — hubs, short links, preview, and save body");

  console.log("\n2) Mock fetch…");
  await smokeSmartLinksMock();
  console.log("   OK — hub and short-link operations hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokeSmartLinksLive();
  for (const row of live.rows) {
    const isDecoy = row.path === DECOY_PATH;
    const mark = isDecoy
      ? row.status === 404
        ? "OK"
        : "FAIL"
      : row.note.startsWith("routed + auth required") ||
          row.note.startsWith("public route")
        ? "OK"
        : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (!live.ok) fail("live smart-links probe failed");

  console.log("\nSmart Links API smoke passed.");
}

runAsCli(runSmartLinksSmoke);
