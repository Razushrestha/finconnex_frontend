"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type TaskColumn,
  type TaskFilters,
  type Task,
  type TaskGroupBy,
  groupTaskColumns,
} from "@/lib/tasks/types";
import {
  listTaskColumns,
  saveTaskColumns,
  updateTaskPriority,
  updateTaskStatus,
  reassignTask,
} from "@/lib/tasks/store";
import {
  persistRemoteTask,
  syncTaskStatus,
  tryCrmTask,
  updateCrmTask,
} from "@/lib/tasks/api";
import { onRulesChange } from "@/lib/rules";
import { taskMatchesFilters, taskMatchesSearch } from "@/lib/tasks/search";
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
  search?: string;
  groupBy?: TaskGroupBy;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
}

export function KanbanBoard({
  filters,
  search = "",
  groupBy = "status",
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<TaskColumn[]>(() => listTaskColumns());
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPos | null>(
    null,
  );

  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);
  const selectedIds = controlledSelectedIds ?? localSelectedIds;

  function setSelectedIds(ids: string[]) {
    if (onSelectedIdsChange) onSelectedIdsChange(ids);
    else setLocalSelectedIds(ids);
  }

  useEffect(() => {
    setColumns(listTaskColumns());
  }, []);

  useEffect(() => {
    return onRulesChange(() => setColumns(listTaskColumns()));
  }, []);

  function persist(next: TaskColumn[]) {
    saveTaskColumns(next);
    setColumns(next);
  }

  function handleToggleSelect(taskId: string) {
    setSelectedIds(
      selectedIds.includes(taskId)
        ? selectedIds.filter((id) => id !== taskId)
        : [...selectedIds, taskId],
    );
  }

  const visibleColumns = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    const hasScope = Boolean(filters?.scope && filters.scope !== "all");
    const query = search.trim();

    let sourceColumns = columns;
    if (hasStatusFilter || hasScope || query || filters) {
      sourceColumns = columns
        .filter(
          (col) => !hasStatusFilter || filters!.statuses.includes(col.title),
        )
        .map((col) => ({
          ...col,
          tasks: col.tasks.filter(
            (task) =>
              taskMatchesFilters(task, filters) &&
              taskMatchesSearch(task, query),
          ),
        }));
    }

    const grouped = groupTaskColumns(sourceColumns, groupBy);
    return grouped.map((col) => ({ ...col, count: col.tasks.length }));
  }, [columns, filters, groupBy, search]);

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

    const targetColumn = visibleColumns.find((c) => c.id === targetColumnId);
    if (!targetColumn) {
      handleDragEndTask();
      return;
    }

    if (groupBy === "assignee") {
      reassignTask(taskId, targetColumn.title);
      setColumns(listTaskColumns());
      handleDragEndTask();
      return;
    }

    if (groupBy === "priority") {
      updateTaskPriority(taskId, targetColumn.title as Priority);
      setColumns(listTaskColumns());
      handleDragEndTask();
      return;
    }

    const sourceColumn = columns.find((c) => c.id === sourceColumnId);
    const task = sourceColumn?.tasks.find((t) => t.taskId === taskId);

    if (!task) {
      handleDragEndTask();
      return;
    }

    const moved = { ...task, status: targetColumn.title as TaskStatus };

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

    if (sourceColumnId !== targetColumnId) {
      void tryCrmTask(() =>
        syncTaskStatus(taskId, targetColumn.title as TaskStatus),
      ).then(persistRemoteTask);
    }

    handleDragEndTask();
  }

  function handleChangePriority(taskId: string, priority: Priority) {
    const updated = updateTaskPriority(taskId, priority);
    if (updated) setColumns(listTaskColumns());
    void tryCrmTask(() => updateCrmTask(taskId, { priority })).then(
      persistRemoteTask,
    );
  }

  function handleChangeStatus(taskId: string, status: TaskStatus) {
    const updated = updateTaskStatus(taskId, status);
    if (updated) setColumns(listTaskColumns());
    void tryCrmTask(() => syncTaskStatus(taskId, status)).then(persistRemoteTask);
  }

  return (
    <div className="flex h-full w-full min-w-0 items-stretch gap-3 overflow-x-auto overflow-y-hidden bg-slate-50 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400">
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
