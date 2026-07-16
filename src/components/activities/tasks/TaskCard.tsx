import { AlertCircle, Clock, MessageSquare, Briefcase } from "lucide-react";
import type { Task } from "@/lib/tasks/types";

interface TaskCardProps {
  task: Task;
  columnId: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function TaskCard({
  task,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
}: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-task-id={task.taskId}
      data-column-id={columnId}
      className={`cursor-grab select-none rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <p className="mb-1.5 text-xs text-slate-400">{task.taskId}</p>
      <h4 className="mb-2 text-sm font-semibold text-slate-900">
        {task.title}
      </h4>

      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="text-slate-400">≣</span>
        <span className="truncate">{task.category}</span>
      </div>
      <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Briefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{task.project}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          {task.urgent && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
          {task.hasSchedule && <Clock className="h-3.5 w-3.5" />}
          {task.hasComment && <MessageSquare className="h-3.5 w-3.5" />}
          {task.dueDate && (
            <span
              className={`text-[11px] font-medium ${
                task.overdue ? "text-rose-500" : "text-slate-400"
              }`}
            >
              {task.dueDate}
            </span>
          )}
        </div>

        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${task.assignee.colorClass}`}
        >
          {task.assignee.initials}
        </span>
      </div>
    </div>
  );
}
