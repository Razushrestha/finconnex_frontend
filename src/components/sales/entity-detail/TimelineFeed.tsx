"use client";

import { Download } from "lucide-react";
import type { TimelineFeedProps, TimelineItemData } from "./types";
import { cn, toneClasses } from "./shared";

function TimelineItem({ item }: { item: TimelineItemData }) {
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border",
          item.iconTone
            ? toneClasses(item.iconTone)
            : "bg-muted text-muted-foreground",
        )}
      >
        <item.icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {item.timestampLabel}
          </span>
        </div>

        {item.body && (
          <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
        )}

        {item.quote && (
          <blockquote className="mt-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm italic text-muted-foreground">
            {item.quote}
          </blockquote>
        )}

        {item.metaLine && (
          <p className="mt-1 text-xs text-muted-foreground">{item.metaLine}</p>
        )}

        <div className="mt-1.5 flex items-center gap-3">
          {item.attachment && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Download className="h-3 w-3" />
              {item.attachment.label}
            </span>
          )}
          {item.statusChip && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {item.statusChip}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Fully generic — items are pre-shaped by the page, whether sourced from a Lead or a Deal. */
export function TimelineFeed({
  items,
  onLoadMore,
  loadMoreLabel = "Load Historical Activity",
}: TimelineFeedProps) {
  return (
    <div>
      <div className="pt-1">
        {items.map((item) => (
          <TimelineItem key={item.id} item={item} />
        ))}
      </div>
      {onLoadMore && (
        <button
          onClick={onLoadMore}
          className="w-full rounded-lg border border-input bg-card py-2.5 text-sm font-medium text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {loadMoreLabel}
        </button>
      )}
    </div>
  );
}
