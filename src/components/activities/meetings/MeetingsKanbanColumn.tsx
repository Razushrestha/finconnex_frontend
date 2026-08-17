"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { MeetingColumn } from "@/lib/meetings/types";
import { MeetingCard } from "./MeetingCard";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { KANBAN_COL, KANBAN_HEADER, KANBAN_HEADER_RAIL, KANBAN_WELL } from "@/lib/layout";
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
}

export function MeetingsKanbanColumn({
  column,
  draggingMeetingId,
  dropTargetPos,
  setDropTargetPos,
  onDragStartMeeting,
  onDragEndMeeting,
  onDropMeeting,
  embedded = false,
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

  if (!embedded && isCollapsed) {
    return (
      <div className="mb-4 flex h-full w-10 shrink-0 flex-col rounded-sm">
        <div
          className={cn(
            "flex h-full flex-col items-center gap-3 p-2",
            KANBAN_HEADER_RAIL,
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
            {column.meetings.length}
          </span>

          <span className="mt-1 flex-1 [writing-mode:vertical-rl] text-sm font-semibold text-slate-900">
            {column.title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group mb-4 flex h-full min-w-[220px] flex-1 flex-col",
        !embedded && KANBAN_COL,
      )}
    >
      {/* Separate Header Box */}
      <div
        className={cn("mb-2 shrink-0", KANBAN_HEADER)}
      >
        <div className="flex items-center justify-between gap-4">
          {embedded ? (
            <h3 className="text-sm font-semibold text-slate-900">
              {column.title}
            </h3>
          ) : (
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
          )}
          <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
            {column.meetings.length}
          </span>
        </div>
      </div>

      {/* Meeting List / Drop Zone Container */}
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
          "flex min-h-0 flex-1 flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          isOver ? dropTargetActive : KANBAN_WELL,
        )}
      >
        <div className="flex-1 space-y-2 overflow-y-auto pb-4 pr-0.5 [scrollbar-width:thin]">
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
                  <div className="h-20 w-full animate-pulse rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/50 transition-all" />
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
                  />
                </div>

                {showPlaceholderAfter && (
                  <div className="h-20 w-full animate-pulse rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/50 transition-all" />
                )}
              </div>
            );
          })}

          {column.meetings.length === 0 && (
            <div
              className={cn(
                "py-8 text-center text-[11px] text-slate-300",
                !embedded &&
                  "rounded-xl border border-dashed border-slate-200 bg-white/70 py-10 text-slate-400",
              )}
            >
              {embedded ? "Empty" : "Drop a meeting here"}
            </div>
          )}
        </div>
      </div>

      {!embedded && (
        <KanbanColumnFooter
          createLabel="Create meeting"
          onCreate={() => router.push("/activities/meetings/create")}
          onCollapse={() => setIsCollapsed(true)}
          collapseLabel={`Collapse ${column.title}`}
        />
      )}
    </div>
  );
}
