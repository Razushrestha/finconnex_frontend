"use client";

import { Clock, Flag } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/tasks/types";
import { TaskAuditCard } from "@/components/activities/tasks/TaskAuditCard";

interface TaskMetadataCardProps {
  task: Task;
  onUpdateStatus: (status: TaskStatus) => void;
}

export function TaskMetadataCard({
  task,
  onUpdateStatus,
}: TaskMetadataCardProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{task.title}</h1>
          {task.relatedTo && (
            <p className="mt-1 text-xs text-muted-foreground">
              Project / Related:{" "}
              <span className="font-medium text-foreground">
                {task.relatedTo.name}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              task.priority === "Critical"
                ? "bg-rose-500/10 text-rose-600"
                : "bg-amber-500/10 text-amber-600"
            }`}
          >
            <Flag className="h-3 w-3" />
            {task.priority} Priority
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Due Date
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{task.dueDate}</span>
            {task.overdue && (
              <span className="text-rose-500 font-bold ml-1">Overdue</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Assigned To
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${task.assignee.colorClass}`}
            >
              {task.assignee.initials}
            </span>
            <span className="text-xs font-medium text-foreground">
              {task.assignedTo}
            </span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <div className="mt-1">
            <select
              value={task.status}
              onChange={(e) => onUpdateStatus(e.target.value as TaskStatus)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting">Waiting</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>
      </div>

      <TaskAuditCard
        createdBy={task.createdBy}
        createdOn={task.createdOn}
        modifiedBy={task.modifiedBy}
        modifiedOn={task.modifiedOn}
      />
    </div>
  );
}
