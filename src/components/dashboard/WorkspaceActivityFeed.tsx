"use client";

import { Activity } from "lucide-react";
import {
  activityTypeIcon,
  activityTypeTone,
  useWorkspaceActivityTimeline,
} from "@/lib/activity-timeline";
import { cn } from "@/lib/utils";

function authError(message: string | null): boolean {
  if (!message) return false;
  const n = message.toLowerCase();
  return (
    n.includes("access token") ||
    n.includes("unauthorized") ||
    n.includes("unauthorised") ||
    n.includes("401")
  );
}

export function WorkspaceActivityFeed() {
  const { rows, loading, error } = useWorkspaceActivityTimeline(
    { page: 1, limit: 8 },
    true,
  );
  const shown = rows.slice(0, 6);

  return (
    <section className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)]">
      <header className="flex items-center justify-between gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[13px] font-semibold leading-tight">Activity</h2>
            <p className="text-[10px] text-violet-100">Latest workspace events</p>
          </div>
        </div>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
          {loading ? "…" : shown.length}
        </span>
      </header>

      <div className="flex-1 px-4 py-3">
        {loading && shown.length === 0 ? (
          <EmptyHint title="Loading activity" detail="Fetching the latest timeline." />
        ) : shown.length === 0 ? (
          <EmptyHint
            title={
              authError(error)
                ? "Sign in to see activity"
                : error
                  ? "Activity unavailable"
                  : "Nothing new yet"
            }
            detail="Calls, emails, and notes will appear here."
          />
        ) : (
          <ol className="relative space-y-0 pl-3">
            <span className="absolute bottom-2 left-[15px] top-2 w-px bg-violet-100" />
            {shown.map((row) => {
              const Icon = activityTypeIcon(row.activityType);
              return (
                <li key={row.id} className="relative flex gap-3 py-2">
                  <span
                    className={cn(
                      "relative z-[1] flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                      activityTypeTone(row.activityType),
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="truncate text-[12px] font-semibold text-slate-800">
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
          </ol>
        )}
      </div>
    </section>
  );
}

function EmptyHint({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-1.5 text-center">
      <p className="text-[13px] font-medium text-slate-600">{title}</p>
      <p className="max-w-[200px] text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}
