"use client";

import { useState } from "react";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Priority, TaskBoardColumn, TaskStatus } from "@/lib/tasks/types";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { KANBAN_COL, KANBAN_HEADER, KANBAN_HEADER_COUNT, KANBAN_HEADER_RAIL, KANBAN_WELL } from "@/lib/layout";
import { useRouter } from "next/navigation";
import type { DropTargetPos } from "./KanbanBoard";

interface KanbanColumnProps {
  column: TaskBoardColumn;
  draggingTaskId: string | null;
  dropTargetPos: DropTargetPos | null;
  setDropTargetPos: React.Dispatch<React.SetStateAction<DropTargetPos | null>>;
  onDragStartTask: (
    e: React.DragEvent<HTMLDivElement>,
    taskId: string,
    columnId: string,
  ) => void;
  onDragEndTask: () => void;
  onDropTask: (targetColumnId: string, targetIndex?: number) => void;
  selectedIds?: string[];
  onToggleSelect: (id: string) => void;
  onChangePriority?: (taskId: string, priority: Priority) => void;
  onChangeStatus?: (taskId: string, status: TaskStatus) => void;
}

export function KanbanColumn({
  column,
  draggingTaskId,
  dropTargetPos,
  setDropTargetPos,
  onDragStartTask,
  onDragEndTask,
  onDropTask,
  selectedIds,
  onToggleSelect,
  onChangePriority,
  onChangeStatus,
}: KanbanColumnProps) {
  const router = useRouter();
  const [isOver, setIsOver] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calculates which index the card should land on based on mouse position over elements
  function handleDragOverContainer(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsOver(true);

    const container = e.currentTarget;
    const cardElements = Array.from(
      container.querySelectorAll<HTMLElement>("[data-task-card]"),
    );

    const mouseY = e.clientY;
    let targetIndex = column.tasks.length;

    for (let i = 0; i < cardElements.length; i++) {
      const rect = cardElements[i].getBoundingClientRect();
      const cardMidpoint = rect.top + rect.height / 2;
      if (mouseY < cardMidpoint) {
        targetIndex = i;
        break;
      }
    }

    setDropTargetPos({ columnId: column.id, targetIndex });
  }

  if (isCollapsed) {
    return (
      <div className="flex h-full w-10 shrink-0 flex-col rounded-sm mb-4">
        <div
          className={cn(
            "flex h-full flex-col items-center gap-3 p-2",
            KANBAN_HEADER_RAIL,
          )}
        >
          <span className={KANBAN_HEADER_COUNT}>
            {column.count}
          </span>
          <span className="mt-1 [writing-mode:vertical-rl] text-sm font-semibold text-slate-900">
            {column.title}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="shrink-0 rounded-sm hover:opacity-70"
            title="Expand"
            aria-expanded={false}
            aria-label={`Expand ${column.title}`}
          >
            <ChevronRight className="h-4 w-4 text-slate-700" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group mb-4 flex h-full flex-col", KANBAN_COL)}>
      {/* Header Box */}
      <div
        className={cn("mb-2 shrink-0", KANBAN_HEADER)}
      >
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            title="Collapse"
            className="flex items-center gap-1.5 rounded-sm hover:opacity-70"
          >
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              {column.title}
            </h3>
          </button>
          <span className={KANBAN_HEADER_COUNT}>
            {column.count}
          </span>
        </div>
      </div>

      {/* Task List / Drop Zone Container - Added group class here so hover state works on the column container */}
      <div
        onDragOver={handleDragOverContainer}
        onDragLeave={() => {
          setIsOver(false);
          if (dropTargetPos?.columnId === column.id) {
            setDropTargetPos(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          onDropTask(column.id, dropTargetPos?.targetIndex);
        }}
        className={cn(
          "group flex min-h-0 flex-1 flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          isOver ? dropTargetActive : KANBAN_WELL,
        )}
      >
        <div className="flex-1 space-y-3 overflow-y-auto pb-4 pr-1">
          {column.tasks.map((task, index) => {
            const showPlaceholderBefore =
              dropTargetPos?.columnId === column.id &&
              dropTargetPos.targetIndex === index &&
              draggingTaskId !== task.taskId;

            const showPlaceholderAfter =
              dropTargetPos?.columnId === column.id &&
              dropTargetPos.targetIndex === column.tasks.length &&
              index === column.tasks.length - 1 &&
              draggingTaskId !== task.taskId;

            return (
              <div key={task.taskId} className="space-y-3">
                {/* Placeholder Card before current item */}
                {showPlaceholderBefore && (
                  <div className="h-20 w-full rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/50 transition-all animate-pulse" />
                )}

                <div data-task-card>
                  <TaskCard
                    task={task}
                    columnId={column.id}
                    isDragging={draggingTaskId === task.taskId}
                    isSelected={selectedIds?.includes(task.taskId)}
                    onSelect={() => onToggleSelect(task.taskId)}
                    onDragStart={(e) =>
                      onDragStartTask(e, task.taskId, column.id)
                    }
                    onDragEnd={onDragEndTask}
                    onChangePriority={onChangePriority}
                    onChangeStatus={onChangeStatus}
                  />
                </div>

                {/* Placeholder Card at the very end of list if targeted */}
                {showPlaceholderAfter && (
                  <div className="h-20 w-full rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/50 transition-all animate-pulse" />
                )}
              </div>
            );
          })}

          {column.tasks.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-8 text-center text-xs text-slate-400">
              Drop a task here
            </div>
          )}
        </div>

        <KanbanColumnFooter
          createLabel="Create task"
          onCreate={() => router.push("/activities/tasks/create")}
          onCollapse={() => setIsCollapsed(true)}
          collapseLabel={`Collapse ${column.title}`}
        />
      </div>
    </div>
  );
}
