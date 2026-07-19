"use client";

import { useState } from "react";
import type { MeetingColumn } from "@/lib/meetings/types";
import { MeetingCard } from "./MeetingCard";

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
}

export function MeetingsKanbanColumn({
  column,
  draggingMeetingId,
  onDragStartMeeting,
  onDragEndMeeting,
  onDropMeeting,
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
      className={`flex h-full w-72 shrink-0 flex-col rounded-2xl p-3 transition-colors ${
        isOver ? "bg-indigo-50 ring-2 ring-indigo-300" : "bg-slate-100/70"
      }`}
    >
      <div className="mb-3 shrink-0">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${column.badgeColorClass}`}
        >
          {column.title} ({column.count})
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
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
      </div>
    </div>
  );
}
