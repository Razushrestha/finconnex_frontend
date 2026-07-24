"use client";

import { useEffect, useState } from "react";
import { type CallColumn } from "@/lib/calls/types";
import { listCallColumns, saveCallColumns } from "@/lib/calls/store";
import { CallsKanbanColumn } from "./CallsKanbanColumn";

interface DragInfo {
  callId: string;
  sourceColumnId: string;
}

export function CallsKanbanBoard() {
  const [columns, setColumns] = useState<CallColumn[]>([]);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  useEffect(() => {
    setColumns(listCallColumns());
  }, []);

  function handleDragStartCall(
    e: React.DragEvent<HTMLDivElement>,
    callId: string,
    columnId: string,
  ) {
    setDragInfo({ callId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEndCall() {
    setDragInfo(null);
  }

  function handleDropCall(targetColumnId: string) {
    if (!dragInfo) return;
    const { callId, sourceColumnId } = dragInfo;

    if (sourceColumnId === targetColumnId) {
      setDragInfo(null);
      return;
    }

    setColumns((prev) => {
      const sourceColumn = prev.find((c) => c.id === sourceColumnId);
      const targetColumn = prev.find((c) => c.id === targetColumnId);
      const call = sourceColumn?.calls.find((c) => c.id === callId);
      if (!call || !targetColumn) return prev;

      const moved = { ...call, status: targetColumn.title };

      const next = prev.map((col) => {
        if (col.id === sourceColumnId) {
          return {
            ...col,
            calls: col.calls.filter((c) => c.id !== callId),
            count: col.count - 1,
          };
        }
        if (col.id === targetColumnId) {
          return {
            ...col,
            calls: [moved, ...col.calls],
            count: col.count + 1,
          };
        }
        return col;
      });
      saveCallColumns(next);
      return next;
    });

    setDragInfo(null);
  }

  return (
    <div className="flex h-full min-h-0 gap-4 overflow-x-auto p-1">
      {columns.map((column) => (
        <CallsKanbanColumn
          key={column.id}
          column={column}
          draggingCallId={dragInfo?.callId ?? null}
          onDragStartCall={handleDragStartCall}
          onDragEndCall={handleDragEndCall}
          onDropCall={handleDropCall}
        />
      ))}
    </div>
  );
}
