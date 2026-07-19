"use client";

import { useState } from "react";
import type { NoteColumn } from "@/lib/notes/types";
import { NoteCard } from "./NoteCard";

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
}

export function NotesKanbanColumn({
  column,
  draggingNoteId,
  onDragStartNote,
  onDragEndNote,
  onDropNote,
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
      className={`flex h-full w-72 shrink-0 flex-col rounded-2xl p-3 transition-colors ${
        isOver ? "bg-indigo-50 ring-2 ring-indigo-300" : "bg-slate-100/70"
      }`}
    >
      {/* Header — fixed */}
      <div className="mb-3 shrink-0">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${column.badgeColorClass}`}
        >
          {column.title} ({column.count})
        </span>
      </div>

      {/* Scrollable note list */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
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

        {column.notes.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-8 text-center text-xs text-slate-400">
            Drop a note here
          </div>
        )}
      </div>
    </div>
  );
}
