"use client";

import { useState } from "react";
import type { NoteColumn } from "@/lib/notes/types";
import { NoteCard } from "./NoteCard";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { KANBAN_COL, KANBAN_HEADER, KANBAN_HEADER_COUNT, KANBAN_WELL } from "@/lib/layout";

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
  selectedIds?: string[];
  onToggleSelect?: (noteId: string) => void;
}

export function NotesKanbanColumn({
  column,
  draggingNoteId,
  onDragStartNote,
  onDragEndNote,
  onDropNote,
  embedded = false,
  selectedIds = [],
  onToggleSelect,
}: NotesKanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-2",
        embedded ? "min-w-[220px] flex-1" : KANBAN_COL,
      )}
    >
      <div className={KANBAN_HEADER}>
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-slate-800 xl:text-sm">
            {column.title}
          </h3>
          <span className={KANBAN_HEADER_COUNT}>
            {column.notes.length}
          </span>
        </div>
      </div>

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
          "flex min-h-0 flex-1 flex-col rounded-sm border p-2",
          dropTargetIdle,
          isOver ? dropTargetActive : KANBAN_WELL,
        )}
      >
        <div className="flex-1 space-y-2 overflow-y-auto [scrollbar-width:thin]">
          {column.notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              columnId={column.id}
              isDragging={draggingNoteId === note.id}
              onDragStart={(e) => onDragStartNote(e, note.id, column.id)}
              onDragEnd={onDragEndNote}
              isSelected={selectedIds.includes(note.id)}
              onSelect={
                onToggleSelect ? () => onToggleSelect(note.id) : undefined
              }
            />
          ))}

          {column.notes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 py-10 text-center text-[11px] text-slate-400">
              Drop a note here
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
