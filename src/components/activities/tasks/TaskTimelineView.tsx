"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { listAllTasks, snoozeTask } from "@/lib/tasks/store";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import type { Task, TaskFilters } from "@/lib/tasks/types";
import { onRulesChange } from "@/lib/rules";
import { cn } from "@/lib/utils";

function filterTasks(tasks: Task[], filters: TaskFilters) {
  return tasks.filter((t) => {
    if (filters.statuses.length && !filters.statuses.includes(t.status)) {
      return false;
    }
    if (filters.priorities.length && !filters.priorities.includes(t.priority)) {
      return false;
    }
    if (filters.types.length && !filters.types.includes(t.taskType)) {
      return false;
    }
    return true;
  });
}

const SNOOZE_OPTIONS = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "1 week" },
];

export function TaskTimelineView({ filters }: { filters: TaskFilters }) {
  const [tasks, setTasks] = useState(() => listAllTasks());
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    return onRulesChange(() => setTasks(listAllTasks()));
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2500);
    return () => window.clearTimeout(t);
  }, [flash]);

  const rows = useMemo(() => {
    return filterTasks(tasks, filters)
      .map((t) => ({ task: t, due: parseTaskDueDate(t.dueDate) }))
      .sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.getTime() - b.due.getTime();
      });
  }, [tasks, filters]);

  const minTime = rows.find((r) => r.due)?.due?.getTime() ?? Date.now();
  const maxTime =
    [...rows].reverse().find((r) => r.due)?.due?.getTime() ?? minTime + 1;
  const span = Math.max(maxTime - minTime, 1);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Task timeline</h3>
        {flash ? (
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            {flash}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Sorted by due date · snooze updates due + reminder
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {rows.map(({ task, due }) => {
          const left = due
            ? Math.min(92, Math.max(0, ((due.getTime() - minTime) / span) * 100))
            : 0;
          return (
            <li
              key={task.taskId}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {task.status} · {task.priority} · {task.assignedTo} · Due{" "}
                    {task.dueDate}
                    {task.reminderDate ? ` · Reminder ${task.reminderDate}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {SNOOZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => {
                        const updated = snoozeTask(task.taskId, opt.days);
                        if (updated) {
                          setTasks(listAllTasks());
                          setFlash(`Snoozed “${task.title}” by ${opt.label}`);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                    >
                      <Clock className="h-3 w-3" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative mt-3 h-2 rounded-full bg-muted">
                <div
                  className={cn(
                    "absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full",
                    task.overdue ? "bg-rose-500" : "bg-violet-600",
                  )}
                  style={{ left: `${left}%` }}
                  title={due ? due.toDateString() : "No due date"}
                />
              </div>
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            No tasks match the current filters
          </li>
        ) : null}
      </ul>
    </div>
  );
}
