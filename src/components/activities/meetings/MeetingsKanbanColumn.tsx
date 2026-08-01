"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { MeetingColumn } from "@/lib/meetings/types";
import { MeetingCard } from "./MeetingCard";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";

interface MeetingsKanbanColumnProps {
  column: MeetingColumn;
  draggingMeetingId: string | null;
  onDragStartMeeting: (
    e: React.DragEvent<HTMLDivElement>,
    meetingId: string,
    columnId: string,
  ) => void;
  onDragEndMeeting: () => void;
  onDropMeeting: (targetColumnId: string) => void;
  embedded?: boolean;
}

export function MeetingsKanbanColumn({
  column,
  draggingMeetingId,
  onDragStartMeeting,
  onDragEndMeeting,
  onDropMeeting,
  embedded = false,
}: MeetingsKanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!embedded && isCollapsed) {
    return (
      <div className="flex h-full w-10 shrink-0 flex-col rounded-sm">
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
        "flex h-full min-w-[220px] flex-1 flex-col",
        !embedded && "w-72 shrink-0",
      )}
    >
      {/* Separate Header Box */}
      <div
        className={cn(
          "mb-3 shrink-0 rounded-sm p-2 shadow-sm",
          column.badgeColorClass,
        )}
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
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          onDropMeeting(column.id);
        }}
        className={cn(
          "flex flex-1 flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          embedded
            ? cn("min-h-[420px]", isOver && dropTargetActive)
            : isOver
              ? dropTargetActive
              : "bg-slate-200/70",
        )}
      >
        <div className="flex-1 space-y-2 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
          {column.meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              columnId={column.id}
              isDragging={draggingMeetingId === meeting.id}
              onDragStart={(e) => onDragStartMeeting(e, meeting.id, column.id)}
              onDragEnd={onDragEndMeeting}
            />
          ))}

          {column.meetings.length === 0 ? (
            <div
              className={cn(
                "py-8 text-center text-[11px] text-slate-300",
                !embedded &&
                  "rounded-xl border border-dashed border-slate-200 bg-white/70 py-10 text-slate-400",
              )}
            >
              {embedded ? "Empty" : "Drop a meeting here"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
