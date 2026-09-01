"use client";

import { useState } from "react";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { ChevronDown } from "lucide-react";
import type { Priority, TaskBoardColumn, TaskStatus } from "@/lib/tasks/types";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { KANBAN_COL, KANBAN_DROP_GHOST, KANBAN_HEADER, KANBAN_HEADER_COUNT, KANBAN_WELL } from "@/lib/layout";
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
      <KanbanCollapsedRail
        title={column.title}
        count={column.count}
        onExpand={() => setIsCollapsed(false)}
      />
    );
  }

  return (
    <div className={cn("group/stage flex h-full min-h-0 flex-col", KANBAN_COL)}>
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

      <KanbanStageScroll
        footer={
          <KanbanColumnFooter
            createLabel="Create task"
            onCreate={() => router.push("/activities/tasks/create")}
            onCollapse={() => setIsCollapsed(true)}
            collapseLabel={`Collapse ${column.title}`}
          />
        }
      >
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
          "flex min-h-full flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          isOver ? dropTargetActive : KANBAN_WELL,
        )}
      >
        <div className="flex min-h-[180px] flex-1 flex-col space-y-3 pb-4">
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
                  <div className={KANBAN_DROP_GHOST} />
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
                  <div className={KANBAN_DROP_GHOST} />
                )}
              </div>
            );
          })}

          {column.tasks.length === 0 ? (
            <KanbanEmptyStage entity="Tasks" />
          ) : null}
        </div>
      </div>
      </KanbanStageScroll>
    </div>
  );
}
