"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import type { DetailHeaderAction } from "./types";
import { cn } from "@/lib/utils";
import { RecordTagsRow } from "@/components/shared/tags/RecordTags";

interface EntityDetailHeaderProps {
  avatarUrl?: string;
  avatarFallback: string;
  /** Tailwind bg/text classes for the fallback avatar, e.g. "bg-teal-50 text-teal-600". Defaults to indigo. */
  avatarClassName?: string;
  name: string;
  /** e.g. "Gabriel Bernard (Sample)" is `name`; "King (Sample)" is the related link. */
  relatedLabel?: string;
  onRelatedClick?: () => void;
  tags?: string[];
  relatedTo?: string;
  onTagsChange?: (tags: string[]) => void;
  actions?: DetailHeaderAction[];
  moreMenuItems?: {
    label: string;
    onClick?: () => void;
    destructive?: boolean;
  }[];
  onBack?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function EntityDetailHeader({
  avatarUrl,
  avatarFallback,
  avatarClassName,
  name,
  relatedLabel,
  onRelatedClick,
  tags = [],
  relatedTo,
  onTagsChange,
  actions = [],
  moreMenuItems = [],
  onBack,
  onPrev,
  onNext,
}: EntityDetailHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex items-start justify-between border-b border-slate-200/80 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              avatarClassName ?? "bg-indigo-100 text-indigo-600",
            )}
          >
            {avatarFallback}
          </div>
        )}

        <div>
          <div className="flex flex-wrap items-baseline gap-1.5">
            <h1 className="text-base font-semibold text-slate-900">{name}</h1>
            {relatedLabel && (
              <>
                <span className="text-slate-300">-</span>
                <button
                  type="button"
                  onClick={onRelatedClick}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  {relatedLabel}
                </button>
              </>
            )}
          </div>

          <div className="mt-1">
            <RecordTagsRow
              tags={tags}
              relatedTo={relatedTo}
              onChange={onTagsChange}
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              action.variant === "secondary"
                ? "border border-slate-200 text-slate-700 hover:bg-slate-50"
                : "bg-indigo-600 text-white hover:bg-indigo-700",
            )}
          >
            {action.label}
          </button>
        ))}

        {moreMenuItems.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More actions"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {moreOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                  {moreMenuItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        item.onClick?.();
                        setMoreOpen(false);
                      }}
                      className={cn(
                        "block w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-slate-50",
                        item.destructive ? "text-rose-600" : "text-slate-700",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {(onPrev || onNext) && (
          <div className="ml-1 flex items-center gap-0.5 border-l border-slate-200 pl-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev}
              aria-label="Previous record"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              aria-label="Next record"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
