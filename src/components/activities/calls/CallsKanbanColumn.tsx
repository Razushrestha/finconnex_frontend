"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CallColumn, CallStatus } from "@/lib/calls/types";
import { CallCard } from "./CallCard";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { KANBAN_COL, KANBAN_DROP_GHOST, KANBAN_HEADER, KANBAN_HEADER_COUNT, KANBAN_WELL } from "@/lib/layout";
import { useRouter } from "next/navigation";
import type { DropTargetPos } from "./CallsKanbanBoard";
import type { Priority } from "@/lib/tasks/types";

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
  onChangeStatus?: (callId: string, status: CallStatus) => void;
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
      <KanbanCollapsedRail
        title={column.title}
        count={column.count}
        onExpand={() => setIsCollapsed(false)}
      />
    );
  }

  return (
    <div className={cn("group/stage flex h-full min-h-0 flex-col", KANBAN_COL)}>
      {/* Separate Header Box */}
      <div
        className={cn("mb-2 shrink-0", KANBAN_HEADER)}
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
          <span className={KANBAN_HEADER_COUNT}>
            {column.count}
          </span>
        </div>
      </div>

      <KanbanStageScroll
        footer={
          <KanbanColumnFooter
            createLabel="Create call"
            onCreate={() => router.push("/activities/calls/create")}
            onCollapse={() => setIsCollapsed(true)}
            collapseLabel={`Collapse ${column.title}`}
          />
        }
      >
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
          "flex min-h-full flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          isOver ? dropTargetActive : KANBAN_WELL,
        )}
      >
        <div className="flex min-h-[180px] flex-1 flex-col space-y-3 pb-4">
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
                  <div className={KANBAN_DROP_GHOST} />
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
                  <div className={KANBAN_DROP_GHOST} />
                )}
              </div>
            );
          })}

          {column.calls.length === 0 ? (
            <KanbanEmptyStage entity="Calls" />
          ) : null}
        </div>
      </div>
      </KanbanStageScroll>
    </div>
  );
}
