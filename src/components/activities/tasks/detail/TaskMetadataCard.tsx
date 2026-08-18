"use client";

import { useState } from "react";
import { Clock, Flag, User } from "lucide-react";
import type { Priority, Task, TaskStatus } from "@/lib/tasks/types";
import { TASK_OWNERS, TASK_PRIORITIES } from "@/lib/tasks/types";
import { formatRelatedTo } from "@/lib/activities/shared";
import { RelatedToLink } from "@/components/activities/RelatedToLink";
import { useTaskSectionEdit } from "./TaskEditContext";

interface TaskMetadataCardProps {
  task: Task;
  onUpdateStatus: (status: TaskStatus) => void;
  onSaveDetails?: (next: {
    title: string;
    dueDate: string;
    assignedTo: string;
    priority: Priority;
  }) => void;
}

function toDateInput(value: string): string {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function fromDateInput(value: string): string {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return value;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function TaskMetadataCard({
  task,
  onUpdateStatus,
  onSaveDetails,
}: TaskMetadataCardProps) {
  const relatedLabel = formatRelatedTo(task.relatedTo);
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(toDateInput(task.dueDate));
  const [assignedTo, setAssignedTo] = useState(task.assignedTo);
  const [priority, setPriority] = useState<Priority>(task.priority);

  const editing = useTaskSectionEdit({
    start() {
      setTitle(task.title);
      setDueDate(toDateInput(task.dueDate));
      setAssignedTo(task.assignedTo);
      setPriority(task.priority);
    },
    save() {
      onSaveDetails?.({
        title: title.trim() || task.title,
        dueDate: dueDate ? fromDateInput(dueDate) : task.dueDate,
        assignedTo,
        priority,
      });
    },
    cancel() {
      setTitle(task.title);
      setDueDate(toDateInput(task.dueDate));
      setAssignedTo(task.assignedTo);
      setPriority(task.priority);
    },
  });

  return (
    <section className="border-b border-slate-100 py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-b border-slate-200 bg-transparent text-2xl font-semibold tracking-tight text-slate-900 outline-none focus:border-violet-400"
            />
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {task.title}
            </h1>
          )}
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
        <div className="flex shrink-0 items-center gap-3">
          {editing ? (
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Flag className="h-3 w-3 text-slate-400" />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="bg-transparent py-0.5 outline-none"
              >
                {TASK_PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    {option} Priority
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                task.priority === "Critical" ? "text-rose-600" : "text-amber-600"
              }`}
            >
              <Flag className="h-3 w-3" />
              {task.priority} Priority
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Due Date
          </p>
          {editing ? (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1.5 border-b border-slate-200 bg-transparent py-0.5 text-sm font-medium text-slate-800 outline-none focus:border-violet-400"
            />
          ) : (
            <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Clock
                className={`h-3.5 w-3.5 ${task.overdue ? "text-rose-500" : "text-slate-400"}`}
              />
              <span className={task.overdue ? "text-rose-600" : undefined}>
                {task.dueDate}
              </span>
              {task.overdue ? (
                <span className="font-semibold text-rose-500">Overdue</span>
              ) : null}
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Assigned To
          </p>
          {editing ? (
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-1.5 bg-transparent py-0.5 text-sm font-medium text-slate-800 outline-none"
            >
              {TASK_OWNERS.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          ) : (
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
          )}
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
          label="Created by"
          by={task.createdBy || task.assignedTo}
          on={task.createdOn || "17/08/2026 09:00 AM"}
        />
        <AuditLine
          label="Modified by"
          by={task.modifiedBy || task.createdBy || task.assignedTo}
          on={task.modifiedOn || task.createdOn || "17/08/2026 09:00 AM"}
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
