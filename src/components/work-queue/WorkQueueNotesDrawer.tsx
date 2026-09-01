"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  CheckSquare,
  ChevronDown,
  Clock,
  Pencil,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/activities/shared";
import { getRulesActor } from "@/lib/rules/actor";
import {
  createNote,
  deleteNote,
  listNotesForQueueRow,
  updateNote,
} from "@/lib/notes/store";
import type { Note } from "@/lib/notes/types";
import type { QueueRow } from "@/lib/work-queue/live";

const PREVIEW_COUNT = 3;

type SortOrder = "recent-first" | "recent-last";

function parseNoteDate(raw: string): number {
  const s = raw.trim();
  const m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i,
  );
  if (m) {
    let hours = m[4] ? Number(m[4]) : 12;
    const mins = m[5] ? Number(m[5]) : 0;
    const ap = m[6]?.toUpperCase();
    if (ap === "PM" && hours < 12) hours += 12;
    if (ap === "AM" && hours === 12) hours = 0;
    if (!ap && !m[4]) hours = 12;
    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      hours,
      mins,
    ).getTime();
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

function formatNoteWhen(raw: string): string {
  const t = parseNoteDate(raw);
  if (!t) return raw;
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function recordKind(href: string): string {
  if (href.includes("/tasks")) return "Task";
  if (href.includes("/calls")) return "Call";
  if (href.includes("/meetings")) return "Meeting";
  if (href.includes("/emails")) return "Email";
  if (href.includes("/messages")) return "Message";
  if (href.includes("/leads")) return "Lead";
  if (href.includes("/contacts")) return "Contact";
  if (href.includes("/deals")) return "Deal";
  return "Record";
}

function RecordIcon({ href, className }: { href: string; className?: string }) {
  if (href.includes("/calls")) {
    return <Phone className={className} strokeWidth={1.75} />;
  }
  return <CheckSquare className={className} strokeWidth={1.75} />;
}

export function WorkQueueNotesDrawer({
  row,
  onClose,
  onChanged,
}: {
  row: QueueRow;
  onClose: () => void;
  onChanged?: (message: string) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [sort, setSort] = React.useState<SortOrder>("recent-first");
  const [sortOpen, setSortOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );
  const [tick, setTick] = React.useState(0);
  const sortRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setTitle("");
    setBody("");
    setEditingId(null);
    setShowAll(false);
    setSort("recent-first");
    setExpanded(new Set());
    setConfirmDeleteId(null);
    window.setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 0);
  }, [row.id]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    if (!sortOpen) return;
    function onDoc(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen]);

  const notes = React.useMemo(() => {
    const matched = listNotesForQueueRow(row);
    const ordered = [...matched].sort((a, b) => {
      const diff = parseNoteDate(a.createdAt) - parseNoteDate(b.createdAt);
      return sort === "recent-first" ? diff * -1 : diff;
    });
    return ordered;
    // tick forces refresh after create/update/delete
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.related, row.subject, row.contactName, sort, tick]);

  const visible = showAll ? notes : notes.slice(0, PREVIEW_COUNT);
  const hasMore = notes.length > PREVIEW_COUNT;
  const canSave = title.trim().length > 0 && body.trim().length > 0;

  function bump(message: string) {
    setTick((n) => n + 1);
    onChanged?.(message);
  }

  function resetForm() {
    setTitle("");
    setBody("");
    setEditingId(null);
  }

  function save() {
    if (!canSave) return;
    const actor = getRulesActor().name || "Me";
    if (editingId) {
      updateNote(editingId, { title: title.trim(), body: body.trim() });
      resetForm();
      bump("Note updated");
      return;
    }
    createNote({
      title: title.trim(),
      body: body.trim(),
      relatedTo: row.related || row.subject,
      createdBy: actor,
    });
    resetForm();
    bump("Note added");
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setConfirmDeleteId(null);
    titleRef.current?.focus({ preventScroll: true });
  }

  function remove(note: Note) {
    if (confirmDeleteId !== note.id) {
      setConfirmDeleteId(note.id);
      return;
    }
    deleteNote(note.id);
    if (editingId === note.id) resetForm();
    setConfirmDeleteId(null);
    bump("Note deleted");
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!mounted) return null;

  const kind = recordKind(row.href);

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="wq-notes-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-white shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.28)]"
      >
        <button
          type="button"
          aria-label="Close notes"
          onClick={onClose}
          className="absolute top-4 -left-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:text-slate-800"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>

        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2
                id="wq-notes-title"
                className="text-[16px] font-semibold text-slate-900"
              >
                Notes
              </h2>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
                {notes.length}
              </span>
            </div>
            <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-slate-500">
              <RecordIcon
                href={row.href}
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
              />
              <span className="truncate">
                {row.subject}
                {row.related ? ` · ${row.related}` : ""}
              </span>
            </div>
          </div>
          <div className="relative shrink-0" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              {sort === "recent-first" ? "Recent First" : "Recent Last"}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {sortOpen ? (
              <div
                role="menu"
                className="absolute top-full right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                {(
                  [
                    ["recent-first", "Recent First"],
                    ["recent-last", "Recent Last"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSort(id);
                      setSortOpen(false);
                    }}
                    className={cn(
                      "flex w-full px-3 py-1.5 text-left text-[13px]",
                      sort === id
                        ? "bg-violet-50 font-medium text-violet-700"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <div className="shrink-0 space-y-2 border-b border-slate-100 px-5 py-3">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400"
          />
          <div className="flex justify-end gap-2">
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="px-2 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              disabled={!canSave}
              onClick={save}
              className="rounded-md bg-[#4F46E5] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {editingId ? "Update note" : "Add note"}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-slate-400">
              No notes yet for this {kind.toLowerCase()}. Add a title and
              description above.
            </p>
          ) : (
            visible.map((note) => {
              const long = note.body.length > 180;
              const open = expanded.has(note.id);
              const text =
                long && !open ? `${note.body.slice(0, 180).trimEnd()}…` : note.body;
              return (
                <article
                  key={note.id}
                  className="group border-b border-slate-100 px-5 py-3.5"
                >
                  <div className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        avatarColor(note.createdBy),
                      )}
                    >
                      {initials(note.createdBy)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <h3 className="min-w-0 flex-1 text-[13px] font-semibold text-slate-900">
                          {note.title}
                        </h3>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            aria-label={`Edit ${note.title}`}
                            title="Edit"
                            onClick={() => startEdit(note)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={
                              confirmDeleteId === note.id
                                ? `Confirm delete ${note.title}`
                                : `Delete ${note.title}`
                            }
                            title={
                              confirmDeleteId === note.id
                                ? "Click again to delete"
                                : "Delete"
                            }
                            onClick={() => remove(note)}
                            className={cn(
                              "flex h-7 items-center justify-center rounded-md px-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600",
                              confirmDeleteId === note.id &&
                                "bg-rose-50 px-2 text-[11px] font-semibold text-rose-600",
                            )}
                          >
                            {confirmDeleteId === note.id ? (
                              "Delete?"
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-slate-600">
                        {text}
                        {long ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(note.id)}
                            className="ml-1 font-medium text-[#4F46E5] hover:underline"
                          >
                            {open ? "Show less" : "Show more"}
                          </button>
                        ) : null}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-slate-400">
                        <span>
                          {kind}
                          {row.related ? ` · ${row.related}` : ""}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatNoteWhen(note.createdAt)} by {note.createdBy}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {notes.length > 0 ? (
          <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-2.5">
            {hasMore ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-[13px] font-medium text-[#4F46E5] hover:underline"
              >
                {showAll ? "Show fewer notes" : "View all notes"}
              </button>
            ) : (
              <span className="text-[12.5px] text-slate-400">All notes</span>
            )}
            <span className="text-[12.5px] tabular-nums text-slate-500">
              {visible.length} of {notes.length}
            </span>
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
