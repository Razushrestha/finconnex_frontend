"use client";

import { useState } from "react";
import {
  emailColumns as initialColumns,
  type EmailColumn,
  type EmailStatus,
} from "@/lib/emails/types";
import { EmailsKanbanColumn } from "./EmailsKanbanColumn";
import { KanbanDragGhost } from "@/components/common/KanbanDragGhost";
import {
  usePointerKanbanDrag,
  type PointerKanbanDrop,
} from "@/lib/kanban/use-pointer-kanban-drag";

interface DragInfo {
  emailId: string;
  sourceColumnId: string;
}

export interface DropTargetPos {
  columnId: string;
  targetIndex: number;
}

export function EmailsKanbanBoard() {
  const [columns, setColumns] = useState<EmailColumn[]>(initialColumns);

  function handleDropEmail({
    itemId: emailId,
    sourceColumnId,
    targetColumnId,
    targetIndex,
  }: PointerKanbanDrop) {

    setColumns((prev) => {
      const sourceColumn = prev.find((c) => c.id === sourceColumnId);
      const targetColumn = prev.find((c) => c.id === targetColumnId);
      const email = sourceColumn?.emails.find((e) => e.id === emailId);
      if (!email || !targetColumn) return prev;

      const moved = { ...email, status: targetColumn.title as EmailStatus };

      return prev.map((col) => {
        if (col.id === sourceColumnId && col.id === targetColumnId) {
          const emailsWithoutItem = col.emails.filter((e) => e.id !== emailId);
          const finalIndex = targetIndex ?? emailsWithoutItem.length;
          const updatedEmails = [...emailsWithoutItem];
          updatedEmails.splice(finalIndex, 0, moved);
          return { ...col, emails: updatedEmails };
        }

        if (col.id === sourceColumnId) {
          return {
            ...col,
            emails: col.emails.filter((e) => e.id !== emailId),
            count: col.count - 1,
          };
        }

        if (col.id === targetColumnId) {
          const updatedEmails = [...col.emails];
          const finalIndex = targetIndex ?? updatedEmails.length;
          updatedEmails.splice(finalIndex, 0, moved);
          return {
            ...col,
            emails: updatedEmails,
            count: col.count + 1,
          };
        }

        return col;
      });
    });
  }

  const drag = usePointerKanbanDrag({ onDrop: handleDropEmail });

  return (
    <div className="flex h-full w-full min-w-0 items-stretch gap-4 overflow-x-auto p-1">
      {columns.map((column) => (
        <EmailsKanbanColumn
          key={column.id}
          column={column}
          draggingEmailId={drag.dragInfo?.itemId ?? null}
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
