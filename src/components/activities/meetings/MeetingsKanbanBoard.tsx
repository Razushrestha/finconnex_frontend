"use client";

import { useState } from "react";
import {
  meetingColumns as initialColumns,
  type MeetingColumn,
} from "@/lib/meetings/types";
import { MeetingsKanbanColumn } from "./MeetingsKanbanColumn";

export function MeetingsKanbanBoard() {
  const [columns, setColumns] = useState<MeetingColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<{
    meetingId: string;
    sourceColumnId: string;
  } | null>(null);

  function handleDropMeeting(targetColumnId: string) {
    if (!dragInfo || dragInfo.sourceColumnId === targetColumnId) return;

    setColumns((prev) => {
      const sourceCol = prev.find((c) => c.id === dragInfo.sourceColumnId);
      const meeting = sourceCol?.meetings.find(
        (m) => m.id === dragInfo.meetingId,
      );
      if (!meeting) return prev;

      return prev.map((col) => {
        if (col.id === dragInfo.sourceColumnId)
          return {
            ...col,
            meetings: col.meetings.filter((m) => m.id !== dragInfo.meetingId),
            count: col.count - 1,
          };
        if (col.id === targetColumnId)
          return {
            ...col,
            meetings: [meeting, ...col.meetings],
            count: col.count + 1,
          };
        return col;
      });
    });
    setDragInfo(null);
  }

  return (
    <div className="flex h-full items-stretch gap-4">
      {columns.map((column) => (
        <MeetingsKanbanColumn
          key={column.id}
          column={column}
          draggingMeetingId={dragInfo?.meetingId ?? null}
          onDragStartMeeting={(e, id, colId) =>
            setDragInfo({ meetingId: id, sourceColumnId: colId })
          }
          onDragEndMeeting={() => setDragInfo(null)}
          onDropMeeting={handleDropMeeting}
        />
      ))}
    </div>
  );
}
