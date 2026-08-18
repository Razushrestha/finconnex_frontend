"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Pin, Lock, Link2, Clock } from "lucide-react";
import type { Note, NoteType } from "@/lib/notes/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion, entityCardBox } from "@/lib/motion";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";
import { RelatedToLink } from "@/components/activities/RelatedToLink";

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
  isSelected?: boolean;
  onSelect?: (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
  ) => void;
}

export function NoteCard({
  note,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
  isSelected = false,
  onSelect,
}: NoteCardProps) {
  const router = useRouter();
  const wasDragging = useRef(false);
  const meta = TYPE_META[note.noteType];
  const href = `/activities/notes/detail/${note.id}`;

  function goToNote() {
    if (wasDragging.current) return;
    router.push(href);
  }

  return (
    <div
      draggable
      role="link"
      tabIndex={0}
      onDragStart={(e) => {
        wasDragging.current = true;
        onDragStart(e);
      }}
      onDragEnd={() => {
        onDragEnd();
        setTimeout(() => {
          wasDragging.current = false;
        }, 0);
      }}
      onClick={goToNote}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToNote();
        }
      }}
      data-focus-id={note.id}
      data-note-id={note.id}
      data-column-id={columnId}
      className={cn(
        entityCardBox,
        "group/card cursor-pointer border-l-[3px]",
        meta.border,
        cardMotion,
        isDragging && cardDragging,
        isSelected
          ? "border-indigo-500 ring-1 ring-indigo-500"
          : "hover:border-slate-300",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="min-w-0 truncate text-[13px] font-semibold leading-snug text-slate-900">
          {note.title || "Untitled note"}
        </h4>
        <div className="flex shrink-0 items-center gap-1">
          {note.isPinned ? (
            <Pin className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
          ) : null}
          {note.isPrivate ? (
            <Lock className="h-3.5 w-3.5 text-slate-400" />
          ) : null}
          {onSelect ? (
            <div
              className={cn(
                "shrink-0 transition-opacity",
                isSelected
                  ? "opacity-100"
                  : "opacity-0 group-hover/card:opacity-100",
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select note ${note.title || "Untitled note"}`}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          ) : null}
        </div>
      </div>

      <p className="mb-3 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
        {note.body}
      </p>

      <div className="space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
          <RelatedToLink relatedTo={note.relatedTo} />
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{note.createdAt}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-slate-50 pt-2.5">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
            meta.soft,
            meta.text,
          )}
        >
          {note.noteType}
        </span>
        <CardOwnerRow name={note.createdBy} />
      </div>
    </div>
  );
}
