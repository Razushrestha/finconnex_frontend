"use client";

import { useEffect, useMemo, useState } from "react";
import {
  taskColumns as initialColumns,
  type TaskColumn,
  type TaskFilters,
  type Task,
} from "@/lib/tasks/types";
import {
  listTaskColumns,
  saveTaskColumns,
  updateTaskPriority,
  updateTaskStatus,
} from "@/lib/tasks/store";
import { KanbanColumn } from "./KanbanColumn";
import type { Priority, TaskStatus } from "@/lib/tasks/types";

interface DragInfo {
  taskId: string;
  sourceColumnId: string;
}

export interface DropTargetPos {
  columnId: string;
  targetIndex: number;
}

interface KanbanBoardProps {
  filters?: TaskFilters;
}

export function KanbanBoard({ filters }: KanbanBoardProps) {
  const [columns, setColumns] = useState<TaskColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPos | null>(
    null,
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setColumns(listTaskColumns());
  }, []);

  function persist(next: TaskColumn[]) {
    saveTaskColumns(next);
    setColumns(next);
  }

  function handleToggleSelect(taskId: string) {
    setSelectedIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
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
    setDropTargetPos(null);
  }

  function handleDropTask(targetColumnId: string, targetIndex?: number) {
    if (!dragInfo) return;
    const { taskId, sourceColumnId } = dragInfo;

    const sourceColumn = columns.find((c) => c.id === sourceColumnId);
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    const task = sourceColumn?.tasks.find((t) => t.taskId === taskId);

    if (!task || !targetColumn) {
      handleDragEndTask();
      return;
    }

    const moved = { ...task, status: targetColumn.title };

    persist(
      columns.map((col) => {
        if (col.id === sourceColumnId && col.id === targetColumnId) {
          // Reordering within the same column
          const tasksWithoutTask = col.tasks.filter((t) => t.taskId !== taskId);
          const finalIndex = targetIndex ?? tasksWithoutTask.length;
          const updatedTasks = [...tasksWithoutTask];
          updatedTasks.splice(finalIndex, 0, moved);
          return { ...col, tasks: updatedTasks };
        }

        if (col.id === sourceColumnId) {
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.taskId !== taskId),
            count: col.count - 1,
          };
        }

        if (col.id === targetColumnId) {
          const updatedTasks = [...col.tasks];
          const finalIndex = targetIndex ?? updatedTasks.length;
          updatedTasks.splice(finalIndex, 0, moved);
          return {
            ...col,
            tasks: updatedTasks,
            count: col.count + 1,
          };
        }

        return col;
      }),
    );

    handleDragEndTask();
  }

  function handleChangePriority(taskId: string, priority: Priority) {
    const updated = updateTaskPriority(taskId, priority);
    if (updated) setColumns(listTaskColumns());
  }

  function handleChangeStatus(taskId: string, status: TaskStatus) {
    const updated = updateTaskStatus(taskId, status);
    if (updated) setColumns(listTaskColumns());
  }

  return (
    <div className="flex h-full items-stretch gap-4">
      {visibleColumns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          draggingTaskId={dragInfo?.taskId ?? null}
          dropTargetPos={dropTargetPos}
          setDropTargetPos={setDropTargetPos}
          onDragStartTask={handleDragStartTask}
          onDragEndTask={handleDragEndTask}
          onDropTask={handleDropTask}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onChangePriority={handleChangePriority}
          onChangeStatus={handleChangeStatus}
        />
      ))}
    </div>
  );
}
