"use client";

import {
  activityTypeIcon,
  activityTypeTone,
  useWorkspaceActivityTimeline,
} from "@/lib/activity-timeline";
import { cn } from "@/lib/utils";

export function WorkspaceActivityFeed() {
  const { rows, loading, error } = useWorkspaceActivityTimeline(
    { page: 1, limit: 8 },
    true,
  );

  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-slate-900">
          Workspace activity
        </h2>
        <span className="text-[11px] font-semibold text-violet-700">
          {loading ? "Loading…" : error ? "Unavailable" : "Live"}
        </span>
      </div>
      {loading && rows.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-slate-400">
          Loading activity…
        </p>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-slate-400">
          {error ?? "No recent workspace activity."}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {rows.slice(0, 8).map((row) => {
            const Icon = activityTypeIcon(row.activityType);
            return (
              <li key={row.id} className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    activityTypeTone(row.activityType),
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-slate-800">
                    {row.label}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {row.when}
                    {row.actorLabel ? ` · ${row.actorLabel}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
