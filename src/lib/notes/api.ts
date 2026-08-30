import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import { formatRulesAt } from "@/lib/rules/storage";
import { upsertNote } from "@/lib/notes/store";
import type { Note, NoteType } from "@/lib/notes/types";

export type CrmNoteQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function workspaceNotesPath(workspaceId: string, suffix = ""): string {
  return `/v1/workspaces/${workspaceId}/notes${suffix}`;
}

export function globalNotesPath(suffix = ""): string {
  return `/v1/notes${suffix}`;
}

export function relatedNotesPath(
  workspaceId: string,
  relatedType: string,
  relatedId: string,
): string {
  return `/v1/workspaces/${workspaceId}/${relatedType}/${relatedId}/notes`;
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["items", "notes", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function mapNoteType(raw: string): NoteType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("call")) return "Call Summary";
  if (value.includes("meeting")) return "Meeting Notes";
  if (value.includes("follow")) return "Follow-up";
  if (value.includes("other")) return "Other";
  return "General";
}

function apiNoteType(type: NoteType): string {
  return type.toUpperCase().replace(/\s+/g, "_");
}

function formatWhen(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return formatRulesAt(new Date());
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return formatRulesAt(new Date(parsed));
}

function asBool(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const value = raw.toLowerCase();
    return value === "true" || value === "1" || value === "yes";
  }
  return false;
}

export function normalizeNote(raw: Record<string, unknown>, index: number): Note {
  const related =
    raw.relatedTo && typeof raw.relatedTo === "object"
      ? (raw.relatedTo as Record<string, unknown>)
      : null;
  const author =
    raw.createdBy && typeof raw.createdBy === "object"
      ? (raw.createdBy as Record<string, unknown>)
      : raw.author && typeof raw.author === "object"
        ? (raw.author as Record<string, unknown>)
        : null;
  return {
    id: pickStr(raw.id, raw.noteId, raw.uuid) || `crm-note-${index}`,
    title: pickStr(raw.title, raw.subject, raw.name, ""),
    body: pickStr(raw.body, raw.text, raw.content, raw.html, ""),
    relatedTo:
      pickStr(
        related && pickStr(related.name, related.title, related.label),
        raw.relatedName,
        raw.relatedType && raw.relatedId
          ? `${raw.relatedType}: ${raw.relatedId}`
          : "",
        typeof raw.relatedTo === "string" ? raw.relatedTo : "",
      ) || "—",
    relatedType: pickStr(raw.relatedType, related && related.type) || undefined,
    relatedId: pickStr(raw.relatedId, related && related.id) || undefined,
    noteType: mapNoteType(pickStr(raw.noteType, raw.type, raw.kind, "GENERAL")),
    createdBy: pickStr(
      author && pickStr(author.name, author.fullName, author.email),
      raw.createdBy,
      raw.authorName,
      raw.ownerName,
      "—",
    ),
    isPrivate: asBool(raw.isPrivate ?? raw.private ?? raw.visibility === "PRIVATE"),
    isPinned: asBool(raw.isPinned ?? raw.pinned),
    createdAt: formatWhen(raw.createdAt ?? raw.createdDate ?? raw.insertedAt),
  };
}

export function normalizeNotes(data: unknown): Note[] {
  return extractRecords(data).map((row, index) => normalizeNote(row, index));
}

async function withSession<T>(
  run: (
    session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
    scoped: boolean,
  ) => Promise<T>,
): Promise<T> {
  const scoped = await ensureCrmSession();
  if (scoped) return run(scoped, true);
  const access = await ensureCrmAccess();
  if (!access) throw new Error("Sign in to manage notes");
  return run(access, false);
}

function notesUrl(
  session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
  scoped: boolean,
  suffix: string,
) {
  return scoped
    ? workspaceNotesPath((session as CrmSession).workspaceId, suffix)
    : globalNotesPath(suffix);
}

async function notesGet(suffix: string, query = ""): Promise<unknown> {
  return withSession((session, scoped) =>
    crmFetch(session, `${notesUrl(session, scoped, suffix)}${query}`),
  );
}

async function notesMutate(suffix: string, init: RequestInit): Promise<unknown> {
  return withSession((session, scoped) =>
    crmFetch(session, notesUrl(session, scoped, suffix), init),
  );
}

function asNote(data: unknown): Note | null {
  const items = normalizeNotes(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeNote(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmNotes(query: CrmNoteQuery = {}): Promise<Note[]> {
  return normalizeNotes(
    await notesGet(
      "",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
      }),
    ),
  );
}

export async function getCrmNote(noteId: string): Promise<Note | null> {
  return asNote(await notesGet(`/${noteId}`));
}

export async function listRelatedCrmNotes(
  relatedType: string,
  relatedId: string,
): Promise<Note[]> {
  const scoped = await ensureCrmSession();
  if (!scoped) throw new Error("Sign in to load related notes");
  return normalizeNotes(
    await crmFetch(
      scoped,
      relatedNotesPath(scoped.workspaceId, relatedType, relatedId),
    ),
  );
}

export function toCreateNoteBody(input: {
  title: string;
  body: string;
  relatedTo: string;
  relatedType?: string;
  relatedId?: string;
  noteType?: NoteType;
  createdBy?: string;
  isPrivate?: boolean;
  isPinned?: boolean;
}): Record<string, unknown> {
  return {
    title: input.title,
    body: input.body,
    text: input.body,
    content: input.body,
    relatedTo: input.relatedTo,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    type: input.noteType ? apiNoteType(input.noteType) : undefined,
    noteType: input.noteType ? apiNoteType(input.noteType) : undefined,
    createdBy: input.createdBy,
    authorName: input.createdBy,
    isPrivate: input.isPrivate ?? false,
    private: input.isPrivate ?? false,
    isPinned: input.isPinned ?? false,
    pinned: input.isPinned ?? false,
  };
}

export async function createCrmNote(
  input: Parameters<typeof toCreateNoteBody>[0],
): Promise<Note | null> {
  return asNote(
    await notesMutate("", {
      method: "POST",
      body: JSON.stringify(toCreateNoteBody(input)),
    }),
  );
}

export async function updateCrmNote(
  noteId: string,
  patch: Partial<Note>,
): Promise<Note | null> {
  const body: Record<string, unknown> = {};
  if (patch.title != null) body.title = patch.title;
  if (patch.body != null) {
    body.body = patch.body;
    body.text = patch.body;
  }
  if (patch.relatedTo != null) body.relatedTo = patch.relatedTo;
  if (patch.relatedType != null) body.relatedType = patch.relatedType;
  if (patch.relatedId != null) body.relatedId = patch.relatedId;
  if (patch.noteType) {
    body.type = apiNoteType(patch.noteType);
    body.noteType = apiNoteType(patch.noteType);
  }
  if (patch.isPrivate != null) {
    body.isPrivate = patch.isPrivate;
    body.private = patch.isPrivate;
  }
  if (patch.isPinned != null) {
    body.isPinned = patch.isPinned;
    body.pinned = patch.isPinned;
  }
  return asNote(
    await notesMutate(`/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteCrmNote(noteId: string): Promise<void> {
  await notesMutate(`/${noteId}`, { method: "DELETE" });
}

export async function restoreCrmNote(noteId: string): Promise<Note | null> {
  return asNote(
    await notesMutate(`/${noteId}/restore`, { method: "POST", body: "{}" }),
  );
}

export async function bulkDeleteCrmNotes(ids: string[]): Promise<void> {
  await notesMutate("/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids, noteIds: ids }),
  });
}

export async function tryCrmNote<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteNote(row: Note | null) {
  if (row) upsertNote(row);
  return row;
}

export function isCrmNoteId(id: string): boolean {
  return isUuid(id);
}
