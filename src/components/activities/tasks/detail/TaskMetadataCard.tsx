"use client";

import { Clock, Flag, User } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/tasks/types";
import { formatRelatedTo } from "@/lib/activities/shared";
import { RelatedToLink } from "@/components/activities/RelatedToLink";

interface TaskMetadataCardProps {
  task: Task;
  onUpdateStatus: (status: TaskStatus) => void;
}

export function TaskMetadataCard({
  task,
  onUpdateStatus,
}: TaskMetadataCardProps) {
  const relatedLabel = formatRelatedTo(task.relatedTo);

  return (
    <section className="border-b border-slate-100 py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {task.title}
          </h1>
          {relatedLabel ? (
            <p className="mt-1.5 text-sm text-slate-500">
              Related:{" "}
              <RelatedToLink
                relatedTo={relatedLabel}
                className="font-medium text-slate-800"
              />
            </p>
          ) : null}
        </div>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold ${
            task.priority === "Critical"
              ? "text-rose-600"
              : "text-amber-600"
          }`}
        >
          <Flag className="h-3 w-3" />
          {task.priority} Priority
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Due Date
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{task.dueDate}</span>
            {task.overdue ? (
              <span className="font-semibold text-rose-500">Overdue</span>
            ) : null}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Assigned To
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${task.assignee.colorClass}`}
            >
              {task.assignee.initials}
            </span>
            <span className="text-sm font-medium text-slate-800">
              {task.assignedTo}
            </span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Status
          </p>
          <select
            value={task.status}
            onChange={(e) => onUpdateStatus(e.target.value as TaskStatus)}
            className="mt-1.5 bg-transparent py-0.5 text-sm font-medium text-slate-800 outline-none"
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

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <AuditLine
          label="Created"
          by={task.createdBy}
          on={task.createdOn}
        />
        <AuditLine
          label="Modified"
          by={task.modifiedBy}
          on={task.modifiedOn}
        />
      </div>
    </section>
  );
}

function AuditLine({
  label,
  by,
  on,
}: {
  label: string;
  by?: string;
  on?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-700">
        <User className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-medium">{by || "—"}</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500">{on || "—"}</span>
      </div>
    </div>
  );
}
