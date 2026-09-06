"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface DeliverablesProgressProps {
  progress?: {
    completedCount?: string;
    statusText?: string;
    percentage?: number;
  };
}

export function DeliverablesProgressCard({
  progress,
}: DeliverablesProgressProps) {
  const percentage = progress?.percentage ?? 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Deliverables Schedule Completion
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {progress?.completedCount || "0 of 0 Milestones Delivered"} •{" "}
            {progress?.statusText || "Pending schedule definition"}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 self-start sm:self-auto">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {percentage}% Overall
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-primary h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
