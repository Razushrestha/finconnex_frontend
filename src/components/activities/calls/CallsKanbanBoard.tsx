"use client";

import { useEffect, useState } from "react";
import { type CallColumn, type CallStatus } from "@/lib/calls/types";
import {
  callMatchesScope,
  listCallColumns,
  updateCall,
  type CallScope,
} from "@/lib/calls/store";
import { onRulesChange } from "@/lib/rules/storage";
import { CallsKanbanColumn } from "./CallsKanbanColumn";
import type { Priority } from "@/lib/tasks/types";

interface DragInfo {
  callId: string;
  sourceColumnId: string;
}

export interface DropTargetPos {
  columnId: string;
  targetIndex: number;
}

export function CallsKanbanBoard({
  scope = "all",
  selectedIds,
  onSelectedIdsChange,
}: {
  scope?: CallScope;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
}) {
  const [columns, setColumns] = useState<CallColumn[]>(() => listCallColumns());
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPos | null>(
    null,
  );
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);
  const selectedCallIds = selectedIds ?? localSelectedIds;

  function setSelectedCallIds(ids: string[]) {
    if (onSelectedIdsChange) onSelectedIdsChange(ids);
    else setLocalSelectedIds(ids);
  }

  useEffect(() => {
    setColumns(listCallColumns());
  }, []);

  useEffect(() => {
    return onRulesChange(() => setColumns(listCallColumns()));
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
    setSelectedCallIds(
      selectedCallIds.includes(callId)
        ? selectedCallIds.filter((id) => id !== callId)
        : [...selectedCallIds, callId],
    );
  }

  function handleChangeStatus(callId: string, status: CallStatus) {
    updateCall(callId, { status });
    setColumns(listCallColumns());
  }

  function handleChangePriority(callId: string, priority: Priority) {
    setColumns((prev) => {
      const next = prev.map((col) => ({
        ...col,
        calls: col.calls.map((call) =>
          call.id === callId ? { ...call, priority } : call,
        ),
      }));
      return next;
    });
  }

  function handleAssignUser(callId: string, user: string) {
    updateCall(callId, { assignedTo: user });
    setColumns(listCallColumns());
  }

  function handleAddComment(callId: string, comment: string) {
    setColumns((prev) => {
      const next = prev.map((col) => ({
        ...col,
        calls: col.calls.map((call) => {
          if (call.id === callId) {
            const currentCount = (call as { commentsCount?: number }).commentsCount || 0;
            return { ...call, commentsCount: currentCount + 1 };
          }
          return call;
        }),
      }));
      return next;
    });
  }

  function handleDropCall(targetColumnId: string, targetIndex?: number) {
    if (!dragInfo) return;
    const { callId, sourceColumnId } = dragInfo;
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;
    updateCall(callId, { status: targetColumn.title });
    setColumns(listCallColumns());
    handleDragEndCall();
  }

  const visibleColumns = columns.map((column) => {
    const calls = column.calls.filter((call) => callMatchesScope(call, scope));
    return { ...column, calls, count: calls.length };
  });

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 items-stretch gap-4 overflow-x-auto p-1">
      {visibleColumns.map((column) => (
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
