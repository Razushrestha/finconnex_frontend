"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { CallColumn } from "@/lib/calls/types";
import { CallCard } from "./CallCard";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { useRouter } from "next/navigation";
import type { DropTargetPos } from "./CallsKanbanBoard";
import type { Priority, TaskStatus } from "@/lib/tasks/types";

interface CallsKanbanColumnProps {
  column: CallColumn;
  draggingCallId: string | null;
  dropTargetPos: DropTargetPos | null;
  setDropTargetPos: React.Dispatch<React.SetStateAction<DropTargetPos | null>>;
  onDragStartCall: (
    e: React.DragEvent<HTMLDivElement>,
    callId: string,
    columnId: string,
  ) => void;
  onDragEndCall: () => void;
  onDropCall: (targetColumnId: string, targetIndex?: number) => void;
  selectedCallIds?: string[];
  onToggleSelect?: (callId: string) => void;
  onChangeStatus?: (callId: string, status: TaskStatus) => void;
  onChangePriority?: (callId: string, priority: Priority) => void;
  onAssignUser?: (callId: string, user: string) => void;
  onAddComment?: (callId: string, comment: string) => void;
}

export function CallsKanbanColumn({
  column,
  draggingCallId,
  dropTargetPos,
  setDropTargetPos,
  onDragStartCall,
  onDragEndCall,
  onDropCall,
  selectedCallIds = [],
  onToggleSelect,
  onChangeStatus,
  onChangePriority,
  onAssignUser,
  onAddComment,
}: CallsKanbanColumnProps) {
  const router = useRouter();
  const [isOver, setIsOver] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  function handleDragOverContainer(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsOver(true);

    const container = e.currentTarget;
    const cardElements = Array.from(
      container.querySelectorAll<HTMLElement>("[data-call-card]"),
    );

    const mouseY = e.clientY;
    let targetIndex = column.calls.length;

    for (let i = 0; i < cardElements.length; i++) {
      const rect = cardElements[i].getBoundingClientRect();
      const cardMidpoint = rect.top + rect.height / 2;
      if (mouseY < cardMidpoint) {
        targetIndex = i;
        break;
      }
    }

    setDropTargetPos({ columnId: column.id, targetIndex });
  }

  if (isCollapsed) {
    return (
      <div className="mb-4 flex h-full w-10 shrink-0 flex-col rounded-sm">
        <div
          className={cn(
            "flex h-full flex-col items-center gap-3 rounded-sm p-2 shadow-sm",
            column.badgeColorClass,
          )}
        >
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="shrink-0 rounded-sm hover:opacity-70"
            title="Expand"
            aria-expanded={false}
            aria-label={`Expand ${column.title}`}
          >
            <ChevronRight className="h-4 w-4 text-slate-700" />
          </button>

          <span className="inline-flex shrink-0 items-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
            {column.count}
          </span>

          <span className="mt-1 flex-1 [writing-mode:vertical-rl] text-sm font-semibold text-slate-900">
            {column.title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="group mb-4 flex h-full w-72 shrink-0 flex-col">
      {/* Separate Header Box */}
      <div
        className={cn(
          "mb-3 shrink-0 rounded-sm p-2 shadow-sm",
          column.badgeColorClass,
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            title="Collapse"
            className="flex items-center gap-1.5 rounded-sm hover:opacity-70"
            aria-expanded={true}
            aria-label={`Collapse ${column.title}`}
          >
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              {column.title}
            </h3>
          </button>
          <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
            {column.count}
          </span>
        </div>
      </div>

      {/* Call List / Drop Zone Container */}
      <div
        onDragOver={handleDragOverContainer}
        onDragLeave={() => {
          setIsOver(false);
          if (dropTargetPos?.columnId === column.id) {
            setDropTargetPos(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          onDropCall(column.id, dropTargetPos?.targetIndex);
        }}
        className={cn(
          "flex min-h-0 flex-1 flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          isOver ? dropTargetActive : "bg-slate-200/70",
        )}
      >
        <div className="flex-1 space-y-3 overflow-y-auto pb-4 pr-1 [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          {column.calls.map((call, index) => {
            const showPlaceholderBefore =
              dropTargetPos?.columnId === column.id &&
              dropTargetPos.targetIndex === index &&
              draggingCallId !== call.id;

            const showPlaceholderAfter =
              dropTargetPos?.columnId === column.id &&
              dropTargetPos.targetIndex === column.calls.length &&
              index === column.calls.length - 1 &&
              draggingCallId !== call.id;

            const isSelected = selectedCallIds.includes(call.id);

            return (
              <div key={call.id} className="space-y-3">
                {showPlaceholderBefore && (
                  <div className="h-20 w-full animate-pulse rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/50 transition-all" />
                )}

                <div data-call-card>
                  <CallCard
                    call={call}
                    columnId={column.id}
                    isDragging={draggingCallId === call.id}
                    onDragStart={(e) => onDragStartCall(e, call.id, column.id)}
                    onDragEnd={onDragEndCall}
                    isSelected={isSelected}
                    onSelect={
                      onToggleSelect ? () => onToggleSelect(call.id) : undefined
                    }
                    onChangeStatus={onChangeStatus}
                    onChangePriority={onChangePriority}
                    onAssignUser={onAssignUser}
                    onAddComment={onAddComment}
                  />
                </div>

                {showPlaceholderAfter && (
                  <div className="h-20 w-full animate-pulse rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/50 transition-all" />
                )}
              </div>
            );
          })}

          {column.calls.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-8 text-center text-xs text-slate-400">
              Drop a call here
            </div>
          )}
        </div>

        {/* Centered Create Call Button (Visible on Column Hover) */}
        <div className="mt-2 flex w-full shrink-0 justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => router.push("/activities/calls/create")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-white hover:text-slate-900"
          >
            <Plus className="h-4 w-4" />
            Create call
          </button>
        </div>
      </div>
    </div>
  );
}
