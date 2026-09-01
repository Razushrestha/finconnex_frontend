"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MeetingColumn } from "@/lib/meetings/types";
import { MeetingCard } from "./MeetingCard";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { KANBAN_COL, KANBAN_DROP_GHOST, KANBAN_HEADER, KANBAN_HEADER_COUNT, KANBAN_WELL } from "@/lib/layout";
import { useRouter } from "next/navigation";
import type { DropTargetPos } from "./MeetingsKanbanBoard";

interface MeetingsKanbanColumnProps {
  column: MeetingColumn;
  draggingMeetingId: string | null;
  dropTargetPos: DropTargetPos | null;
  setDropTargetPos: React.Dispatch<React.SetStateAction<DropTargetPos | null>>;
  onDragStartMeeting: (
    e: React.DragEvent<HTMLDivElement>,
    meetingId: string,
    columnId: string,
  ) => void;
  onDragEndMeeting: () => void;
  onDropMeeting: (targetColumnId: string, targetIndex?: number) => void;
  embedded?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (meetingId: string) => void;
}

export function MeetingsKanbanColumn({
  column,
  draggingMeetingId,
  dropTargetPos,
  setDropTargetPos,
  onDragStartMeeting,
  onDragEndMeeting,
  onDropMeeting,
  selectedIds = [],
  onToggleSelect,
}: MeetingsKanbanColumnProps) {
  const router = useRouter();
  const [isOver, setIsOver] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  function handleDragOverContainer(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsOver(true);

    const container = e.currentTarget;
    const cardElements = Array.from(
      container.querySelectorAll<HTMLElement>("[data-meeting-card]"),
    );

    const mouseY = e.clientY;
    let targetIndex = column.meetings.length;

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
        count={column.meetings.length}
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
            {column.meetings.length}
          </span>
        </div>
      </div>

      <KanbanStageScroll
        footer={
          <KanbanColumnFooter
            createLabel="Create meeting"
            onCreate={() => router.push("/activities/meetings/create")}
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
          onDropMeeting(column.id, dropTargetPos?.targetIndex);
        }}
        className={cn(
          "flex min-h-full flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          isOver ? dropTargetActive : KANBAN_WELL,
        )}
      >
        <div className="flex min-h-[180px] flex-1 flex-col space-y-2 pb-4">
          {column.meetings.map((meeting, index) => {
            const showPlaceholderBefore =
              dropTargetPos?.columnId === column.id &&
              dropTargetPos.targetIndex === index &&
              draggingMeetingId !== meeting.id;

            const showPlaceholderAfter =
              dropTargetPos?.columnId === column.id &&
              dropTargetPos.targetIndex === column.meetings.length &&
              index === column.meetings.length - 1 &&
              draggingMeetingId !== meeting.id;

            return (
              <div key={meeting.id} className="space-y-2">
                {showPlaceholderBefore && (
                  <div className={KANBAN_DROP_GHOST} />
                )}

                <div data-meeting-card>
                  <MeetingCard
                    meeting={meeting}
                    columnId={column.id}
                    isDragging={draggingMeetingId === meeting.id}
                    onDragStart={(e) =>
                      onDragStartMeeting(e, meeting.id, column.id)
                    }
                    onDragEnd={onDragEndMeeting}
                    isSelected={selectedIds.includes(meeting.id)}
                    onSelect={
                      onToggleSelect
                        ? () => onToggleSelect(meeting.id)
                        : undefined
                    }
                  />
                </div>

                {showPlaceholderAfter && (
                  <div className={KANBAN_DROP_GHOST} />
                )}
              </div>
            );
          })}

          {column.meetings.length === 0 ? (
            <KanbanEmptyStage entity="Meetings" />
          ) : null}
        </div>
      </div>
      </KanbanStageScroll>
    </div>
  );
}
