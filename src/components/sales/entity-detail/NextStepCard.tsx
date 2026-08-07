"use client";

import { Clock, Pencil, Target } from "lucide-react";
import type { NextStepCardProps } from "./types";

export function NextStepCard({
  eyebrow = "Next Step",
  title,
  dueLabel,
  dueTime,
  onComplete,
  onEdit,
}: NextStepCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Target className="h-3.5 w-3.5 text-primary" />
        {eyebrow}
      </div>
      <p className="mt-1.5 text-sm font-semibold tracking-tight text-foreground">
        {title}
      </p>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>{dueLabel}</span>
        {dueTime && <span>· {dueTime}</span>}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onComplete}
          className="flex-1 rounded-lg bg-primary py-1.5 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Complete
        </button>
        {onEdit && (
          <button
            onClick={onEdit}
            aria-label="Edit next step"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
