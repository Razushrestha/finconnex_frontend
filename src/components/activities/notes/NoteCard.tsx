"use client";

import { Pin, Lock, Link2, Clock } from "lucide-react";
import type { Note, NoteType } from "@/lib/notes/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion } from "@/lib/motion";

const TYPE_META: Record<
  NoteType,
  { soft: string; text: string; border: string }
> = {
  General: {
    soft: "bg-slate-100",
    text: "text-slate-600",
    border: "border-l-slate-400",
  },
  "Call Summary": {
    soft: "bg-sky-50",
    text: "text-sky-700",
    border: "border-l-sky-500",
  },
  "Meeting Notes": {
    soft: "bg-violet-50",
    text: "text-violet-700",
    border: "border-l-violet-500",
  },
  "Follow-up": {
    soft: "bg-amber-50",
    text: "text-amber-800",
    border: "border-l-amber-500",
  },
  Other: {
    soft: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-l-emerald-500",
  },
};

interface NoteCardProps {
  note: Note;
  columnId: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function NoteCard({
  note,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
}: NoteCardProps) {
  const meta = TYPE_META[note.noteType];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-note-id={note.id}
      data-column-id={columnId}
      className={cn(
        "cursor-grab select-none rounded-xl border border-slate-100 border-l-[3px] bg-white p-3.5 shadow-sm active:cursor-grabbing",
        meta.border,
        cardMotion,
        isDragging && cardDragging,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-[13px] font-semibold leading-snug text-slate-900">
          {note.title || "Untitled note"}
        </h4>
        <div className="flex shrink-0 items-center gap-1">
          {note.isPinned ? (
            <Pin className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
          ) : null}
          {note.isPrivate ? (
            <Lock className="h-3.5 w-3.5 text-slate-400" />
          ) : null}
        </div>
      </div>

      <p className="mb-3 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
        {note.body}
      </p>

      <div className="space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{note.relatedTo}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{note.createdAt}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2.5">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            meta.soft,
            meta.text,
          )}
        >
          {note.noteType}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold",
              avatarColor(note.createdBy),
            )}
          >
            {initials(note.createdBy)}
          </span>
          <span className="max-w-[72px] truncate text-[10px] text-slate-500">
            {note.createdBy.split(" ")[0]}
          </span>
        </div>
      </div>
    </div>
  );
}
