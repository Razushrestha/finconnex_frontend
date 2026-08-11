"use client";

import { Clock, Send } from "lucide-react";

export function TaskSidebarTimeline() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Timeline
      </h2>

      <div className="space-y-4 relative before:absolute before:bottom-2 before:top-2 before:left-3.5 before:w-px before:bg-border">
        <div className="flex gap-3 relative">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary z-10">
            AS
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-foreground">
              Alex Sterling{" "}
              <span className="text-[10px] font-normal text-muted-foreground">
                2h ago
              </span>
            </p>
            <div className="mt-1 rounded-xl border border-border bg-muted/30 p-2.5 text-xs text-foreground">
              I&apos;ve attached the initial draft of the metrics. Still waiting
              on the APAC numbers from Sarah.
            </div>
          </div>
        </div>

        <div className="flex gap-3 relative">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] text-secondary-foreground z-10">
            <Clock className="h-3 w-3" />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">
                Status changed
              </span>{" "}
              to In Progress
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <div className="relative">
          <input
            type="text"
            placeholder="Type @ to mention..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring pr-8"
          />
          <button
            type="button"
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
