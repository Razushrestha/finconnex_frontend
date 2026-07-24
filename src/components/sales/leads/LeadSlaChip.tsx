"use client";

import { Clock, Crosshair } from "lucide-react";
import type { LeadSlaViewModel, SlaClockView } from "@/lib/pipeline-sla/types";
import {
  SLA_BADGE_PILL,
  SLA_BAND_WORDS,
  SLA_CLOCK_ICON,
  SLA_CLOCK_TEXT,
  formatSlaDueAt,
} from "@/lib/pipeline-sla/ui";
import { cn } from "@/lib/utils";

type LeadSlaChipProps = {
  sla: LeadSlaViewModel | null;
  className?: string;
  /** Compact list-row variant. */
  dense?: boolean;
  /**
   * `badge` — top-right pill only (PDF card header).
   * `panel` — Stage Due + Milestone rows (default card body).
   * `full` — badge + panel.
   */
  variant?: "badge" | "panel" | "full";
};

function hasClocks(sla: LeadSlaViewModel) {
  return Boolean(sla.stageClock || sla.milestoneClock);
}

function ClockRow({
  icon: Icon,
  clock,
  title,
}: {
  icon: typeof Clock;
  clock: SlaClockView;
  title: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-1.5 text-[10px]",
        SLA_CLOCK_TEXT[clock.band],
      )}
    >
      <Icon
        className={cn("mt-0.5 h-3 w-3 shrink-0", SLA_CLOCK_ICON[clock.band])}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-semibold">
          {title}
          {clock.durationLabel ? ` (${clock.durationLabel})` : ""} ·{" "}
          {clock.detail}
        </p>
        <p className="truncate opacity-80">
          Due {formatSlaDueAt(clock.dueAt)}
        </p>
      </div>
    </div>
  );
}

/**
 * Pipeline Stage / Milestone SLA — independent of Activity Summary urgency.
 * PDF: top-right badge + Stage Due (clock) + Milestone (target), each colored by its own band.
 */
export function LeadSlaChip({
  sla,
  className,
  dense,
  variant = "panel",
}: LeadSlaChipProps) {
  if (!sla || sla.badgeLabel === "No SLA") return null;
  if (!hasClocks(sla) && variant !== "badge") return null;

  if (variant === "badge" || (dense && variant !== "full")) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
          SLA_BADGE_PILL[sla.badgeBand],
          className,
        )}
        role="status"
        aria-label={[
          "Pipeline SLA",
          SLA_BAND_WORDS[sla.badgeBand],
          sla.badgeLabel,
        ].join(". ")}
        title={sla.badgeLabel}
      >
        {sla.badgeLabel}
      </span>
    );
  }

  const showBadge = variant === "full";
  const milestoneTitle = sla.milestoneClock
    ? `Milestone: ${sla.milestoneClock.targetStage ?? sla.milestoneClock.label.replace(/^→\s*/, "")}`
    : "";

  return (
    <div
      className={cn(
        "mb-2 space-y-1 rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5",
        className,
      )}
      role="status"
      aria-label={[
        "Pipeline SLA",
        SLA_BAND_WORDS[sla.badgeBand],
        sla.badgeLabel,
        sla.stage,
        sla.stageClock
          ? `Stage due ${sla.stageClock.detail}, Due ${formatSlaDueAt(sla.stageClock.dueAt)}`
          : null,
        sla.milestoneClock
          ? `${milestoneTitle}, ${sla.milestoneClock.detail}`
          : null,
      ]
        .filter(Boolean)
        .join(". ")}
    >
      {showBadge && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              SLA_BADGE_PILL[sla.badgeBand],
            )}
          >
            {sla.badgeLabel}
          </span>
          <span className="truncate text-[10px] font-medium text-slate-500">
            {sla.stage}
          </span>
        </div>
      )}

      {sla.stageClock && (
        <ClockRow icon={Clock} clock={sla.stageClock} title="Stage Due" />
      )}
      {sla.milestoneClock && (
        <ClockRow
          icon={Crosshair}
          clock={sla.milestoneClock}
          title={milestoneTitle}
        />
      )}
    </div>
  );
}
