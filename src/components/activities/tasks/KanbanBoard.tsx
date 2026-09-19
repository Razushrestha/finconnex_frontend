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
import { KanbanDragGhost } from "@/components/common/KanbanDragGhost";
import {
  usePointerKanbanDrag,
  type PointerKanbanDrop,
} from "@/lib/kanban/use-pointer-kanban-drag";
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
  visibleColumnIds?: string[];
  columnTitles?: Record<string, string>;
}

export function KanbanBoard({
  filters,
  search = "",
  groupBy = "status",
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
  visibleColumnIds,
  columnTitles,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<TaskColumn[]>(() => listTaskColumns());

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
    return grouped
      .filter((col) => !visibleColumnIds?.length || visibleColumnIds.includes(col.id))
      .map((col) => ({ ...col, count: col.tasks.length }));
  }, [columns, filters, groupBy, search, visibleColumnIds]);

  function handleDropTask({
    itemId: taskId,
    sourceColumnId,
    targetColumnId,
    targetIndex,
  }: PointerKanbanDrop) {
    const targetColumn = visibleColumns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;

    if (groupBy === "assignee") {
      reassignTask(taskId, targetColumn.title);
      setColumns(listTaskColumns());
      return;
    }

    if (groupBy === "priority") {
      updateTaskPriority(taskId, targetColumn.title as Priority);
      setColumns(listTaskColumns());
      return;
    }

    const sourceColumn = columns.find((c) => c.id === sourceColumnId);
    const task =
      sourceColumn?.tasks.find((t) => t.taskId === taskId) ??
      columns.flatMap((c) => c.tasks).find((t) => t.taskId === taskId);

    if (!task) return;

    const moved = { ...task, status: targetColumn.title as TaskStatus };

    if (sourceColumnId !== targetColumnId) {
      const nextStatus = targetColumn.title as TaskStatus;
      const updated = updateTaskStatus(taskId, nextStatus);
      if (updated) setColumns(listTaskColumns());
      void tryCrmTask(() => syncTaskStatus(taskId, nextStatus)).then((row) => {
        persistRemoteTask(row);
        setColumns(listTaskColumns());
      });
      return;
    }

    persist(
      columns.map((col) => {
        if (col.id !== sourceColumnId) return col;
        const tasksWithoutTask = col.tasks.filter((t) => t.taskId !== taskId);
        const finalIndex = targetIndex ?? tasksWithoutTask.length;
        const updatedTasks = [...tasksWithoutTask];
        updatedTasks.splice(finalIndex, 0, moved);
        return { ...col, tasks: updatedTasks };
      }),
    );
  }

  const drag = usePointerKanbanDrag({ onDrop: handleDropTask });

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
          draggingTaskId={drag.dragInfo?.itemId ?? null}
          dropTargetPos={drag.dropTargetPos}
          setDropTargetPos={() => undefined}
          onCardPointerDown={drag.onCardPointerDown}
          onDragClickCapture={
            drag.cardPointerProps({ id: "", columnId: "", name: "" })
              .onClickCapture
          }
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onChangePriority={handleChangePriority}
          onChangeStatus={handleChangeStatus}
          displayTitle={columnTitles?.[column.id]}
        />
      ))}
      <KanbanDragGhost ghost={drag.ghost} />
    </div>
  );
}
