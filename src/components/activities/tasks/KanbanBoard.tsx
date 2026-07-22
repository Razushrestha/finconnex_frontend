"use client";

import { useState } from "react";
import {
  taskColumns as initialColumns,
  type TaskColumn,
} from "@/lib/tasks/types";
import { KanbanColumn } from "./KanbanColumn";

interface DragInfo {
  taskId: string;
  sourceColumnId: string;
}

export function KanbanBoard() {
  const [columns, setColumns] = useState<TaskColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  function handleDragStartTask(
    e: React.DragEvent<HTMLDivElement>,
    taskId: string,
    columnId: string,
  ) {
    setDragInfo({ taskId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEndTask() {
    setDragInfo(null);
  }

  function handleDropTask(targetColumnId: string) {
    if (!dragInfo) return;
    const { taskId, sourceColumnId } = dragInfo;

    if (sourceColumnId === targetColumnId) {
      setDragInfo(null);
      return;
    }

    setColumns((prev) => {
      const sourceColumn = prev.find((c) => c.id === sourceColumnId);
      const targetColumn = prev.find((c) => c.id === targetColumnId);
      const task = sourceColumn?.tasks.find((t) => t.taskId === taskId);
      if (!task || !targetColumn) return prev;

      const moved = { ...task, status: targetColumn.title };

      return prev.map((col) => {
        if (col.id === sourceColumnId) {
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.taskId !== taskId),
            count: col.count - 1,
          };
        }
        if (col.id === targetColumnId) {
          return {
            ...col,
            tasks: [moved, ...col.tasks],
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
        <KanbanColumn
          key={column.id}
          column={column}
          draggingTaskId={dragInfo?.taskId ?? null}
          onDragStartTask={handleDragStartTask}
          onDragEndTask={handleDragEndTask}
          onDropTask={handleDropTask}
        />
      ))}
    </div>
  );
}
