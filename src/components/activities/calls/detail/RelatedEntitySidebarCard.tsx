"use client";

import { Building2 } from "lucide-react";

interface RelatedEntityProps {
  relatedTo?: string;
}

export function RelatedEntitySidebarCard({ relatedTo }: RelatedEntityProps) {
  if (!relatedTo) return null;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h4 className="mb-3 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        Related Item
      </h4>
      <div className="flex items-center gap-3 rounded-xl bg-accent/50 border border-border p-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="truncate text-xs font-bold text-foreground">
            {relatedTo}
          </h5>
        </div>
      </div>
    </div>
  );
}
