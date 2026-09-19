"use client";

import { useState } from "react";
import { NotesKanbanColumn } from "./NotesKanbanColumn";
import { NoteColumn, noteColumns } from "@/lib/notes/types";
import { KanbanDragGhost } from "@/components/common/KanbanDragGhost";
import {
  usePointerKanbanDrag,
  type PointerKanbanDrop,
} from "@/lib/kanban/use-pointer-kanban-drag";

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

  const columns = columnsOverride ?? internalColumns;

  function handleDropNote({
    itemId: noteId,
    sourceColumnId,
    targetColumnId,
  }: PointerKanbanDrop) {
    if (onDropOverride) {
      onDropOverride(targetColumnId, { noteId, sourceColumnId });
      return;
    }

    if (sourceColumnId === targetColumnId) return;

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
  }

  const drag = usePointerKanbanDrag({ onDrop: handleDropNote });

  return (
    <div className="flex h-full w-full min-h-[420px] min-w-0 items-stretch gap-3 overflow-x-auto p-1">
      {columns.map((column) => (
        <NotesKanbanColumn
          key={column.id}
          column={column}
          draggingNoteId={drag.dragInfo?.itemId ?? null}
          onCardPointerDown={drag.onCardPointerDown}
          onDragClickCapture={
            drag.cardPointerProps({ id: "", columnId: "", name: "" })
              .onClickCapture
          }
          embedded={embedded}
        />
      ))}
      <KanbanDragGhost ghost={drag.ghost} />
    </div>
  );
}
