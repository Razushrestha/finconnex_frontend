/**
 * Session 17 — Mortgage pipeline Kanban board helpers (Option B).
 * Columns are real mortgage stages; LeadStatus remains a bridge for CRM status.
 */

import type { KanbanColumn, LeadCardData, LeadStatus } from "@/lib/leads/types";
import type { MortgagePipelineStage } from "@/lib/pipeline-sla/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";
import { formatPipelineTimestamp } from "@/lib/pipeline-sla/ui";
import { fail, ok, type RuleResult } from "@/lib/rules/types";

export const FINAL_PIPELINE_STAGES = ["Settled"] as const;

/** Reverse of leadStatusToPipelineStage — CRM status from mortgage stage. */
export function pipelineStageToLeadStatus(
  stage: MortgagePipelineStage | string,
): LeadStatus {
  switch (stage) {
    case "New Lead":
    case "Appointment Booked":
      return "New";
    case "In Conversation":
      return "Contacted";
    case "Waiting on Documents":
    case "Documents Received":
    case "Processing":
      return "Qualified";
    case "Settled":
      return "Converted";
    case "Lost":
      return "Unqualified";
    default:
      return "New";
  }
}

export function isMortgagePipelineStage(
  value: string,
): value is MortgagePipelineStage {
  return (MORTGAGE_PIPELINE_STAGES as readonly string[]).includes(value);
}

export function isFinalPipelineStage(stage: string) {
  return (FINAL_PIPELINE_STAGES as readonly string[]).includes(stage);
}

/** Settled is final (mirrors Converted). Lost may still move. */
export function assertPipelineStageChange(
  from: string,
  to: string,
): RuleResult {
  if (from === to) return ok();
  if (!isMortgagePipelineStage(to)) {
    return fail(
      "PIPELINE_STAGE_UNKNOWN",
      `Unknown pipeline stage "${to}"`,
    );
  }
  if (isFinalPipelineStage(from) && from !== to) {
    return fail(
      "PIPELINE_STAGE_FINAL",
      'Pipeline stage "Settled" is final and cannot be changed',
    );
  }
  return ok();
}

export const PIPELINE_STAGE_DOT: Record<MortgagePipelineStage, string> = {
  "New Lead": "bg-sky-500",
  "Appointment Booked": "bg-cyan-500",
  "In Conversation": "bg-amber-400",
  "Waiting on Documents": "bg-orange-500",
  "Documents Received": "bg-violet-500",
  Processing: "bg-indigo-500",
  Settled: "bg-emerald-500",
  Lost: "bg-slate-400",
};

export function stageColumnId(stage: MortgagePipelineStage): string {
  return stage
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Apply a stage move for SLA clocks.
 * Entering New Lead restarts the pipeline (milestone start).
 */
export function applyPipelineStageMove(
  card: LeadCardData,
  toStage: MortgagePipelineStage,
  now = new Date(),
): LeadCardData {
  const enteredAt = formatPipelineTimestamp(now);
  const restartPipeline = toStage === "New Lead";
  return {
    ...card,
    pipelineStage: toStage,
    stageEnteredAt: enteredAt,
    pipelineStartedAt: restartPipeline
      ? enteredAt
      : card.pipelineStartedAt ?? card.stageEnteredAt ?? card.createdDate,
    accentColorClass: PIPELINE_STAGE_DOT[toStage],
  };
}

/** Guarantee PDF stage order, leadStatus bridge, and card.pipelineStage sync. */
export function normalizeMortgageBoard(
  cols: KanbanColumn[],
): KanbanColumn[] {
  const byStage = new Map<string, KanbanColumn>();
  for (const col of cols) {
    const stage = isMortgagePipelineStage(col.title)
      ? col.title
      : null;
    if (!stage) continue;
    const existing = byStage.get(stage);
    const cards = [
      ...(existing?.cards ?? []),
      ...col.cards.map((c) => ({
        ...c,
        pipelineStage: stage,
      })),
    ];
    byStage.set(stage, {
      id: stageColumnId(stage),
      title: stage,
      leadStatus: pipelineStageToLeadStatus(stage),
      dotColorClass: PIPELINE_STAGE_DOT[stage],
      leadCount: cards.length,
      totalAmount: col.totalAmount || existing?.totalAmount || "$0",
      cards,
    });
  }

  return MORTGAGE_PIPELINE_STAGES.map((stage) => {
    const hit = byStage.get(stage);
    if (hit) {
      return { ...hit, leadCount: hit.cards.length };
    }
    return {
      id: stageColumnId(stage),
      title: stage,
      leadStatus: pipelineStageToLeadStatus(stage),
      dotColorClass: PIPELINE_STAGE_DOT[stage],
      leadCount: 0,
      totalAmount: "$0",
      cards: [],
    };
  });
}
