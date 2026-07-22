"use client";

import {
  AlertCircle,
  Calendar,
  Building2,
  User,
} from "lucide-react";
import type { Task } from "@/lib/tasks/types";
import { formatRelatedTo } from "@/lib/activities/shared";

interface TaskCardProps {
  task: Task;
  columnId: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const priorityClass: Record<string, string> = {
  High: "bg-rose-50 text-rose-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

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
      className={`cursor-grab select-none rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
          {task.taskId}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityClass[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>

      <h4 className="mb-2 text-[13px] font-semibold text-slate-900">
        {task.title}
      </h4>

      <div className="mb-3 space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-violet-50 px-1.5 py-0.5 font-medium text-violet-700">
            {task.taskType}
          </span>
        </div>
        {task.relatedTo ? (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">
              {formatRelatedTo(task.relatedTo)}
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
          <span className={task.overdue ? "font-medium text-rose-500" : ""}>
            Due {task.dueDate}
          </span>
          {task.overdue ? (
            <AlertCircle className="h-3 w-3 text-rose-500" />
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{task.assignedTo}</span>
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-slate-50 pt-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${task.assignee.colorClass}`}
        >
          {task.assignee.initials}
        </span>
      </div>
    </div>
  );
}
