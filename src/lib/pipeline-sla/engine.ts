/**
 * Pure Stage + Milestone SLA ranking (Session 16).
 */

import { startOfDay } from "@/lib/leads/activity-dates";
import type { LeadStatus } from "@/lib/leads/types";
import type {
  LeadSlaViewModel,
  MortgagePipelineStage,
  PipelineSlaConfig,
  SlaBand,
  SlaClockView,
  SlaDuration,
} from "@/lib/pipeline-sla/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";

const STAGE_INDEX = new Map(
  MORTGAGE_PIPELINE_STAGES.map((s, i) => [s, i] as const),
);

export function durationToMs(d: SlaDuration): number {
  const n = Math.max(0, d.amount);
  if (d.unit === "minutes") return n * 60_000;
  if (d.unit === "hours") return n * 3_600_000;
  return n * 86_400_000;
}

export function addDuration(from: Date, d: SlaDuration): Date {
  return new Date(from.getTime() + durationToMs(d));
}

export function formatSlaDuration(d: SlaDuration): string {
  const u =
    d.unit === "minutes" ? (d.amount === 1 ? "Minute" : "Minutes") : d.unit === "hours" ? (d.amount === 1 ? "Hour" : "Hours") : d.amount === 1 ? "Day" : "Days";
  return `${d.amount} ${u}`;
}

/** Map Kanban LeadStatus → mortgage SLA stage (Option A bridge). */
export function leadStatusToPipelineStage(
  status: LeadStatus,
): MortgagePipelineStage {
  switch (status) {
    case "New":
      return "New Lead";
    case "Contacted":
      return "In Conversation";
    case "Qualified":
      return "Waiting on Documents";
    case "Unqualified":
      return "Lost";
    case "Converted":
      return "Settled";
    default:
      return "New Lead";
  }
}

export function stageReachedOrPassed(
  current: MortgagePipelineStage,
  target: MortgagePipelineStage,
): boolean {
  const a = STAGE_INDEX.get(current) ?? 0;
  const b = STAGE_INDEX.get(target) ?? 0;
  // Lost never "reaches" forward milestones
  if (current === "Lost") return false;
  return a >= b;
}

/**
 * PDF legend bands:
 * - Sub-day SLAs (minutes/hours): On Track until the clock expires (e.g. New Lead 15 mins left).
 * - Day SLAs: Due Today = due calendar day; At Risk = due tomorrow; else On Track.
 */
export function bandForDue(
  dueAt: Date,
  now: Date,
  duration?: SlaDuration | null,
): SlaBand {
  if (dueAt.getTime() < now.getTime()) return "overdue";
  if (duration?.unit === "minutes" || duration?.unit === "hours") {
    return "on_track";
  }
  const dueDay = startOfDay(dueAt).getTime();
  const today = startOfDay(now).getTime();
  const day = 86_400_000;
  if (dueDay === today) return "due_today";
  if (dueDay === today + day) return "at_risk";
  return "on_track";
}

export function formatRemainingDetail(dueAt: Date, now: Date): string {
  const ms = dueAt.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  // PDF lead cards: "2 days overdue" / "1 day overdue"
  if (ms < 0) {
    if (days >= 1) return `${days} day${days === 1 ? "" : "s"} overdue`;
    if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} overdue`;
    return `${Math.max(1, minutes)} min overdue`;
  }
  if (days >= 2) return `${days} days left`;
  if (days === 1 || hours >= 20) return "1 day left";
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} left`;
  return `${Math.max(1, minutes)} mins left`;
}

const BAND_RANK: Record<SlaBand, number> = {
  on_track: 0,
  at_risk: 1,
  due_today: 2,
  overdue: 3,
};

export function worseBand(a: SlaBand, b: SlaBand): SlaBand {
  return BAND_RANK[a] >= BAND_RANK[b] ? a : b;
}

export function badgeLabelFor(
  badgeBand: SlaBand,
  milestoneOverdue: boolean,
): string {
  if (badgeBand === "overdue") {
    return milestoneOverdue ? "Milestone Overdue" : "Overdue";
  }
  if (badgeBand === "due_today") return "Due Today";
  if (badgeBand === "at_risk") return "At Risk";
  return "On Track";
}

export type ComputeLeadSlaInput = {
  stage: MortgagePipelineStage;
  /** When the lead entered the current stage. */
  stageEnteredAt: Date;
  /** When the lead entered the pipeline (milestone start). Defaults to stageEnteredAt if first stage. */
  pipelineStartedAt: Date;
  config: PipelineSlaConfig;
  now?: Date;
};

export function computeLeadSla(input: ComputeLeadSlaInput): LeadSlaViewModel {
  const now = input.now ?? new Date();
  const { stage, config } = input;

  if (stage === "Lost") {
    return {
      stage,
      badgeBand: "on_track",
      badgeLabel: "No SLA",
      stageClock: null,
      milestoneClock: null,
      milestones: [],
    };
  }

  const stageRow = config.stageSlas.find((r) => r.stage === stage);
  let stageClock: SlaClockView | null = null;
  if (stageRow?.duration) {
    const dueAt = addDuration(input.stageEnteredAt, stageRow.duration);
    const band = bandForDue(dueAt, now, stageRow.duration);
    stageClock = {
      kind: "stage",
      label: "Stage Due",
      band,
      detail: formatRemainingDetail(dueAt, now),
      dueAt,
      durationLabel: formatSlaDuration(stageRow.duration),
    };
  }

  const milestones: SlaClockView[] = [];
  for (const ms of config.milestones) {
    if (stageReachedOrPassed(stage, ms.targetStage)) continue;
    // Only milestones whose start has been reached
    if (!stageReachedOrPassed(stage, ms.startStage) && stage !== ms.startStage) {
      const startIdx = STAGE_INDEX.get(ms.startStage) ?? 0;
      const curIdx = STAGE_INDEX.get(stage) ?? 0;
      if (curIdx < startIdx) continue;
    }
    const dueAt = addDuration(input.pipelineStartedAt, ms.duration);
    const band = bandForDue(dueAt, now, ms.duration);
    milestones.push({
      kind: "milestone",
      label: `→ ${ms.targetStage}`,
      band,
      detail: formatRemainingDetail(dueAt, now),
      dueAt,
      durationLabel: formatSlaDuration(ms.duration),
      targetStage: ms.targetStage,
    });
  }

  // Prefer worst overdue, else soonest due
  milestones.sort((a, b) => {
    const bandDiff = BAND_RANK[b.band] - BAND_RANK[a.band];
    if (bandDiff !== 0) return bandDiff;
    return a.dueAt.getTime() - b.dueAt.getTime();
  });

  const milestoneClock = milestones[0] ?? null;

  let badgeBand: SlaBand = "on_track";
  if (stageClock) badgeBand = worseBand(badgeBand, stageClock.band);
  if (milestoneClock) badgeBand = worseBand(badgeBand, milestoneClock.band);

  const milestoneOnlyOverdue =
    milestoneClock?.band === "overdue" && stageClock?.band !== "overdue";

  return {
    stage,
    badgeBand,
    badgeLabel: badgeLabelFor(badgeBand, Boolean(milestoneOnlyOverdue)),
    stageClock,
    milestoneClock,
    milestones,
  };
}
