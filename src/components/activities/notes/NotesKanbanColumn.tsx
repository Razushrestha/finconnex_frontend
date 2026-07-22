"use client";

import { useState } from "react";
import type { NoteColumn } from "@/lib/notes/types";
import { NoteCard } from "./NoteCard";
import { cn } from "@/lib/utils";

interface NotesKanbanColumnProps {
  column: NoteColumn;
  draggingNoteId: string | null;
  onDragStartNote: (
    e: React.DragEvent<HTMLDivElement>,
    noteId: string,
    columnId: string,
  ) => void;
  onDragEndNote: () => void;
  onDropNote: (targetColumnId: string) => void;
  embedded?: boolean;
}

export function NotesKanbanColumn({
  column,
  draggingNoteId,
  onDragStartNote,
  onDragEndNote,
  onDropNote,
  embedded = false,
}: NotesKanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        onDropNote(column.id);
      }}
      className={cn(
        "flex h-full min-w-[220px] flex-1 flex-col transition-colors",
        embedded
          ? cn("min-h-[420px]", isOver && "bg-violet-50/50")
          : cn(
              "w-72 shrink-0 rounded-2xl border p-3",
              isOver
                ? "border-violet-300 bg-violet-50/80 ring-2 ring-violet-200"
                : "border-slate-200/70 bg-slate-50/80",
            ),
      )}
    >
      <div
        className={cn(
          "shrink-0",
          embedded
            ? "border-b border-slate-100 px-3 py-2"
            : "mb-3",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            embedded ? "shadow-none" : "shadow-sm",
            column.badgeColorClass,
          )}
        >
          {column.title}
          <span className="rounded-full bg-white/25 px-1.5 py-px text-[10px]">
            {column.notes.length}
          </span>
        </span>
      </div>

      <div
        className={cn(
          "flex-1 space-y-2 overflow-y-auto [scrollbar-width:thin]",
          embedded ? "p-2" : "space-y-2.5 pr-0.5",
        )}
      >
        {column.notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            columnId={column.id}
            isDragging={draggingNoteId === note.id}
            onDragStart={(e) => onDragStartNote(e, note.id, column.id)}
            onDragEnd={onDragEndNote}
          />
        ))}

        {column.notes.length === 0 ? (
          <div
            className={cn(
              "py-8 text-center text-[11px] text-slate-300",
              !embedded &&
                "rounded-xl border border-dashed border-slate-200 bg-white/70 py-10 text-slate-400",
            )}
          >
            {embedded ? "Empty" : "Drop a note here"}
          </div>
        ) : null}
      </div>
    </div>
  );
}
