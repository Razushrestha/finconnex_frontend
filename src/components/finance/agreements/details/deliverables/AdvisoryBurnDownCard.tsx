"use client";

import React from "react";
import { Hourglass } from "lucide-react";

interface AdvisoryBurnDownProps {
  burnDown?: {
    cycleName?: string;
    usedHours?: string;
    totalHours?: string;
    percentage?: number;
    remainingText?: string;
    breakdown?: Array<{ label: string; hours: string; colorClass?: string }>;
    policyNote?: string;
  };
}

export function AdvisoryBurnDownCard({ burnDown }: AdvisoryBurnDownProps) {
  const percentage = burnDown?.percentage ?? 0;
  const breakdown = burnDown?.breakdown || [];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Hourglass className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Monthly Advisory Hours Burn-Down
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-muted text-muted-foreground">
          {burnDown?.cycleName || "No Active Cycle"}
        </span>
      </div>

      {/* Main Metric Counter */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-1.5">
          <h4 className="text-2xl font-extrabold text-foreground tracking-tight">
            {burnDown?.usedHours || "0.0"} / {burnDown?.totalHours || "0.0"}
          </h4>
          <span className="text-xs text-muted-foreground font-medium">
            hours
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {percentage}% capacity utilized •{" "}
          {burnDown?.remainingText || "0.0 hours remaining"}
        </p>
      </div>

      {/* Capacity Bar */}
      <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Category Breakdown */}
      <div className="space-y-2 pt-1">
        {breakdown.length > 0 ? (
          breakdown.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted-foreground flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${item.colorClass || "bg-primary"}`}
                />
                {item.label}
              </span>
              <span className="font-bold text-foreground">{item.hours}</span>
            </div>
          ))
        ) : (
          <div className="text-[11px] text-muted-foreground italic text-center py-2">
            No advisory category breakdown logged yet.
          </div>
        )}
      </div>

      {/* Policy Note Footer */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border text-[11px] text-muted-foreground leading-relaxed">
        {burnDown?.policyNote ||
          "Retainer hours reset on the 1st of every calendar month. Unused hours do not roll over."}
      </div>
    </div>
  );
}
