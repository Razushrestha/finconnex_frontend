export const STICKY_NOTE_COLORS = [
  { id: "yellow", swatch: "#F7E37C", bg: "#FFF4A3" },
  { id: "peach", swatch: "#F5B97A", bg: "#FFD7A8" },
  { id: "pink", swatch: "#F4A5B8", bg: "#FFD6E0" },
  { id: "green", swatch: "#86C98A", bg: "#D8F3D4" },
  { id: "blue", swatch: "#7EB6E9", bg: "#D6EBFF" },
  { id: "lavender", swatch: "#B9A3E3", bg: "#E8D9FF" },
  { id: "white", swatch: "#F3F4F6", bg: "#FFFEF7" },
] as const;

export type StickyNoteColor = (typeof STICKY_NOTE_COLORS)[number]["id"];

export interface StickyNoteItem {
  id: string;
  html: string;
  color: StickyNoteColor;
  remindAt?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  updatedAt: number;
}

const KEY = "finconnex.sticky-notes.v2";
const LEGACY_KEY = "finconnex.sticky-notes.v1";

const DEFAULT_W = 340;
const DEFAULT_H = 268;

export function stickyNoteDock(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 16, y: 120 };
  return {
    x: 16,
    y: Math.max(16, window.innerHeight - DEFAULT_H - 56),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isColor(value: unknown): value is StickyNoteColor {
  return STICKY_NOTE_COLORS.some((c) => c.id === value);
}

function normalize(raw: unknown): StickyNoteItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const html =
    typeof row.html === "string"
      ? row.html
      : typeof row.body === "string"
        ? escapeHtml(row.body).replace(/\n/g, "<br>")
        : "";
  const id = typeof row.id === "string" ? row.id : `n-${Date.now()}`;
  const pos = stickyNoteDock();
  return {
    id,
    html,
    color: isColor(row.color) ? row.color : "yellow",
    remindAt: typeof row.remindAt === "string" ? row.remindAt : undefined,
    x: typeof row.x === "number" ? row.x : pos.x,
    y: typeof row.y === "number" ? row.y : pos.y,
    width: typeof row.width === "number" ? row.width : DEFAULT_W,
    height: typeof row.height === "number" ? row.height : DEFAULT_H,
    updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : Date.now(),
  };
}

function readRaw(): unknown {
  if (typeof window === "undefined") return [];
  try {
    const current = localStorage.getItem(KEY);
    if (current) return JSON.parse(current);
    const legacy = localStorage.getItem(LEGACY_KEY);
    return legacy ? JSON.parse(legacy) : [];
  } catch {
    return [];
  }
}

export function listStickyNotes(): StickyNoteItem[] {
  const raw = readRaw();
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalize)
    .filter((n): n is StickyNoteItem => !!n)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveStickyNotes(notes: StickyNoteItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function upsertStickyNote(
  note: StickyNoteItem,
  notes = listStickyNotes(),
): StickyNoteItem[] {
  const next = [note, ...notes.filter((n) => n.id !== note.id)].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  saveStickyNotes(next);
  return next;
}

export function deleteStickyNote(id: string, notes = listStickyNotes()) {
  const next = notes.filter((n) => n.id !== id);
  saveStickyNotes(next);
  return next;
}

export function createStickyNote(
  partial?: Partial<StickyNoteItem>,
): StickyNoteItem {
  const pos = stickyNoteDock();
  return {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    html: "",
    color: "yellow",
    x: pos.x,
    y: pos.y,
    width: DEFAULT_W,
    height: DEFAULT_H,
    updatedAt: Date.now(),
    ...partial,
  };
}

export function notePreview(html: string) {
  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

export function colorBg(color: StickyNoteColor) {
  return STICKY_NOTE_COLORS.find((c) => c.id === color)?.bg ?? "#FFF4A3";
}

export function colorSwatch(color: StickyNoteColor) {
  return STICKY_NOTE_COLORS.find((c) => c.id === color)?.swatch ?? "#F7E37C";
}
