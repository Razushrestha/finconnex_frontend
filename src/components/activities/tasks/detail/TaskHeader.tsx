"use client";

import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/tasks/types";

interface TaskHeaderProps {
  task: Task;
  onBack: () => void;
  onUpdateStatus: (status: TaskStatus) => void;
}

export function TaskHeader({ task, onBack, onUpdateStatus }: TaskHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </button>
        <span className="h-4 w-px bg-slate-200" />
        <span className="text-xs font-mono text-slate-400">{task.taskId}</span>
        <span className="text-xs font-medium text-slate-500">
          {task.taskType}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-violet-700"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Convert to Project
        </button>
        <button
          type="button"
          onClick={() => onUpdateStatus("Completed")}
          className="flex items-center gap-1.5 bg-[#5A32A3] px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Close Task
        </button>
      </div>
    </div>
  );
}
