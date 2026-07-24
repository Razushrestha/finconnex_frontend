"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  hrefForLeadActivity,
  listLeadActivityCandidates,
} from "@/lib/leads/activity-index";
import {
  formatSummaryDueLabel,
  formatRelativeTime,
} from "@/lib/leads/activity-dates";
import {
  pickActivitySummary,
  pickLastCompletedActivity,
  truncateActivityTitle,
  urgencyForCandidate,
} from "@/lib/leads/activity-summary";
import type { ActivityUrgency, LeadActivityCandidate } from "@/lib/leads/card-types";
import {
  URGENCY_TEXT,
  URGENCY_WORDS,
} from "@/lib/leads/a11y-urgency";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export type ActivityListMode = "summary" | "timeline";

interface LeadActivityListPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  mode: ActivityListMode;
  revision?: number;
}

const URGENCY_DOT: Record<ActivityUrgency, string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
};

const KIND_LABEL: Record<string, string> = {
  call: "Call",
  meeting: "Appointment",
  task: "Task",
  reminder: "Reminder",
  sms: "SMS",
  email: "Email",
  note: "Note",
  attachment: "Attachment",
};

export function LeadActivityListPanel({
  open,
  onOpenChange,
  leadName,
  mode,
  revision = 0,
}: LeadActivityListPanelProps) {
  const router = useRouter();
  const now = useMemo(() => {
    void open;
    void revision;
    void leadName;
    return new Date();
  }, [open, revision, leadName]);

  const { items, headline } = useMemo(() => {
    const candidates = listLeadActivityCandidates(leadName, now);
    if (mode === "summary") {
      const summary = pickActivitySummary(candidates, now);
      return {
        items: summary.sorted,
        headline: `Activity Summary · ${leadName}`,
      };
    }
    const completed = candidates
      .filter((c) => c.bucket === "completed" && c.dueAt)
      .sort((a, b) => (b.dueAt?.getTime() ?? 0) - (a.dueAt?.getTime() ?? 0));
    // Ensure last-activity primary is first if present
    const last = pickLastCompletedActivity(candidates, now);
    if (last && completed[0]?.id !== last.event.id) {
      const rest = completed.filter((c) => c.id !== last.event.id);
      return {
        items: [last.event, ...rest],
        headline: `Activity history · ${leadName}`,
      };
    }
    return {
      items: completed,
      headline: `Activity history · ${leadName}`,
    };
  }, [leadName, mode, now]);

  function openItem(c: LeadActivityCandidate) {
    const href = hrefForLeadActivity(c);
    if (href) {
      onOpenChange(false);
      router.push(href);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(80vh,560px)] max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md"
      >
        <DialogTitle className="sr-only">{headline}</DialogTitle>
        <DialogDescription className="sr-only">
          {mode === "summary"
            ? `Pending activities for ${leadName}, sorted by the same priority rules as the lead card.`
            : `Completed activity history for ${leadName}, newest first.`}
        </DialogDescription>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {mode === "summary" ? "Activity Summary" : "Activity history"}
            </h2>
            <p className="truncate text-xs text-slate-500">{leadName}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close activity panel"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-t border-slate-100" />

        <ul
          className="max-h-[min(60vh,420px)] overflow-y-auto px-2 py-2"
          aria-label={
            mode === "summary" ? "Pending activities" : "Completed activities"
          }
        >
          {items.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-slate-400">
              {mode === "summary"
                ? "Nothing pending for this lead."
                : "No completed activity yet."}
            </li>
          )}
          {items.map((c, index) => {
            const urgency =
              mode === "summary"
                ? urgencyForCandidate(c, now)
                : null;
            const dueLabel =
              mode === "summary"
                ? formatSummaryDueLabel(c.dueAt, {
                    now,
                    isMissed: c.isMissed,
                    isUnreplied: c.isUnreplied,
                  })
                : c.dueAt
                  ? formatRelativeTime(c.dueAt, now)
                  : "";
            const href = hrefForLeadActivity(c);
            const fullTitle = c.title;
            const urgencyWord = urgency ? URGENCY_WORDS[urgency] : null;

            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={!href}
                  onClick={() => openItem(c)}
                  title={fullTitle}
                  aria-current={
                    index === 0 && mode === "summary" ? "true" : undefined
                  }
                  aria-label={[
                    fullTitle,
                    KIND_LABEL[c.kind] ?? c.kind,
                    urgencyWord,
                    dueLabel,
                    index === 0 && mode === "summary" ? "Shown on card" : null,
                    href ? "Open in Activities" : "No deep link available",
                  ]
                    .filter(Boolean)
                    .join(". ")}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                    href
                      ? "hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      : "cursor-default opacity-90",
                    index === 0 && mode === "summary" && "bg-slate-50/80",
                  )}
                >
                  {urgency ? (
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        URGENCY_DOT[urgency],
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300"
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-800">
                      {truncateActivityTitle(fullTitle, 40)}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                      <span>{KIND_LABEL[c.kind] ?? c.kind}</span>
                      {dueLabel && (
                        <span
                          className={cn(
                            urgency && URGENCY_TEXT[urgency],
                            !urgency && "text-slate-400",
                          )}
                        >
                          {urgencyWord && (
                            <span className="sr-only">{urgencyWord}. </span>
                          )}
                          {dueLabel}
                        </span>
                      )}
                      {index === 0 && mode === "summary" && (
                        <span className="font-medium text-slate-600">
                          On card
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {mode === "summary" && items.length > 0 && (
          <p className="border-t border-slate-100 px-5 py-2.5 text-[10px] text-slate-400">
            Sorted with the same priority rules as the card. Click a row to open
            it in Activities.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
