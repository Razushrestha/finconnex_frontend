"use client";

import { useState } from "react";
import {
  emailColumns as initialColumns,
  type EmailColumn,
  type EmailStatus,
} from "@/lib/emails/types";
import { EmailsKanbanColumn } from "./EmailsKanbanColumn";

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
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPos | null>(
    null,
  );

  function handleDragStartEmail(
    e: React.DragEvent<HTMLDivElement>,
    emailId: string,
    columnId: string,
  ) {
    setDragInfo({ emailId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEndEmail() {
    setDragInfo(null);
    setDropTargetPos(null);
  }

  function handleDropEmail(targetColumnId: string, targetIndex?: number) {
    if (!dragInfo) return;
    const { emailId, sourceColumnId } = dragInfo;

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

    handleDragEndEmail();
  }

  return (
    <div className="flex h-full w-full min-w-0 items-stretch gap-4 overflow-x-auto p-1">
      {columns.map((column) => (
        <EmailsKanbanColumn
          key={column.id}
          column={column}
          draggingEmailId={dragInfo?.emailId ?? null}
          dropTargetPos={dropTargetPos}
          setDropTargetPos={setDropTargetPos}
          onDragStartEmail={handleDragStartEmail}
          onDragEndEmail={handleDragEndEmail}
          onDropEmail={handleDropEmail}
        />
      ))}
    </div>
  );
}
