/** SRS §7.6 Notes */

export type NoteType =
  | "General"
  | "Call Summary"
  | "Meeting Notes"
  | "Follow-up"
  | "Other";

export const NOTE_TYPES: NoteType[] = [
  "General",
  "Call Summary",
  "Meeting Notes",
  "Follow-up",
  "Other",
];

export interface Note {
  id: string;
  title: string;
  body: string;
  relatedTo: string;
  relatedType?: string;
  relatedId?: string;
  noteType: NoteType;
  createdBy: string;
  isPrivate: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface NoteColumn {
  id: string;
  title: NoteType;
  count: number;
  badgeColorClass: string;
  notes: Note[];
}

export const notes: Note[] = [];

const COLUMN_COLORS: Record<NoteType, string> = {
  General: "bg-slate-500 text-white",
  "Call Summary": "bg-sky-500 text-white",
  "Meeting Notes": "bg-violet-500 text-white",
  "Follow-up": "bg-amber-500 text-white",
  Other: "bg-emerald-500 text-white",
};

export const noteColumns: NoteColumn[] = NOTE_TYPES.map((type) => {
  const items = notes.filter((n) => n.noteType === type);
  return {
    id: type.toLowerCase().replace(/\s+/g, "-"),
    title: type,
    count: items.length,
    badgeColorClass: COLUMN_COLORS[type],
    notes: items,
  };
});
