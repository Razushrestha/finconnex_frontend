"use client";

import { ArrowLeft, CheckCircle2, Flag, Sparkles } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/tasks/types";

interface TaskHeaderProps {
  task: Task;
  onBack: () => void;
  onUpdateStatus: (status: TaskStatus) => void;
}

export function TaskHeader({ task, onBack, onUpdateStatus }: TaskHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-border px-2 py-1">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </button>
        <span className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {task.taskId}
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {task.taskType}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Convert to Project
        </button>
        <button
          type="button"
          onClick={() => onUpdateStatus("Completed")}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Close Task
        </button>
      </div>
    </div>
  );
}
