"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AlarmClock,
  Bold,
  ChevronDown,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Minus,
  Plus,
  Save,
  Strikethrough,
  Trash2,
  Type,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STICKY_NOTE_COLORS,
  colorBg,
  colorSwatch,
  createStickyNote,
  deleteStickyNote,
  listStickyNotes,
  notePreview,
  stickyNoteDock,
  upsertStickyNote,
  type StickyNoteColor,
  type StickyNoteItem,
} from "@/lib/sticky-notes/store";

const TEXT_COLORS = ["#111827", "#C2410C", "#B45309", "#15803D", "#1D4ED8", "#7C3AED"];
const HIGHLIGHTS = ["transparent", "#FDE047", "#F9A8D4", "#86EFAC", "#93C5FD"];

export function StickyNotePad({
  open,
  onClose,
  onNotesChange,
}: {
  open: boolean;
  onClose: () => void;
  onNotesChange?: (notes: StickyNoteItem[]) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [notes, setNotes] = React.useState<StickyNoteItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState<"color" | "notes" | "type" | "text" | "mark" | "remind" | null>(
    null,
  );
  const [justSaved, setJustSaved] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const padRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{
    ox: number;
    oy: number;
    sx: number;
    sy: number;
  } | null>(null);
  const saveTimer = React.useRef<number>(0);

  const active = notes.find((n) => n.id === activeId) ?? notes[0] ?? null;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setMenu(null);
      return;
    }
    const dock = stickyNoteDock();
    const existing = listStickyNotes().map((n) => ({
      ...n,
      x: dock.x,
      y: dock.y,
    }));
    if (existing.length === 0) {
      const fresh = createStickyNote(dock);
      setNotes([fresh]);
      setActiveId(fresh.id);
      return;
    }
    setNotes(existing);
    setActiveId(existing[0].id);
  }, [open]);

  React.useEffect(() => {
    const el = editorRef.current;
    if (!el || !active) return;
    if (el.innerHTML !== (active.html || "")) {
      el.innerHTML = active.html || "";
    }
  }, [active?.id]);

  function commit(next: StickyNoteItem[], id = next[0]?.id ?? null) {
    setNotes(next);
    setActiveId(id);
    onNotesChange?.(next.filter((n) => !!notePreview(n.html)));
  }

  function persist(patch: Partial<StickyNoteItem>, html?: string) {
    if (!active) return;
    const updated: StickyNoteItem = {
      ...active,
      ...patch,
      html: html ?? editorRef.current?.innerHTML ?? active.html,
      updatedAt: Date.now(),
    };
    const saved = notePreview(updated.html)
      ? upsertStickyNote(updated, notes)
      : notes.map((n) => (n.id === updated.id ? updated : n));
    commit(saved, updated.id);
  }

  function onEditorInput() {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => persist({}), 250);
  }

  function saveNote() {
    window.clearTimeout(saveTimer.current);
    persist({});
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1600);
  }

  function format(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    persist({});
  }

  function addNote() {
    persist({});
    const fresh = createStickyNote({
      x: (active?.x ?? 24) - 18,
      y: (active?.y ?? 80) + 18,
    });
    commit([fresh, ...notes], fresh.id);
    setMenu(null);
  }

  function removeActive() {
    if (!active) return;
    const remaining = deleteStickyNote(active.id, notes);
    const nonempty = remaining.filter((n) => notePreview(n.html));
    if (nonempty.length === 0) {
      const fresh = createStickyNote();
      commit([fresh], fresh.id);
      return;
    }
    commit(nonempty, nonempty[0].id);
  }

  function openNote(id: string) {
    persist({});
    setActiveId(id);
    setMenu(null);
  }

  function onDragStart(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button,input")) return;
    if (!active) return;
    dragRef.current = {
      ox: active.x,
      oy: active.y,
      sx: e.clientX,
      sy: e.clientY,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !active) return;
    const x = Math.max(8, dragRef.current.ox + e.clientX - dragRef.current.sx);
    const y = Math.max(8, dragRef.current.oy + e.clientY - dragRef.current.sy);
    setNotes((prev) => prev.map((n) => (n.id === active.id ? { ...n, x, y } : n)));
  }

  function onDragEnd() {
    if (!dragRef.current) return;
    dragRef.current = null;
    persist({});
  }

  function onResizeMouseUp() {
    const el = padRef.current;
    if (!el || !active) return;
    persist({ width: el.offsetWidth, height: el.offsetHeight });
  }

  if (!mounted || !open || !active) return null;

  const savedNotes = notes.filter((n) => notePreview(n.html));
  const bg = colorBg(active.color);

  return createPortal(
    <div
      ref={padRef}
      onMouseUp={onResizeMouseUp}
      style={{
        left: active.x,
        top: active.y,
        width: active.width,
        height: active.height,
        backgroundColor: bg,
      }}
      className="fixed z-40 flex min-h-[200px] min-w-[280px] resize flex-col overflow-hidden rounded-xl shadow-[0_10px_30px_rgba(15,23,42,0.18)]"
    >
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        className="flex cursor-grab items-center justify-between gap-2 px-2.5 pt-2 pb-1 active:cursor-grabbing"
      >
        <div className="relative">
          <button
            type="button"
            title="Saved notes"
            onClick={() => setMenu((m) => (m === "notes" ? null : "notes"))}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-black/5"
          >
            Notes{savedNotes.length ? ` (${savedNotes.length})` : ""}
            <ChevronDown className="h-3 w-3" />
          </button>
          {menu === "notes" ? (
            <div className="absolute top-full left-0 z-10 mt-1 w-56 overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg">
              <button
                type="button"
                onClick={addNote}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                New note
              </button>
              {savedNotes.length ? <div className="h-px bg-slate-100" /> : null}
              {savedNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNote(n.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-slate-50",
                    n.id === active.id && "bg-amber-50",
                  )}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: colorSwatch(n.color) }}
                  />
                  <span className="truncate text-[12px] text-slate-700">
                    {notePreview(n.html)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-0.5">
          <div className="relative">
            <button
              type="button"
              title="Note color"
              onClick={() => setMenu((m) => (m === "color" ? null : "color"))}
              className="flex h-7 items-center gap-1 rounded-full border border-white/80 bg-white px-1.5 shadow-sm"
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: colorSwatch(active.color) }}
              />
              <ChevronDown className="h-3 w-3 text-slate-500" />
            </button>
            {menu === "color" ? (
              <div className="absolute top-full right-0 z-10 mt-1 flex gap-1 rounded-lg border border-black/10 bg-white p-1.5 shadow-lg">
                {STICKY_NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.id}
                    onClick={() => {
                      persist({ color: c.id as StickyNoteColor });
                      setMenu(null);
                    }}
                    className={cn(
                      "h-5 w-5 rounded-full border border-black/10",
                      active.color === c.id && "ring-2 ring-slate-700",
                    )}
                    style={{ backgroundColor: c.swatch }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <IconBtn
              title="Reminder"
              active={!!active.remindAt}
              onClick={() => setMenu((m) => (m === "remind" ? null : "remind"))}
            >
              <AlarmClock className="h-3.5 w-3.5" />
            </IconBtn>
            {menu === "remind" ? (
              <div className="absolute top-full right-0 z-10 mt-1 w-[220px] rounded-lg border border-black/10 bg-white p-2 shadow-lg">
                <p className="mb-1.5 text-[10px] font-semibold text-slate-500 uppercase">
                  Remind me
                </p>
                <input
                  type="datetime-local"
                  value={active.remindAt ?? ""}
                  onChange={(e) => persist({ remindAt: e.target.value || undefined })}
                  className="h-8 w-full rounded-md border border-slate-200 px-2 text-[12px] outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            ) : null}
          </div>

          <button
            type="button"
            title="Save note"
            onClick={saveNote}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold",
              justSaved
                ? "bg-emerald-600 text-white"
                : "bg-white/90 text-slate-700 shadow-sm hover:bg-white",
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {justSaved ? "Saved" : "Save"}
          </button>
          <IconBtn title="Delete note" onClick={removeActive}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Minimize" onClick={onClose}>
            <Minus className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-0.5 px-2 pb-1.5">
        <div className="relative">
          <FormatBtn
            title="Text style"
            onClick={() => setMenu((m) => (m === "type" ? null : "type"))}
          >
            <Type className="h-3.5 w-3.5" />
            <ChevronDown className="h-2.5 w-2.5" />
          </FormatBtn>
          {menu === "type" ? (
            <div className="absolute top-full left-0 z-10 mt-1 w-28 overflow-hidden rounded-md border border-black/10 bg-white shadow-lg">
              {(
                [
                  ["Normal", "p"],
                  ["Heading", "h3"],
                  ["Small", "small"],
                ] as const
              ).map(([label, tag]) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    format("formatBlock", tag);
                    setMenu(null);
                  }}
                  className="block w-full px-2.5 py-1.5 text-left text-[12px] hover:bg-slate-50"
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <FormatBtn title="Bold" onClick={() => format("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </FormatBtn>
        <FormatBtn title="Italic" onClick={() => format("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </FormatBtn>
        <FormatBtn title="Underline" onClick={() => format("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </FormatBtn>
        <FormatBtn title="Strikethrough" onClick={() => format("strikeThrough")}>
          <Strikethrough className="h-3.5 w-3.5" />
        </FormatBtn>
        <div className="relative">
          <FormatBtn
            title="Text color"
            onClick={() => setMenu((m) => (m === "text" ? null : "text"))}
          >
            <span className="text-[11px] font-bold leading-none">A</span>
          </FormatBtn>
          {menu === "text" ? (
            <SwatchMenu
              colors={TEXT_COLORS}
              onPick={(c) => {
                format("foreColor", c);
                setMenu(null);
              }}
            />
          ) : null}
        </div>
        <div className="relative">
          <FormatBtn
            title="Highlight"
            onClick={() => setMenu((m) => (m === "mark" ? null : "mark"))}
          >
            <Highlighter className="h-3.5 w-3.5" />
          </FormatBtn>
          {menu === "mark" ? (
            <SwatchMenu
              colors={HIGHLIGHTS}
              onPick={(c) => {
                format("hiliteColor", c);
                setMenu(null);
              }}
            />
          ) : null}
        </div>
        <FormatBtn title="Bulleted list" onClick={() => format("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </FormatBtn>
        <FormatBtn title="Numbered list" onClick={() => format("insertOrderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </FormatBtn>
      </div>

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        data-placeholder="Add here ..."
        onInput={onEditorInput}
        onBlur={() => persist({})}
        className="min-h-0 flex-1 overflow-auto px-3 pb-5 text-[13px] leading-6 text-slate-800 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
      />

      <span
        aria-hidden
        className="pointer-events-none absolute right-1.5 bottom-1.5 h-3 w-3 bg-[linear-gradient(135deg,transparent_45%,#94a3b8_46%,transparent_54%,#94a3b8_55%,transparent_63%,#94a3b8_64%)]"
      />
    </div>,
    document.body,
  );
}

function IconBtn({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-black/5",
        active && "text-violet-700",
      )}
    >
      {children}
    </button>
  );
}

function FormatBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-7 min-w-7 items-center justify-center gap-0.5 rounded border border-slate-300/80 bg-white/70 px-1 text-slate-700 hover:bg-white"
    >
      {children}
    </button>
  );
}

function SwatchMenu({
  colors,
  onPick,
}: {
  colors: string[];
  onPick: (color: string) => void;
}) {
  return (
    <div className="absolute top-full left-0 z-10 mt-1 flex gap-1 rounded-md border border-black/10 bg-white p-1.5 shadow-lg">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="h-5 w-5 rounded-sm border border-black/10"
          style={{ backgroundColor: c === "transparent" ? "#fff" : c }}
        />
      ))}
    </div>
  );
}
