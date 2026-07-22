"use client";

import { useState } from "react";
import { NotesKanbanColumn } from "./NotesKanbanColumn";
import { NoteColumn, noteColumns } from "@/lib/notes/types";

interface DragInfo {
  noteId: string;
  sourceColumnId: string;
}

export function NotesKanbanBoard() {
  const [columns, setColumns] = useState<NoteColumn[]>(noteColumns);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  function handleDragStartNote(
    e: React.DragEvent<HTMLDivElement>,
    noteId: string,
    columnId: string,
  ) {
    setDragInfo({ noteId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEndNote() {
    setDragInfo(null);
  }

  function handleDropNote(targetColumnId: string) {
    if (!dragInfo) return;
    const { noteId, sourceColumnId } = dragInfo;

    if (sourceColumnId === targetColumnId) {
      setDragInfo(null);
      return;
    }

    setColumns((prev) => {
      const sourceColumn = prev.find((c) => c.id === sourceColumnId);
      const note = sourceColumn?.notes.find((n) => n.id === noteId);
      if (!note) return prev;

      return prev.map((col) => {
        if (col.id === sourceColumnId) {
          return {
            ...col,
            notes: col.notes.filter((n) => n.id !== noteId),
            count: col.count - 1,
          };
        }
        if (col.id === targetColumnId) {
          return {
            ...col,
            notes: [{ ...note, noteType: col.title }, ...col.notes],
            count: col.count + 1,
          };
        }
        return col;
      });
    });

    setDragInfo(null);
  }

  return (
    <div className="flex h-full items-stretch gap-4">
      {columns.map((column) => (
        <NotesKanbanColumn
          key={column.id}
          column={column}
          draggingNoteId={dragInfo?.noteId ?? null}
          onDragStartNote={handleDragStartNote}
          onDragEndNote={handleDragEndNote}
          onDropNote={handleDropNote}
        />
      ))}
    </div>
  );
}
