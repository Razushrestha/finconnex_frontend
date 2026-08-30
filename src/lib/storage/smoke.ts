/**
 * Cross-check Storage Swagger route POST /v1/storage/upload.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/storage/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  normalizeCrmStorageObject,
  storageUploadPath,
  uploadCrmStorageFile,
} from "@/lib/storage/api";
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

const DECOY_PATH = "/v1/__no_such_module_storage_probe__";

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeStorageWiring() {
  const api = readSrc("src/lib/storage/api.ts");
  if (!api.includes("export async function uploadCrmStorageFile")) {
    fail("storage client missing uploadCrmStorageFile");
  }
  if (!api.includes("`/v1/storage/upload`") && !api.includes('"/v1/storage/upload"')) {
    fail("storage client missing /v1/storage/upload path");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  if (!catalog.includes('path: "/storage/upload"')) {
    fail("endpoint catalog missing /storage/upload");
  }

  const library = readSrc("src/app/(dashboard)/documents/library/page.tsx");
  if (!library.includes("uploadCrmStorageFile")) {
    fail("document library upload does not call uploadCrmStorageFile");
  }

  const attachments = readSrc(
    "src/app/(dashboard)/activities/attachments/page.tsx",
  );
  if (!attachments.includes("uploadCrmStorageFile")) {
    fail("attachments page does not call uploadCrmStorageFile");
  }

  const settings = readSrc("src/components/settings/SettingsFormClient.tsx");
  if (!settings.includes("uploadCrmStorageFile")) {
    fail("settings file fields do not call uploadCrmStorageFile");
  }

  const signature = readSrc("src/app/(dashboard)/signature/create/page.tsx");
  if (!signature.includes("uploadCrmStorageFile")) {
    fail("signature create does not call uploadCrmStorageFile");
  }

  const normalized = normalizeCrmStorageObject(
    {
      key: "ws/docs/contract.pdf",
      url: "https://cdn.example/contract.pdf",
      fileName: "contract.pdf",
      contentType: "application/pdf",
      size: 2048,
    },
    "fallback",
  );
  if (normalized.key !== "ws/docs/contract.pdf" || normalized.size !== 2048) {
    fail("normalizeCrmStorageObject did not map Swagger-shaped fields");
  }
}

export async function smokeStorageMock() {
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
          key: "ws/docs/note.pdf",
          url: "https://crm.smoke.test/note.pdf",
          fileName: "note.pdf",
          contentType: "application/pdf",
          size: 12,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const file = new File(["hello storage"], "note.pdf", {
      type: "application/pdf",
    });
    const stored = await uploadCrmStorageFile(file);
    if (stored.key !== "ws/docs/note.pdf") {
      fail("uploadCrmStorageFile did not return storage key");
    }
    const expected = `POST ${storageUploadPath()}`;
    if (!hits.includes(expected)) {
      fail(`mock fetch missed ${expected} (got ${hits.join(", ")})`);
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

export async function smokeStorageLive() {
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

  const hit = await probeLive(base, "POST", "/v1/storage/upload");
  const routed = isAuthRequired(hit.status, hit.message);
  if (!routed) ok = false;
  rows.push({
    method: "POST",
    path: "/v1/storage/upload",
    status: hit.status,
    note: routed
      ? `routed + auth required: ${hit.message}`
      : `unexpected ${hit.status}: ${hit.message}`,
  });

  return { ok, rows };
}

export async function runStorageSmoke() {
  installSmokePolyfill();
  console.log("Storage API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeStorageWiring();
  console.log("   OK — client, catalog, library, attachments, settings, signature");

  console.log("\n2) Mock fetch…");
  await smokeStorageMock();
  console.log("   OK — POST /v1/storage/upload hit");

  console.log("\n3) Live CRM probe…");
  const live = await smokeStorageLive();
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
  if (!live.ok) fail("live storage probe failed");

  console.log("\nStorage API smoke passed.");
}

runAsCli(runStorageSmoke);
