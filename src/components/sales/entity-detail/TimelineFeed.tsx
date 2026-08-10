"use client";

import { Download } from "lucide-react";
import type { TimelineFeedProps, TimelineItemData } from "./types";
import { Panel, cn, toneClasses } from "./shared";

function TimelineItem({
  item,
  isLast,
}: {
  item: TimelineItemData;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {!isLast && (
        <span
          className="absolute top-8 left-[15px] bottom-0 w-px bg-slate-200"
          aria-hidden
        />
      )}

      <div
        className={cn(
          "relative z-[1] mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm",
          item.iconTone
            ? toneClasses(item.iconTone)
            : "text-slate-500",
        )}
      >
        <item.icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-semibold text-slate-900">{item.title}</p>
          <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
            {item.timestampLabel}
          </span>
        </div>

        {item.body && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
            {item.body}
          </p>
        )}

        {item.quote && (
          <blockquote className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] italic leading-relaxed text-slate-600">
            {item.quote}
          </blockquote>
        )}

        {item.metaLine && (
          <p className="mt-1.5 text-[11px] text-slate-400">{item.metaLine}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {item.attachment && (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <Download className="h-3 w-3" />
              {item.attachment.label}
            </span>
          )}
          {item.statusChip && (
            <span className="text-[11px] font-semibold text-emerald-600">
              {item.statusChip}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TimelineFeed({
  items,
  onLoadMore,
  loadMoreLabel = "Load Historical Activity",
}: TimelineFeedProps) {
  return (
    <Panel>
      {items.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-slate-400">
          No activity in this tab yet.
        </p>
      ) : (
        <div className="pt-1">
          {items.map((item, i) => (
            <TimelineItem
              key={item.id}
              item={item}
              isLast={i === items.length - 1}
            />
          ))}
        </div>
      )}

      {onLoadMore && items.length > 0 && (
        <button
          type="button"
          onClick={onLoadMore}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900"
        >
          {loadMoreLabel}
        </button>
      )}
    </Panel>
  );
}
