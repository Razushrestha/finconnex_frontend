/** Live notes store (session-backed). */

import {
  notes as SEED_NOTES,
  NOTE_TYPES,
  type Note,
  type NoteColumn,
  type NoteType,
} from "@/lib/notes/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { fieldDiff, logDelete, logEdit } from "@/lib/rules/audit";
import { getRulesActor } from "@/lib/rules/actor";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

function noteLeadLabel(relatedTo: string) {
  const match = relatedTo.match(/^Lead:\s*(.+)$/i);
  return match?.[1]?.trim() || relatedTo;
}

const COLUMN_COLORS: Record<NoteType, string> = {
  General: "bg-slate-500 text-white",
  "Call Summary": "bg-sky-500 text-white",
  "Meeting Notes": "bg-violet-500 text-white",
  "Follow-up": "bg-amber-500 text-white",
  Other: "bg-emerald-500 text-white",
};

function cloneSeed(): Note[] {
  return SEED_NOTES.map((n) => ({ ...n }));
}

const store = createBoardStore({
  key: "activities:notes:list:v1",
  seed: cloneSeed,
});

export function listNotes(): Note[] {
  return store.list();
}

export function saveNotes(items: Note[]) {
  store.save(items);
}

export function listNoteColumns(): NoteColumn[] {
  const notes = listNotes();
  return NOTE_TYPES.map((type) => {
    const items = notes.filter((n) => n.noteType === type);
    return {
      id: type.toLowerCase().replace(/\s+/g, "-"),
      title: type,
      count: items.length,
      badgeColorClass: COLUMN_COLORS[type],
      notes: items,
    };
  });
}

export function createNote(input: {
  title: string;
  body: string;
  relatedTo: string;
  noteType?: NoteType;
  createdBy: string;
  isPrivate?: boolean;
  isPinned?: boolean;
}): Note {
  const note: Note = {
    id: newRulesId("note"),
    title: input.title.trim(),
    body: input.body,
    relatedTo: input.relatedTo,
    noteType: input.noteType ?? "General",
    createdBy: input.createdBy,
    isPrivate: input.isPrivate ?? false,
    isPinned: input.isPinned ?? false,
    createdAt: formatRulesAt(new Date()),
  };
  saveNotes([note, ...listNotes()]);
  emitLeadActivityChange();
  return note;
}

export function findNoteById(id: string) {
  const note = listNotes().find((n) => n.id === id);
  return note ? { note } : null;
}

export function deleteNote(id: string): Note | null {
  const items = listNotes();
  const found = items.find((n) => n.id === id) ?? null;
  if (!found) return null;
  saveNotes(items.filter((n) => n.id !== id));
  logDelete(
    "activities.notes",
    getRulesActor().name || found.createdBy,
    found.id,
    noteLeadLabel(found.relatedTo),
  );
  emitLeadActivityChange();
  return found;
}

export function updateNote(
  id: string,
  patch: {
    title?: string;
    body?: string;
    isPinned?: boolean;
    isPrivate?: boolean;
  },
): Note | null {
  const items = listNotes();
  const index = items.findIndex((n) => n.id === id);
  if (index === -1) return null;
  const current = items[index];
  const actor = getRulesActor().name || current.createdBy;
  const next: Note = {
    ...current,
    title: patch.title !== undefined ? patch.title.trim() : current.title,
    body: patch.body !== undefined ? patch.body : current.body,
    isPinned: patch.isPinned !== undefined ? patch.isPinned : current.isPinned,
    isPrivate: patch.isPrivate !== undefined ? patch.isPrivate : current.isPrivate,
    updatedAt: formatRulesAt(new Date()),
    updatedBy: actor,
  };
  const changes = fieldDiff(
    {
      title: current.title,
      body: current.body,
      isPinned: String(current.isPinned),
      isPrivate: String(current.isPrivate),
    },
    {
      title: next.title,
      body: next.body,
      isPinned: String(next.isPinned),
      isPrivate: String(next.isPrivate),
    },
  );
  if (!changes.length) return current;
  const copy = [...items];
  copy[index] = next;
  saveNotes(copy);
  logEdit(
    "activities.notes",
    actor,
    next.id,
    noteLeadLabel(next.relatedTo),
    changes,
  );
  emitLeadActivityChange();
  return next;
}

function normalizeRelated(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function relatedParts(value: string) {
  const idx = value.indexOf(":");
  if (idx === -1) return { kind: "", name: normalizeRelated(value) };
  return {
    kind: normalizeRelated(value.slice(0, idx)),
    name: normalizeRelated(value.slice(idx + 1)),
  };
}

/** Match `Lead: Name` / `Deal: Name` / `Company: Name` related-to strings. */
export function relatedMatches(relatedTo: string, target: string): boolean {
  const a = normalizeRelated(relatedTo);
  const b = normalizeRelated(target);
  if (!a || !b) return false;
  if (a === b) return true;
  const left = relatedParts(relatedTo);
  const right = relatedParts(target);
  if (left.kind && right.kind) {
    return left.kind === right.kind && left.name === right.name;
  }
  return false;
}

export function listNotesForRelated(...targets: string[]): Note[] {
  const keys = targets.map((value) => value.trim()).filter(Boolean);
  if (!keys.length) return [];
  return listNotes().filter((note) =>
    keys.some((key) => relatedMatches(note.relatedTo, key)),
  );
}

function matchKey(value: string, key: string): boolean {
  if (!key) return false;
  if (value.includes(key)) return true;
  const name = key.includes(":") ? (key.split(":").pop()?.trim() ?? "") : key;
  return name.length > 2 && value.includes(name);
}

function notesWithLatestSeed(): Note[] {
  const live = listNotes();
  const known = new Set(live.map((note) => note.id));
  const extras = SEED_NOTES.filter((note) => !known.has(note.id));
  if (extras.length === 0) return live;
  const merged = [...extras, ...live];
  saveNotes(merged);
  return merged;
}

/** Notes tied to a work-queue row (related record, contact, or subject). */
export function listNotesForQueueRow(row: {
  subject: string;
  related?: string;
  contactName?: string;
}): Note[] {
  const keys = [row.related, row.contactName, row.subject]
    .map((value) => value?.trim().toLowerCase() ?? "")
    .filter(Boolean);
  if (keys.length === 0) return [];
  return notesWithLatestSeed().filter((note) => {
    const blob = `${note.relatedTo} ${note.title}`.toLowerCase();
    return keys.some((key) => matchKey(blob, key));
  });
}
