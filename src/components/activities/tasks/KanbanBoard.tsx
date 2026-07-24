"use client";

import { useEffect, useMemo, useState } from "react";
import {
  taskColumns as initialColumns,
  type TaskColumn,
  type TaskFilters,
} from "@/lib/tasks/types";
import { listTaskColumns, saveTaskColumns } from "@/lib/tasks/store";
import { KanbanColumn } from "./KanbanColumn";

interface DragInfo {
  taskId: string;
  sourceColumnId: string;
}

interface KanbanBoardProps {
  filters?: TaskFilters;
}

export function KanbanBoard({ filters }: KanbanBoardProps) {
  const [columns, setColumns] = useState<TaskColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  useEffect(() => {
    setColumns(listTaskColumns());
  }, []);

  function persist(next: TaskColumn[]) {
    saveTaskColumns(next);
    setColumns(next);
  }

  const visibleColumns = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    const hasPriorityFilter = !!filters?.priorities.length;
    const hasTypeFilter = !!filters?.types.length;
    if (!hasStatusFilter && !hasPriorityFilter && !hasTypeFilter)
      return columns;

    return columns
      .filter(
        (col) => !hasStatusFilter || filters!.statuses.includes(col.title),
      )
      .map((col) => ({
        ...col,
        tasks: col.tasks.filter(
          (task) =>
            (!hasPriorityFilter ||
              filters!.priorities.includes(task.priority)) &&
            (!hasTypeFilter || filters!.types.includes(task.taskType)),
        ),
      }));
  }, [columns, filters]);

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

    const sourceColumn = columns.find((c) => c.id === sourceColumnId);
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    const task = sourceColumn?.tasks.find((t) => t.taskId === taskId);
    if (!task || !targetColumn) {
      setDragInfo(null);
      return;
    }

    const moved = { ...task, status: targetColumn.title };
    persist(
      columns.map((col) => {
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
      }),
    );

    setDragInfo(null);
  }

  return (
    <div className="flex h-full items-stretch gap-4">
      {visibleColumns.map((column) => (
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
