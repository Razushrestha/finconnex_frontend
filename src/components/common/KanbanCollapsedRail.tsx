"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { KANBAN_HEADER_COUNT, KANBAN_HEADER_RAIL } from "@/lib/layout";

export function KanbanCollapsedRail({
  title,
  count,
  onExpand,
  extra,
}: {
  title: string;
  count: number;
  onExpand: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="mb-4 flex h-full w-10 shrink-0 flex-col rounded-sm">
      <div
        className={cn(
          "flex h-full flex-col items-center gap-3 p-2",
          KANBAN_HEADER_RAIL,
        )}
      >
        <span className={KANBAN_HEADER_COUNT}>{count}</span>
        <span
          className="mt-1 [writing-mode:vertical-rl] text-sm font-semibold text-slate-900"
          title={title}
        >
          {title}
        </span>
        {extra}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onExpand}
          className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm hover:bg-white hover:text-slate-900"
          title="Expand"
          aria-expanded={false}
          aria-label={`Expand ${title}`}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
