/** Live notes store (session-backed). */

import {
  notes as SEED_NOTES,
  NOTE_TYPES,
  type Note,
  type NoteColumn,
  type NoteType,
} from "@/lib/notes/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

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
