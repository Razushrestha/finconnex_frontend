"use client";

import { Clock, Pencil, Target } from "lucide-react";
import type { NextStepCardProps } from "./types";
import { Panel } from "./shared";

export function NextStepCard({
  eyebrow = "Next Step",
  title,
  dueLabel,
  dueTime,
  onComplete,
  onEdit,
}: NextStepCardProps) {
  return (
    <Panel className="border-violet-100 bg-violet-50/40">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-violet-700 uppercase">
        <Target className="h-3.5 w-3.5" />
        {eyebrow}
      </div>

      <p className="mt-2 text-[14px] font-semibold leading-snug text-slate-900">
        {title}
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-500">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>
          {dueLabel}
          {dueTime ? ` · ${dueTime}` : ""}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onComplete}
          className="h-10 flex-1 rounded-xl bg-violet-600 text-[13px] font-semibold text-white shadow-sm shadow-violet-600/15 transition-colors hover:bg-violet-700"
        >
          Complete
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit next step"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-violet-200 hover:text-violet-700"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </Panel>
  );
}
