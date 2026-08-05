"use client";

import { useState } from "react";
import {
  meetingColumns as initialColumns,
  type MeetingColumn,
} from "@/lib/meetings/types";
import { MeetingsKanbanColumn } from "./MeetingsKanbanColumn";

interface DragInfo {
  meetingId: string;
  sourceColumnId: string;
}

export interface DropTargetPos {
  columnId: string;
  targetIndex: number;
}

export function MeetingsKanbanBoard() {
  const [columns, setColumns] = useState<MeetingColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPos | null>(
    null,
  );

  function handleDragStartMeeting(
    e: React.DragEvent<HTMLDivElement>,
    meetingId: string,
    columnId: string,
  ) {
    setDragInfo({ meetingId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEndMeeting() {
    setDragInfo(null);
    setDropTargetPos(null);
  }

  function handleDropMeeting(targetColumnId: string, targetIndex?: number) {
    if (!dragInfo) return;
    const { meetingId, sourceColumnId } = dragInfo;

    setColumns((prev) => {
      const sourceCol = prev.find((c) => c.id === sourceColumnId);
      const targetCol = prev.find((c) => c.id === targetColumnId);
      const meeting = sourceCol?.meetings.find((m) => m.id === meetingId);
      if (!meeting || !targetCol) return prev;

      const moved = {
        ...meeting,
        status: targetCol.title as typeof meeting.status,
      };

      return prev.map((col) => {
        if (col.id === sourceColumnId && col.id === targetColumnId) {
          const meetingsWithoutItem = col.meetings.filter(
            (m) => m.id !== meetingId,
          );
          const finalIndex = targetIndex ?? meetingsWithoutItem.length;
          const updatedMeetings = [...meetingsWithoutItem];
          updatedMeetings.splice(finalIndex, 0, moved);
          return { ...col, meetings: updatedMeetings };
        }

        if (col.id === sourceColumnId) {
          return {
            ...col,
            meetings: col.meetings.filter((m) => m.id !== meetingId),
            count: col.count - 1,
          };
        }

        if (col.id === targetColumnId) {
          const updatedMeetings = [...col.meetings];
          const finalIndex = targetIndex ?? updatedMeetings.length;
          updatedMeetings.splice(finalIndex, 0, moved);
          return {
            ...col,
            meetings: updatedMeetings,
            count: col.count + 1,
          };
        }

        return col;
      });
    });

    handleDragEndMeeting();
  }

  return (
    <div className="flex h-full items-stretch gap-4 overflow-x-auto p-1">
      {columns.map((column) => (
        <MeetingsKanbanColumn
          key={column.id}
          column={column}
          draggingMeetingId={dragInfo?.meetingId ?? null}
          dropTargetPos={dropTargetPos}
          setDropTargetPos={setDropTargetPos}
          onDragStartMeeting={handleDragStartMeeting}
          onDragEndMeeting={handleDragEndMeeting}
          onDropMeeting={handleDropMeeting}
        />
      ))}
    </div>
  );
}
