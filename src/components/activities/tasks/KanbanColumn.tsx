"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { TaskColumn } from "@/lib/tasks/types";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";

interface KanbanColumnProps {
  column: TaskColumn;
  draggingTaskId: string | null;
  onDragStartTask: (
    e: React.DragEvent<HTMLDivElement>,
    taskId: string,
    columnId: string,
  ) => void;
  onDragEndTask: () => void;
  onDropTask: (targetColumnId: string) => void;
}

export function KanbanColumn({
  column,
  draggingTaskId,
  onDragStartTask,
  onDragEndTask,
  onDropTask,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        onDropTask(column.id);
      }}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-2xl border border-transparent p-3",
        dropTargetIdle,
        isOver ? dropTargetActive : "bg-slate-100/70",
      )}
    >
      {/* Header — stays fixed while the task list scrolls */}
      <div className="mb-3 shrink-0">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${column.badgeColorClass}`}
        >
          {column.title} ({column.count})
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
        {column.tasks.map((task) => (
          <TaskCard
            key={task.taskId}
            task={task}
            columnId={column.id}
            isDragging={draggingTaskId === task.taskId}
            onDragStart={(e) => onDragStartTask(e, task.taskId, column.id)}
            onDragEnd={onDragEndTask}
          />
        ))}

        {column.tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-8 text-center text-xs text-slate-400">
            Drop a task here
          </div>
        )}
      </div>
    </div>
  );
}
