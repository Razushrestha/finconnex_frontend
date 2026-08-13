"use client";

import { useState } from "react";
import { NotesKanbanColumn } from "./NotesKanbanColumn";
import { NoteColumn, noteColumns } from "@/lib/notes/types";

interface DragInfo {
  noteId: string;
  sourceColumnId: string;
}

interface NotesKanbanBoardProps {
  columnsOverride?: NoteColumn[];
  onDropOverride?: (targetColumnId: string, dragInfo: DragInfo) => void;
  embedded?: boolean;
  typeFilter?: string;
}

export function NotesKanbanBoard({
  columnsOverride,
  onDropOverride,
  embedded = false,
}: NotesKanbanBoardProps) {
  const [internalColumns, setInternalColumns] =
    useState<NoteColumn[]>(noteColumns);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  const columns = columnsOverride ?? internalColumns;

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

    if (onDropOverride) {
      onDropOverride(targetColumnId, dragInfo);
      setDragInfo(null);
      return;
    }

    const { noteId, sourceColumnId } = dragInfo;

    if (sourceColumnId === targetColumnId) {
      setDragInfo(null);
      return;
    }

    setInternalColumns((prev) => {
      const sourceColumn = prev.find((c) => c.id === sourceColumnId);
      const note = sourceColumn?.notes.find((n) => n.id === noteId);
      if (!note) return prev;

      return prev.map((col) => {
        if (col.id === sourceColumnId) {
          return {
            ...col,
            notes: col.notes.filter((n) => n.id !== noteId),
            count: Math.max(0, col.count - 1),
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
    <div className="flex h-full min-h-[420px] items-stretch gap-3 overflow-x-auto p-1">
      {columns.map((column) => (
        <NotesKanbanColumn
          key={column.id}
          column={column}
          draggingNoteId={dragInfo?.noteId ?? null}
          onDragStartNote={handleDragStartNote}
          onDragEndNote={handleDragEndNote}
          onDropNote={handleDropNote}
          embedded={embedded}
        />
      ))}
    </div>
  );
}
