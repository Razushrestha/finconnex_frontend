/**
 * Cross-check Notes Swagger routes (global + workspace twins).
 * Run: npx tsx --tsconfig tsconfig.json src/lib/notes/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { bindCrmSession, getCrmApiBaseUrl } from "@/lib/activity-timeline";
import {
  bulkDeleteCrmNotes,
  createCrmNote,
  deleteCrmNote,
  getCrmNote,
  listCrmNotes,
  listRelatedCrmNotes,
  normalizeNote,
  relatedNotesPath,
  restoreCrmNote,
  updateCrmNote,
  workspaceNotesPath,
} from "@/lib/notes/api";
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
const RELATED_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const DECOY_PATH = "/v1/__no_such_module_notes_probe__";

const LIVE_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/v1/notes" },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/notes` },
  { method: "GET", path: `/v1/notes/${ID}` },
  { method: "GET", path: `/v1/workspaces/${SESSION.workspaceId}/notes/${ID}` },
  {
    method: "GET",
    path: `/v1/workspaces/${SESSION.workspaceId}/LEAD/${RELATED_ID}/notes`,
  },
  { method: "POST", path: "/v1/notes" },
  { method: "POST", path: `/v1/workspaces/${SESSION.workspaceId}/notes` },
  { method: "PATCH", path: `/v1/notes/${ID}` },
  { method: "PATCH", path: `/v1/workspaces/${SESSION.workspaceId}/notes/${ID}` },
  { method: "DELETE", path: `/v1/notes/${ID}` },
  { method: "DELETE", path: `/v1/workspaces/${SESSION.workspaceId}/notes/${ID}` },
  { method: "POST", path: "/v1/notes/bulk-delete" },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/notes/bulk-delete`,
  },
  { method: "POST", path: `/v1/notes/${ID}/restore` },
  {
    method: "POST",
    path: `/v1/workspaces/${SESSION.workspaceId}/notes/${ID}/restore`,
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

export function smokeNotesWiring() {
  const api = readSrc("src/lib/notes/api.ts");
  if (!api.includes("workspaceNotesPath")) {
    fail("notes client missing workspaceNotesPath");
  }
  if (!api.includes("relatedNotesPath")) {
    fail("notes client missing relatedNotesPath");
  }
  for (const name of [
    "listCrmNotes",
    "getCrmNote",
    "listRelatedCrmNotes",
    "createCrmNote",
    "updateCrmNote",
    "deleteCrmNote",
    "restoreCrmNote",
    "bulkDeleteCrmNotes",
  ]) {
    if (!api.includes(`export async function ${name}`)) {
      fail(`notes client missing ${name}`);
    }
  }

  const catalog = readSrc("src/lib/api/endpoints.ts");
  for (const fragment of [
    'path: "/notes"',
    'path: "/notes/:noteId"',
    'path: "/notes/bulk-delete"',
    'path: "/notes/:noteId/restore"',
    'path: "/workspaces/:workspaceId/notes"',
    'path: "/workspaces/:workspaceId/:relatedType/:relatedId/notes"',
  ]) {
    if (!catalog.includes(fragment)) {
      fail(`endpoint catalog missing ${fragment}`);
    }
  }

  const page = readSrc("src/app/(dashboard)/activities/notes/page.tsx");
  if (!page.includes("useCrmNotes")) {
    fail("notes page does not call useCrmNotes");
  }
  if (!page.includes("bulkDeleteCrmNotes")) {
    fail("notes page does not call bulkDeleteCrmNotes");
  }

  const hook = readSrc("src/lib/notes/use-crm-notes.ts");
  if (!hook.includes("replaceCrmNotes")) {
    fail("notes hook does not replace the store from live CRM");
  }
  if (!hook.includes('setSource("api")')) {
    fail("notes hook must mark a successful empty list as Live CRM");
  }

  const create = readSrc("src/components/activities/notes/CreateNoteForm.tsx");
  if (!create.includes("createCrmNote")) {
    fail("create note form does not call createCrmNote");
  }

  const detail = readSrc(
    "src/app/(dashboard)/activities/notes/detail/[id]/page.tsx",
  );
  for (const name of ["getCrmNote", "deleteCrmNote", "restoreCrmNote"]) {
    if (!detail.includes(name)) {
      fail(`note detail does not call ${name}`);
    }
  }

  const normalized = normalizeNote(
    {
      id: "n1",
      title: "Kickoff notes",
      body: "Discussed timeline",
      type: "MEETING_NOTES",
      relatedType: "DEAL",
      relatedId: RELATED_ID,
      createdBy: "Tejas",
      isPrivate: false,
      isPinned: true,
    },
    0,
  );
  if (normalized.title !== "Kickoff notes" || normalized.noteType !== "Meeting Notes") {
    fail("normalizeNote did not map Swagger-shaped fields");
  }
}

export async function smokeNotesMock() {
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
              id: ID,
              title: "Kickoff notes",
              body: "Discussed timeline",
              type: "GENERAL",
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    await listCrmNotes();
    await getCrmNote(ID);
    await listRelatedCrmNotes("LEAD", RELATED_ID);
    await createCrmNote({
      title: "New",
      body: "Hello",
      relatedTo: "Lead: William Anderson",
      relatedType: "LEAD",
      noteType: "General",
    });
    await updateCrmNote(ID, { title: "Updated" });
    await restoreCrmNote(ID);
    await bulkDeleteCrmNotes([ID]);
    await deleteCrmNote(ID);

    const expected = [
      `GET ${workspaceNotesPath(SESSION.workspaceId)}`,
      `GET ${workspaceNotesPath(SESSION.workspaceId, `/${ID}`)}`,
      `GET ${relatedNotesPath(SESSION.workspaceId, "LEAD", RELATED_ID)}`,
      `POST ${workspaceNotesPath(SESSION.workspaceId)}`,
      `PATCH ${workspaceNotesPath(SESSION.workspaceId, `/${ID}`)}`,
      `POST ${workspaceNotesPath(SESSION.workspaceId, `/${ID}/restore`)}`,
      `POST ${workspaceNotesPath(SESSION.workspaceId, "/bulk-delete")}`,
      `DELETE ${workspaceNotesPath(SESSION.workspaceId, `/${ID}`)}`,
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

export async function smokeNotesLive() {
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

export async function runNotesSmoke() {
  installSmokePolyfill();
  console.log("Notes API smoke…");

  console.log("\n1) Client + UI wiring…");
  smokeNotesWiring();
  console.log("   OK — client, catalog, list page, create, detail");

  console.log("\n2) Mock fetch…");
  await smokeNotesMock();
  console.log("   OK — workspace-scoped unique ops hit");

  console.log("\n3) Live CRM probe (decoy 404 vs notes 401)…");
  const live = await smokeNotesLive();
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
  if (!live.ok) fail("live notes probe failed");

  console.log("\nNotes API smoke passed.");
}

runAsCli(runNotesSmoke);
