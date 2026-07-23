"use client";

import { useState } from "react";
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

  return (
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
        "flex h-full min-w-[220px] flex-1 flex-col",
        dropTargetIdle,
        embedded
          ? cn("min-h-[420px]", isOver && dropTargetActive)
          : cn(
              "w-72 shrink-0 rounded-2xl border p-3",
              isOver
                ? dropTargetActive
                : "border-slate-200/70 bg-slate-50/80",
            ),
      )}
    >
      <div
        className={cn(
          "shrink-0",
          embedded ? "border-b border-slate-100 px-3 py-2" : "mb-3",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            !embedded && "shadow-sm",
            column.badgeColorClass,
          )}
        >
          {column.title}
          <span className="rounded-full bg-white/25 px-1.5 py-px text-[10px]">
            {column.meetings.length}
          </span>
        </span>
      </div>

      <div
        className={cn(
          "flex-1 space-y-2 overflow-y-auto [scrollbar-width:thin]",
          embedded ? "p-2" : "pr-0.5",
        )}
      >
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
  );
}
