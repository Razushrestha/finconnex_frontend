"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, StickyNote, Trash2 } from "lucide-react";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  createCrmNote,
  deleteCrmNote,
  isCrmNoteId,
  listRelatedCrmNotes,
  persistRemoteNote,
  tryCrmNote,
  updateCrmNote,
} from "@/lib/notes/api";
import { getRulesActor } from "@/lib/rules/actor";
import { onLeadActivityChange, emitLeadActivityChange } from "@/lib/leads/lead-extras-store";
import {
  createNote,
  deleteNote,
  listNotesForRelated,
  saveNotes,
  listNotes,
  updateNote,
} from "@/lib/notes/store";
import type { Note } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

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

function plainBody(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function noteTitle(body: string) {
  return (
    body.split("\n").find((line) => line.trim())?.slice(0, 72) || "Internal note"
  );
}

export function RelatedInternalNotes({
  relatedTo,
  extraRelatedTo,
  relatedType,
  relatedId,
  seed,
  compact,
  onNotify,
  onSeeded,
}: {
  relatedTo: string;
  extraRelatedTo?: string;
  relatedType?: string;
  relatedId?: string;
  seed?: {
    id: string;
    body: string;
    createdAt?: string;
    createdBy?: string;
  };
  compact?: boolean;
  onNotify?: (message: string) => void;
  onSeeded?: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => onLeadActivityChange(() => setRevision((n) => n + 1)), []);

  useEffect(() => {
    if (!relatedType || !relatedId || !isUuid(relatedId)) return;
    let cancelled = false;
    void tryCrmNote(() => listRelatedCrmNotes(relatedType, relatedId)).then(
      (rows) => {
        if (cancelled || !rows) return;
        for (const row of rows) {
          persistRemoteNote({
            ...row,
            relatedTo: relatedTo || row.relatedTo,
            relatedType,
            relatedId,
          });
        }
        setRevision((n) => n + 1);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [relatedType, relatedId, relatedTo]);

  useEffect(() => {
    setDraft("");
    setEditingId(null);
  }, [relatedTo]);

  useEffect(() => {
    const body = seed?.body.trim() ?? "";
    if (!seed?.id || !body) return;
    if (listNotes().some((note) => note.id === seed.id)) {
      onSeeded?.();
      return;
    }
    const actor =
      seed.createdBy?.trim() || getRulesActor().name || "You";
    saveNotes([
      {
        id: seed.id,
        title: noteTitle(body),
        body,
        relatedTo,
        noteType: "General",
        createdBy: actor,
        isPrivate: true,
        isPinned: false,
        createdAt: seed.createdAt?.trim() || new Date().toLocaleString("en-AU"),
      },
      ...listNotes(),
    ]);
    emitLeadActivityChange();
    setRevision((n) => n + 1);
    onSeeded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once; ignore callback identity
  }, [seed?.id, seed?.body, relatedTo]);

  const notes = useMemo(() => {
    void revision;
    return listNotesForRelated(relatedTo, extraRelatedTo ?? "")
      .filter((note) => !compact || note.isPrivate || note.noteType === "General")
      .slice()
      .sort((a, b) => parseNoteDate(b.createdAt) - parseNoteDate(a.createdAt));
  }, [relatedTo, extraRelatedTo, revision, compact]);

  function notify(message: string) {
    onNotify?.(message);
  }

  function resetForm() {
    setDraft("");
    setEditingId(null);
  }

  async function save() {
    const body = draft.trim();
    if (!body) return;
    const actor = getRulesActor().name || "You";
    const title = noteTitle(body);
    const parentType = relatedType?.trim();
    const parentId = relatedId && isUuid(relatedId) ? relatedId : undefined;
    if (editingId) {
      updateNote(editingId, { title, body });
      if (isCrmNoteId(editingId)) {
        const remote = await tryCrmNote(() =>
          updateCrmNote(editingId, { title, body }),
        );
        if (remote) {
          persistRemoteNote({
            ...remote,
            relatedTo,
            relatedType: parentType,
            relatedId: parentId,
          });
        }
      }
      resetForm();
      setRevision((n) => n + 1);
      notify("Note updated");
      return;
    }
    const local = createNote({
      title,
      body,
      relatedTo,
      relatedType: parentType,
      relatedId: parentId,
      noteType: "General",
      createdBy: actor,
      isPrivate: true,
    });
    if (parentType && parentId) {
      const remote = await tryCrmNote(() =>
        createCrmNote({
          title,
          body,
          relatedTo,
          relatedType: parentType,
          relatedId: parentId,
          noteType: "General",
          createdBy: actor,
          isPrivate: true,
        }),
      );
      if (remote && isCrmNoteId(remote.id)) {
        deleteNote(local.id);
        persistRemoteNote({
          ...remote,
          relatedTo,
          relatedType: parentType,
          relatedId: parentId,
        });
      }
    }
    resetForm();
    setRevision((n) => n + 1);
    notify("Note saved");
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setDraft(plainBody(note.body));
  }

  async function remove(note: Note) {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    if (isCrmNoteId(note.id)) {
      await tryCrmNote(() => deleteCrmNote(note.id));
    }
    deleteNote(note.id);
    if (editingId === note.id) resetForm();
    setRevision((n) => n + 1);
    notify("Note deleted");
  }

  return (
    <div className={cn(!compact && "rounded-2xl border border-slate-200 bg-white p-4")}>
      {!compact ? (
        <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
          <StickyNote className="h-3.5 w-3.5 text-slate-400" />
          Internal notes
        </p>
      ) : null}
      <div
        className={cn(
          "rounded-xl border p-2.5",
          compact
            ? "border-amber-100 bg-amber-50"
            : "border-slate-200 bg-slate-50",
        )}
      >
        <MentionTextarea
          value={draft}
          onChange={setDraft}
          placeholder={
            editingId
              ? "Edit this note… Type @ to mention someone."
              : "Add an internal note… Type @ to mention someone."
          }
          className={cn(
            "min-h-[88px] w-full resize-none bg-transparent text-[12px] outline-none",
            compact
              ? "text-amber-950 placeholder:text-amber-700/40"
              : "text-slate-800 placeholder:text-slate-400",
          )}
        />
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        {editingId ? (
          <button
            type="button"
            onClick={resetForm}
            className="h-8 rounded-lg px-2.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={() => void save()}
          className={cn(
            "h-8 rounded-lg px-3 text-[11px] font-semibold disabled:opacity-40",
            compact
              ? "bg-white text-[#5A32A3] ring-1 ring-slate-200 hover:bg-[#F3ECFB]"
              : "bg-[#5A32A3] text-white hover:bg-[#4a2888]",
            compact && !editingId && "w-full",
          )}
        >
          {editingId ? "Update note" : "Save note"}
        </button>
      </div>

      <ul className={cn("space-y-2", compact ? "mt-3" : "mt-4")}>
        {notes.length === 0 ? (
          <li className="text-[12px] text-slate-400">No notes yet.</li>
        ) : (
          notes.map((note) => {
            const text = plainBody(note.body);
            return (
              <li
                key={note.id}
                className={cn(
                  "rounded-xl border p-2.5",
                  compact
                    ? "border-amber-100 bg-white"
                    : "border-slate-200 bg-white",
                )}
              >
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-800">
                  {text}
                </p>
                <div className="mt-1.5 flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[10px] leading-4 text-slate-400">
                    {note.createdBy}
                    <span className="mx-1">·</span>
                    {note.createdAt}
                    {note.updatedAt ? (
                      <>
                        <br />
                        Edited {note.updatedAt}
                      </>
                    ) : null}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      title="Edit note"
                      aria-label="Edit note"
                      onClick={() => startEdit(note)}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-[#5A32A3]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete note"
                      aria-label="Delete note"
                      onClick={() => void remove(note)}
                      className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
