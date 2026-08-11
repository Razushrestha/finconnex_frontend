"use client";

import { ExternalLink, Sparkles } from "lucide-react";

export function TaskSidebarContext() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Context
      </h2>
      <div className="rounded-xl border border-border bg-muted/30 p-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            Acme Corp - Q4 Renewal
          </span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI Suggestion</span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Best time to contact Acme Corp stakeholders is tomorrow between 10:00
          AM - 11:30 AM EST.
        </p>
      </div>
    </div>
  );
}
