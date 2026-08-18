"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  findTaskById,
  listAllTasks,
  updateTaskDueDate,
} from "@/lib/tasks/store";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import { taskMatchesSearch } from "@/lib/tasks/search";
import type { Task, TaskFilters } from "@/lib/tasks/types";
import { onRulesChange } from "@/lib/rules";
import { cn } from "@/lib/utils";

function filterTasks(tasks: Task[], filters: TaskFilters, search = "") {
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
    return taskMatchesSearch(t, search);
  });
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function TaskCalendarView({
  filters,
  search = "",
}: {
  filters: TaskFilters;
  search?: string;
}) {
  const [tasks, setTasks] = useState(() => listAllTasks());
  const [cursor, setCursor] = useState(() => new Date(2026, 6, 1));
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

  useEffect(() => {
    return onRulesChange(() => setTasks(listAllTasks()));
  }, []);

  const filtered = useMemo(
    () => filterTasks(tasks, filters, search),
    [tasks, filters, search],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of filtered) {
      const due = parseTaskDueDate(t.dueDate);
      if (!due) continue;
      if (
        due.getMonth() !== cursor.getMonth() ||
        due.getFullYear() !== cursor.getFullYear()
      ) {
        continue;
      }
      const key = due.toDateString();
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [filtered, cursor]);

  const first = startOfMonth(cursor);
  const totalDays = daysInMonth(cursor);
  const startPad = first.getDay(); // 0 Sun
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  }

  const today = new Date();
  const title = cursor.toLocaleString("en-AU", {
    month: "long",
    year: "numeric",
  });

  function handleDropOnDay(day: Date) {
    if (!draggedTaskId) return;

    const found = findTaskById(draggedTaskId);
    if (!found) {
      setDraggedTaskId(null);
      setDropTargetKey(null);
      return;
    }

    const currentDue = parseTaskDueDate(found.task.dueDate);
    if (currentDue && sameDay(currentDue, day)) {
      setDraggedTaskId(null);
      setDropTargetKey(null);
      return;
    }

    updateTaskDueDate(draggedTaskId, day);
    setDraggedTaskId(null);
    setDropTargetKey(null);
  }

  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`pad-${idx}`} className="min-h-24 rounded-md" />;
          }
          const dayKey = day.toDateString();
          const items = byDay.get(dayKey) ?? [];
          const isDropTarget = dropTargetKey === dayKey && draggedTaskId !== null;

          return (
            <div
              key={day.toISOString()}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropTargetKey(dayKey);
              }}
              onDragLeave={() => {
                setDropTargetKey((current) =>
                  current === dayKey ? null : current,
                );
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnDay(day);
              }}
              className={cn(
                "min-h-24 rounded-md border border-border bg-background p-1.5 text-left transition-colors",
                sameDay(day, today) && "ring-1 ring-violet-300",
                isDropTarget && "border-violet-400 bg-violet-50/70 ring-1 ring-violet-300",
              )}
            >
              <div className="text-[11px] font-semibold text-foreground">
                {day.getDate()}
              </div>
              <ul className="mt-1 space-y-0.5">
                {items.slice(0, 3).map((t) => (
                  <li
                    key={t.taskId}
                    draggable
                    onDragStart={(e) => {
                      setDraggedTaskId(t.taskId);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      setDropTargetKey(null);
                    }}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] cursor-grab active:cursor-grabbing",
                      draggedTaskId === t.taskId && "opacity-50",
                      t.overdue
                        ? "bg-rose-50 text-rose-800"
                        : "bg-violet-50 text-violet-800",
                    )}
                    title={`${t.title} — drag to reschedule`}
                  >
                    {t.title}
                  </li>
                ))}
                {items.length > 3 ? (
                  <li className="text-[10px] text-muted-foreground">
                    +{items.length - 3} more
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
