"use client";

import { useState } from "react";
import {
  meetingColumns as initialColumns,
  type MeetingColumn,
} from "@/lib/meetings/types";
import { MeetingsKanbanColumn } from "./MeetingsKanbanColumn";
import { KanbanDragGhost } from "@/components/common/KanbanDragGhost";
import {
  usePointerKanbanDrag,
  type PointerKanbanDrop,
} from "@/lib/kanban/use-pointer-kanban-drag";

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

  function handleDropMeeting({
    itemId: meetingId,
    sourceColumnId,
    targetColumnId,
    targetIndex,
  }: PointerKanbanDrop) {

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
  }

  const drag = usePointerKanbanDrag({ onDrop: handleDropMeeting });

  return (
    <div className="flex h-full w-full min-w-0 items-stretch gap-4 overflow-x-auto p-1">
      {columns.map((column) => (
        <MeetingsKanbanColumn
          key={column.id}
          column={column}
          draggingMeetingId={drag.dragInfo?.itemId ?? null}
          dropTargetPos={drag.dropTargetPos}
          setDropTargetPos={() => undefined}
          onCardPointerDown={drag.onCardPointerDown}
          onDragClickCapture={
            drag.cardPointerProps({ id: "", columnId: "", name: "" })
              .onClickCapture
          }
        />
      ))}
      <KanbanDragGhost ghost={drag.ghost} />
    </div>
  );
}
