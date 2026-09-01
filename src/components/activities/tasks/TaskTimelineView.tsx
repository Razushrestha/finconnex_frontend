"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { listAllTasks, snoozeTask } from "@/lib/tasks/store";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import { taskMatchesFilters, taskMatchesSearch } from "@/lib/tasks/search";
import type { Task, TaskFilters } from "@/lib/tasks/types";
import { onRulesChange } from "@/lib/rules";
import { ActivityTimelineView } from "@/components/activities/ActivityTimelineView";

function filterTasks(tasks: Task[], filters: TaskFilters, search = "") {
  return tasks.filter(
    (t) => taskMatchesFilters(t, filters) && taskMatchesSearch(t, search),
  );
}

const SNOOZE_OPTIONS = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "1 week" },
];

export function TaskTimelineView({
  filters,
  search = "",
}: {
  filters: TaskFilters;
  search?: string;
}) {
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

  const rows = useMemo(
    () =>
      filterTasks(tasks, filters, search).map((task) => ({
        id: task.taskId,
        title: task.title,
        meta: `${task.status} · ${task.priority} · ${task.assignedTo} · Due ${task.dueDate}${
          task.reminderDate ? ` · Reminder ${task.reminderDate}` : ""
        }`,
        at: parseTaskDueDate(task.dueDate),
        overdue: task.overdue,
        actions: (
          <>
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
          </>
        ),
      })),
    [tasks, filters, search],
  );

  return (
    <ActivityTimelineView
      title="Task timeline"
      hint="Sorted by due date · snooze updates due + reminder"
      flash={flash}
      rows={rows}
      emptyLabel="No tasks match the current filters"
    />
  );
}
