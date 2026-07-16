"use client";

import { useState } from "react";
import {
  callColumns as initialColumns,
  type CallColumn,
} from "@/lib/calls/types";
import { CallsKanbanColumn } from "./CallsKanbanColumn";

interface DragInfo {
  callId: string;
  sourceColumnId: string;
}

export function CallsKanbanBoard() {
  const [columns, setColumns] = useState<CallColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

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
      const call = sourceColumn?.calls.find((c) => c.id === callId);
      if (!call) return prev;

      return prev.map((col) => {
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
            calls: [call, ...col.calls],
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
