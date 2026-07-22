"use client";

import { useState } from "react";
import {
  emailColumns as initialColumns,
  type EmailColumn,
} from "@/lib/emails/types";
import { EmailsKanbanColumn } from "./EmailsKanbanColumn";

interface DragInfo {
  emailId: string;
  sourceColumnId: string;
}

export function EmailsKanbanBoard() {
  const [columns, setColumns] = useState<EmailColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

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
  }

  function handleDropEmail(targetColumnId: string) {
    if (!dragInfo) return;
    const { emailId, sourceColumnId } = dragInfo;

    if (sourceColumnId === targetColumnId) {
      setDragInfo(null);
      return;
    }

    setColumns((prev) => {
      const sourceColumn = prev.find((c) => c.id === sourceColumnId);
      const email = sourceColumn?.emails.find((e) => e.id === emailId);
      if (!email) return prev;

      return prev.map((col) => {
        if (col.id === sourceColumnId) {
          return {
            ...col,
            emails: col.emails.filter((e) => e.id !== emailId),
            count: col.count - 1,
          };
        }
        if (col.id === targetColumnId) {
          return {
            ...col,
            emails: [email, ...col.emails],
            count: col.count + 1,
          };
        }
        return col;
      });
    });

    setDragInfo(null);
  }

  return (
    <div className="flex h-full items-stretch gap-4">
      {columns.map((column) => (
        <EmailsKanbanColumn
          key={column.id}
          column={column}
          draggingEmailId={dragInfo?.emailId ?? null}
          onDragStartEmail={handleDragStartEmail}
          onDragEndEmail={handleDragEndEmail}
          onDropEmail={handleDropEmail}
        />
      ))}
    </div>
  );
}
