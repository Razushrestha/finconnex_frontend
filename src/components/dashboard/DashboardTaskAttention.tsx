"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ListChecks } from "lucide-react";
import {
  listCrmTasks,
  listOverdueCrmTasks,
  tryCrmTask,
} from "@/lib/tasks/api";
import type { Task } from "@/lib/tasks/types";
import { listTaskColumns } from "@/lib/tasks/store";
import { cn } from "@/lib/utils";

function demoOpenTasks(): Task[] {
  return listTaskColumns()
    .flatMap((c) => c.tasks)
    .filter((t) => t.status !== "Completed" && t.status !== "Cancelled")
    .slice(0, 8);
}

export function DashboardTaskAttention() {
  const [rows, setRows] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [all, overdue] = await Promise.all([
          listCrmTasks({ limit: 50 }),
          tryCrmTask(() => listOverdueCrmTasks()),
        ]);
        if (cancelled) return;
        const open = all.filter(
          (t) => t.status !== "Completed" && t.status !== "Cancelled",
        );
        const overdueIds = new Set((overdue ?? []).map((t) => t.taskId));
        const ranked = [
          ...open.filter((t) => t.overdue || overdueIds.has(t.taskId)),
          ...open.filter((t) => !t.overdue && !overdueIds.has(t.taskId)),
        ];
        setRows(ranked.slice(0, 6));
      } catch {
        if (cancelled) return;
        setRows(demoOpenTasks());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const overdueCount = rows.filter((t) => t.overdue).length;

  return (
    <section className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)]">
      <header className="flex items-center justify-between gap-2 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <ListChecks className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[13px] font-semibold leading-tight text-slate-900">
              Tasks
            </h2>
            <p className="text-[10px] text-slate-500">Needs attention today</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 ? (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              {overdueCount} overdue
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {loading ? "…" : `${rows.length} open`}
            </span>
          )}
          <Link
            href="/activities/tasks"
            className="text-slate-400 hover:text-violet-700"
            aria-label="Open tasks"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="flex-1 px-3 py-3">
        {loading && rows.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-slate-400">
            Loading tasks…
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-slate-400">
            No open tasks.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((task) => (
              <li
                key={task.taskId}
                className={cn(
                  "rounded-xl px-3 py-2.5",
                  task.overdue
                    ? "bg-rose-50/80 ring-1 ring-rose-100"
                    : "bg-slate-50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-[12px] font-semibold text-slate-800">
                    {task.title}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      task.overdue
                        ? "bg-rose-600 text-white"
                        : "bg-white text-slate-500 ring-1 ring-slate-200",
                    )}
                  >
                    {task.overdue ? "Overdue" : task.status}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700">
                    {initials(task.assignedTo)}
                  </span>
                  <p className="truncate text-[11px] text-slate-500">
                    {task.assignedTo}
                    {task.dueDate ? ` · ${task.dueDate}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
