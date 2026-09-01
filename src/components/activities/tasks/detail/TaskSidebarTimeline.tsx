"use client";

import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { listTaskTimeline } from "@/lib/tasks/timeline";
import type { Task } from "@/lib/tasks/types";

export function TaskSidebarTimeline({ task }: { task: Task }) {
  const events = listTaskTimeline(task).slice(0, 3);
  const href = `/activities/tasks/detail/${encodeURIComponent(task.taskId)}/timeline`;

  return (
    <section className="py-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Timeline
        </h2>
        <Link
          href={href}
          className="text-[11px] font-medium text-[#5A32A3] hover:underline"
        >
          View all
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-2xl font-light leading-none text-slate-300">—</p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-800">
                {event.headline}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {event.actor} · {event.atLabel}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5A32A3] hover:underline"
      >
        <History className="h-3.5 w-3.5" />
        Open full timeline
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
