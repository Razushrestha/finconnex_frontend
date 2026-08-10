"use client";

import { useEffect, useState } from "react";
import { type CallColumn } from "@/lib/calls/types";
import { listCallColumns, saveCallColumns } from "@/lib/calls/store";
import { CallsKanbanColumn } from "./CallsKanbanColumn";
import type { Priority, TaskStatus } from "@/lib/tasks/types";

interface DragInfo {
  callId: string;
  sourceColumnId: string;
}

export interface DropTargetPos {
  columnId: string;
  targetIndex: number;
}

export function CallsKanbanBoard() {
  const [columns, setColumns] = useState<CallColumn[]>([]);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPos | null>(
    null,
  );
  const [selectedCallIds, setSelectedCallIds] = useState<string[]>([]);

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
    setDropTargetPos(null);
  }

  function handleToggleSelect(callId: string) {
    setSelectedCallIds((prev) =>
      prev.includes(callId)
        ? prev.filter((id) => id !== callId)
        : [...prev, callId],
    );
  }

  function handleChangeStatus(callId: string, status: TaskStatus) {
    setColumns((prev) => {
      let movedCall: any = null;
      let sourceColId = "";

      // Find the call and its current column
      for (const col of prev) {
        const found = col.calls.find((c) => c.id === callId);
        if (found) {
          movedCall = { ...found, status };
          sourceColId = col.id;
          break;
        }
      }

      if (!movedCall) return prev;

      // Find target column based on status title or ID
      const targetColumn = prev.find(
        (c) =>
          c.title.toLowerCase() === status.toLowerCase() || c.id === status,
      );
      const targetColId = targetColumn ? targetColumn.id : sourceColId;

      const next = prev.map((col) => {
        if (col.id === sourceColId && col.id === targetColId) {
          return {
            ...col,
            calls: col.calls.map((c) => (c.id === callId ? movedCall : c)),
          };
        }

        if (col.id === sourceColId) {
          return {
            ...col,
            calls: col.calls.filter((c) => c.id !== callId),
            count: Math.max(0, col.count - 1),
          };
        }

        if (col.id === targetColId) {
          return {
            ...col,
            calls: [movedCall, ...col.calls],
            count: col.count + 1,
          };
        }

        return col;
      });

      saveCallColumns(next);
      return next;
    });
  }

  function handleChangePriority(callId: string, priority: Priority) {
    setColumns((prev) => {
      const next = prev.map((col) => ({
        ...col,
        calls: col.calls.map((call) =>
          call.id === callId ? { ...call, priority } : call,
        ),
      }));
      saveCallColumns(next);
      return next;
    });
  }

  function handleAssignUser(callId: string, user: string) {
    setColumns((prev) => {
      const next = prev.map((col) => ({
        ...col,
        calls: col.calls.map((call) =>
          call.id === callId ? { ...call, assignedTo: user } : call,
        ),
      }));
      saveCallColumns(next);
      return next;
    });
  }

  function handleAddComment(callId: string, comment: string) {
    setColumns((prev) => {
      const next = prev.map((col) => ({
        ...col,
        calls: col.calls.map((call) => {
          if (call.id === callId) {
            const currentCount = (call as any).commentsCount || 0;
            return { ...call, commentsCount: currentCount + 1 };
          }
          return call;
        }),
      }));
      saveCallColumns(next);
      return next;
    });
  }

  function handleDropCall(targetColumnId: string, targetIndex?: number) {
    if (!dragInfo) return;
    const { callId, sourceColumnId } = dragInfo;

    setColumns((prev) => {
      const sourceColumn = prev.find((c) => c.id === sourceColumnId);
      const targetColumn = prev.find((c) => c.id === targetColumnId);
      const call = sourceColumn?.calls.find((c) => c.id === callId);
      if (!call || !targetColumn) return prev;

      const moved = { ...call, status: targetColumn.title };

      const next = prev.map((col) => {
        if (col.id === sourceColumnId && col.id === targetColumnId) {
          const callsWithoutItem = col.calls.filter((c) => c.id !== callId);
          const finalIndex = targetIndex ?? callsWithoutItem.length;
          const updatedCalls = [...callsWithoutItem];
          updatedCalls.splice(finalIndex, 0, moved);
          return { ...col, calls: updatedCalls };
        }

        if (col.id === sourceColumnId) {
          return {
            ...col,
            calls: col.calls.filter((c) => c.id !== callId),
            count: Math.max(0, col.count - 1),
          };
        }

        if (col.id === targetColumnId) {
          const updatedCalls = [...col.calls];
          const finalIndex = targetIndex ?? updatedCalls.length;
          updatedCalls.splice(finalIndex, 0, moved);
          return {
            ...col,
            calls: updatedCalls,
            count: col.count + 1,
          };
        }

        return col;
      });

      saveCallColumns(next);
      return next;
    });

    handleDragEndCall();
  }

  return (
    <div className="flex h-full min-h-0 items-stretch gap-4 overflow-x-auto p-1">
      {columns.map((column) => (
        <CallsKanbanColumn
          key={column.id}
          column={column}
          draggingCallId={dragInfo?.callId ?? null}
          dropTargetPos={dropTargetPos}
          setDropTargetPos={setDropTargetPos}
          onDragStartCall={handleDragStartCall}
          onDragEndCall={handleDragEndCall}
          onDropCall={handleDropCall}
          selectedCallIds={selectedCallIds}
          onToggleSelect={handleToggleSelect}
          onChangeStatus={handleChangeStatus}
          onChangePriority={handleChangePriority}
          onAssignUser={handleAssignUser}
          onAddComment={handleAddComment}
        />
      ))}
    </div>
  );
}
