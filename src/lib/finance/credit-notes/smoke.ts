/**
 * Cross-check Credit Notes Swagger routes.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/finance/credit-notes/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  addCrmCreditNoteAttachment,
  createCrmCreditNote,
  creditNotesPath,
  deleteCrmCreditNote,
  deleteCrmCreditNoteAttachment,
  downloadCrmCreditNotePdf,
  getCrmCreditNote,
  getCrmCreditNotePublicLink,
  listCrmCreditNoteAttachments,
  listCrmCreditNotes,
  normalizeCreditNote,
  sendCrmCreditNote,
  updateCrmCreditNote,
} from "@/lib/finance/credit-notes/api";
import {
  financeLiveNote,
  isFinanceLiveOk,
} from "@/lib/finance/smoke-live";
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
const DECOY_PATH = "/v1/__no_such_module_credit_notes_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/credit-notes" },
  { method: "GET", path: `/v1/credit-notes/${ID}` },
  { method: "POST", path: "/v1/credit-notes" },
  { method: "PATCH", path: `/v1/credit-notes/${ID}` },
  { method: "DELETE", path: `/v1/credit-notes/${ID}` },
  { method: "POST", path: `/v1/credit-notes/${ID}/send` },
  { method: "GET", path: `/v1/credit-notes/${ID}/pdf` },
  { method: "GET", path: `/v1/credit-notes/${ID}/public-link` },
  { method: "GET", path: `/v1/credit-notes/${ID}/attachments` },
  { method: "POST", path: `/v1/credit-notes/${ID}/attachments` },
  {
    method: "DELETE",
    path: `/v1/credit-notes/${ID}/attachments/${ATTACHMENT_ID}`,
  },
];

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeCreditNotesWiring() {
  const api = readSrc("src/lib/finance/credit-notes/api.ts");
  for (const name of [
    "listCrmCreditNotes",
    "getCrmCreditNote",
    "createCrmCreditNote",
    "updateCrmCreditNote",
    "deleteCrmCreditNote",
    "sendCrmCreditNote",
    "getCrmCreditNotePublicLink",
    "downloadCrmCreditNotePdf",
    "listCrmCreditNoteAttachments",
    "addCrmCreditNoteAttachment",
    "deleteCrmCreditNoteAttachment",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`credit-notes client missing ${name}`);
    }
  }
  if (!api.includes("`/v1/credit-notes${suffix}`")) {
    fail("credit-notes client missing /v1/credit-notes path");
  }

  if (!api.includes("crmWorkspaceFetch")) {
    fail("credit-notes client must use crmWorkspaceFetch (BFF) for live 200s");
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/credit-notes"',
    'path: "/credit-notes/:id"',
    'path: "/credit-notes/:id/send"',
    'path: "/credit-notes/:id/pdf"',
    'path: "/credit-notes/:id/public-link"',
    'path: "/credit-notes/:id/attachments"',
    'path: "/credit-notes/:id/attachments/:attachmentId"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const bff = readSrc("src/lib/auth/crm-bff-proxy.ts");
  if (!bff.includes('"credit-notes"')) {
    fail("BFF proxy ALLOWED_ROOTS must include credit-notes");
  }

  if (LIVE_ROUTES.length !== 11) {
    fail(
      `smoke LIVE_ROUTES must cover all 11 Swagger credit-note routes (got ${LIVE_ROUTES.length})`,
    );
  }

  const page = readSrc("src/app/(dashboard)/finance/credit-notes/page.tsx");
  if (!page.includes("useCrmCreditNotes")) {
    fail("credit-notes page does not call useCrmCreditNotes");
  }
  if (page.includes('redirect("/finance/invoices")')) {
    fail("credit-notes list page must not redirect away from the live UI");
  }

  const createPage = readSrc(
    "src/app/(dashboard)/finance/credit-notes/create/page.tsx",
  );
  if (!createPage.includes("CreateCreditNoteForm")) {
    fail("credit-notes create page does not render CreateCreditNoteForm");
  }

  const detailPage = readSrc(
    "src/app/(dashboard)/finance/credit-notes/[id]/page.tsx",
  );
  if (!detailPage.includes("CreditNoteDetailClient")) {
    fail("credit-notes detail page does not render CreditNoteDetailClient");
  }

  const hook = readSrc("src/lib/finance/credit-notes/use-crm-credit-notes.ts");
  if (!hook.includes("replaceCrmCreditNotes")) {
    fail("credit-notes hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("credit-notes hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc(
    "src/components/finance/credit-notes/CreateCreditNoteForm.tsx",
  );
  if (!create.includes("createCrmCreditNote")) {
    fail("create credit note form does not call createCrmCreditNote");
  }

  const detail = readSrc(
    "src/components/finance/credit-notes/CreditNoteDetailClient.tsx",
  );
  for (const name of [
    "sendCrmCreditNote",
    "downloadCrmCreditNotePdf",
    "getCrmCreditNotePublicLink",
    "deleteCrmCreditNote",
    "addCrmCreditNoteAttachment",
  ]) {
    if (!detail.includes(name)) {
      fail(`credit-note detail does not call ${name}`);
    }
  }

  const sidebar = readSrc("src/components/layout/Sidebar.tsx");
  if (!sidebar.includes('href: "/finance/credit-notes"')) {
    fail("sidebar Finance nav missing Credit notes link");
  }

  const normalized = normalizeCreditNote(
    {
      id: "cn1",
      title: "Fee credit",
      status: "SENT",
      clientName: "Greystone",
      total: 220,
    },
    0,
  );
  if (normalized.title !== "Fee credit" || normalized.status !== "Sent") {
    fail("normalizeCreditNote did not map Swagger-shaped fields");
  }
}

export async function smokeCreditNotesMock() {
  const hits: string[] = [];
  const origFetch = globalThis.fetch;

  bindCrmSession(SESSION);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const parsed = new URL(String(input));
    hits.push(`${method} ${parsed.pathname}`);
    if (parsed.pathname.endsWith("/pdf")) {
      return new Response(new Blob(["%PDF"], { type: "application/pdf" }), {
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
              title: "Fee credit",
              status: "DRAFT",
              clientName: "Greystone",
              total: 220,
            },
          ],
          url: "https://crm.smoke.test/p/cn",
          id: ATTACHMENT_ID,
          name: "note.pdf",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmCreditNotes();
    await getCrmCreditNote(ID);
    await createCrmCreditNote({ title: "New" });
    await updateCrmCreditNote(ID, { title: "Updated" });
    await sendCrmCreditNote(ID);
    await getCrmCreditNotePublicLink(ID);
    await downloadCrmCreditNotePdf(ID);
    await listCrmCreditNoteAttachments(ID);
    await addCrmCreditNoteAttachment(
      ID,
      new File(["x"], "note.pdf", { type: "application/pdf" }),
    );
    await deleteCrmCreditNoteAttachment(ID, ATTACHMENT_ID);
    await deleteCrmCreditNote(ID);

    const expected = [
      `GET ${creditNotesPath()}`,
      `GET ${creditNotesPath(`/${ID}`)}`,
      `POST ${creditNotesPath()}`,
      `PATCH ${creditNotesPath(`/${ID}`)}`,
      `POST ${creditNotesPath(`/${ID}/send`)}`,
      `GET ${creditNotesPath(`/${ID}/public-link`)}`,
      `GET ${creditNotesPath(`/${ID}/pdf`)}`,
      `GET ${creditNotesPath(`/${ID}/attachments`)}`,
      `POST ${creditNotesPath(`/${ID}/attachments`)}`,
      `DELETE ${creditNotesPath(`/${ID}/attachments/${ATTACHMENT_ID}`)}`,
      `DELETE ${creditNotesPath(`/${ID}`)}`,
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
  const send = async () => {
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
  };

  let hit = await send();
  if (hit.status === 502 || hit.status === 503 || hit.status === 504) {
    await new Promise((r) => setTimeout(r, 800));
    hit = await send();
  }
  return hit;
}

function isAuthRequired(status: number, message: string, method = "GET") {
  return isFinanceLiveOk(status, message, method);
}

export async function smokeCreditNotesLive() {
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
      const routed = isAuthRequired(hit.status, hit.message, route.method);
      if (!routed) ok = false;
      rows.push({
        method: route.method,
        path: route.path,
        status: hit.status,
        note: financeLiveNote(hit.status, hit.message, route.method),
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

  const nonDecoy = rows.filter((row) => row.path !== DECOY_PATH);
  const allGateway =
    nonDecoy.length > 0 &&
    nonDecoy.every((row) => [502, 503, 504].includes(row.status));
  if (allGateway) {
    return { ok: true, gatewayDown: true as const, rows };
  }

  return { ok, gatewayDown: false as const, rows };
}

export async function runCreditNotesSmoke() {
  installSmokePolyfill();
  console.log("Credit Notes API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeCreditNotesWiring();
  console.log("   OK — client, catalog, list page, detail actions");

  console.log("\n2) Mock fetch…");
  await smokeCreditNotesMock();
  console.log("   OK — all 11 Swagger routes hit");

  console.log("\n3) Live CRM probe (decoy 404 vs credit-notes 401)…");
  const live = await smokeCreditNotesLive();
  for (const row of live.rows) {
    const isDecoy = row.path === DECOY_PATH;
    const mark = isDecoy
      ? row.status === 404
        ? "OK"
        : "FAIL"
      : row.note.startsWith("ok ") ||
          row.note.startsWith("routed + auth required") ||
          row.note.startsWith("routed (not found)")
        ? "OK"
        : live.gatewayDown && [502, 503, 504].includes(row.status)
          ? "WARN"
          : "FAIL";
    console.log(
      `   ${mark}  ${row.method} ${row.path}  ${row.status}  ${row.note}`,
    );
  }
  if (live.gatewayDown) {
    console.log(
      "\n   WARN — live CRM returned gateway errors (502/503/504). Client wiring + mock still OK.",
    );
  } else if (!live.ok) {
    fail("live credit-notes probe failed");
  }

  console.log("\nCredit Notes API smoke passed.");
}

runAsCli(runCreditNotesSmoke);
