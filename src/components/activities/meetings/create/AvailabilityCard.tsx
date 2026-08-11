"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

export const AvailabilityCard: React.FC = () => {
  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Availability
        </h3>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            className="p-1 hover:bg-accent rounded text-muted-foreground"
          >
            ‹
          </button>
          <button
            type="button"
            className="p-1 hover:bg-accent rounded text-muted-foreground"
          >
            ›
          </button>
        </div>
      </div>

      <div className="text-center pb-2 border-b border-border">
        <p className="text-sm font-semibold text-foreground">
          Thursday, Oct 24
        </p>
      </div>

      {/* Timeline simulation */}
      <div className="space-y-2 text-xs font-mono">
        <div className="flex items-center space-x-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <span className="w-12 text-[10px] text-muted-foreground">09:00</span>
          <span className="font-sans font-medium">Internal Sync (Busy)</span>
        </div>

        <div className="flex items-center space-x-2 p-2.5 bg-primary/10 border border-primary/30 rounded-lg text-primary">
          <span className="w-12 text-[10px] text-primary/70">10:00</span>
          <div className="font-sans">
            <p className="font-semibold">Selected Slot</p>
            <p className="text-[10px] opacity-80">10:00 - 10:45 AM</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="font-medium">
          All participants are free at this time.
        </span>
      </div>
    </div>
  );
};
