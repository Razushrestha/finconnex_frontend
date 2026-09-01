"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ActivityTimelineRow = {
  id: string;
  title: string;
  meta: string;
  at: Date | null;
  overdue?: boolean;
  actions?: ReactNode;
};

export function ActivityTimelineView({
  title,
  hint,
  flash,
  rows,
  emptyLabel,
}: {
  title: string;
  hint?: string;
  flash?: string | null;
  rows: ActivityTimelineRow[];
  emptyLabel: string;
}) {
  const sorted = [...rows].sort((a, b) => {
    if (!a.at && !b.at) return 0;
    if (!a.at) return 1;
    if (!b.at) return -1;
    return a.at.getTime() - b.at.getTime();
  });
  const minTime = sorted.find((row) => row.at)?.at?.getTime() ?? Date.now();
  const maxTime =
    [...sorted].reverse().find((row) => row.at)?.at?.getTime() ?? minTime + 1;
  const span = Math.max(maxTime - minTime, 1);

  return (
    <div className="h-full overflow-auto rounded-xl border border-border bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {flash ? (
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            {flash}
          </span>
        ) : hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>

      <ul className="space-y-3">
        {sorted.map((row) => {
          const left = row.at
            ? Math.min(
                92,
                Math.max(0, ((row.at.getTime() - minTime) / span) * 100),
              )
            : 0;
          return (
            <li
              key={row.id}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {row.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.meta}
                  </p>
                </div>
                {row.actions ? (
                  <div className="flex items-center gap-1">{row.actions}</div>
                ) : null}
              </div>
              <div className="relative mt-3 h-2 rounded-full bg-muted">
                <div
                  className={cn(
                    "absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full",
                    row.overdue ? "bg-rose-500" : "bg-[#5A32A3]",
                  )}
                  style={{ left: `${left}%` }}
                  title={row.at ? row.at.toDateString() : "No date"}
                />
              </div>
            </li>
          );
        })}
        {sorted.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
