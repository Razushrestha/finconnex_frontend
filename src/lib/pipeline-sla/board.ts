/**
 * Session 17 — Mortgage pipeline Kanban board helpers (Option B).
 * Columns are real mortgage stages; LeadStatus remains a bridge for CRM status.
 */

import type { KanbanColumn, LeadCardData, LeadStatus } from "@/lib/leads/types";
import type { MortgagePipelineStage } from "@/lib/pipeline-sla/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";
import { formatPipelineTimestamp } from "@/lib/pipeline-sla/ui";
import { fail, ok, type RuleResult } from "@/lib/rules/types";

export const FINAL_PIPELINE_STAGES = ["Closed Won"] as const;

/** Older Kanban titles → current pipeline stages. */
const PIPELINE_STAGE_ALIASES: Record<string, MortgagePipelineStage> = {
  "Waiting on Documents": "Waiting on Docs",
  "Documents Received": "Document Received",
  Processing: "Research & Servicing",
  Settled: "Closed Won",
  Lost: "Closed Lost",
};

export function resolvePipelineStage(
  value: string,
): MortgagePipelineStage | null {
  if ((MORTGAGE_PIPELINE_STAGES as readonly string[]).includes(value)) {
    return value as MortgagePipelineStage;
  }
  return PIPELINE_STAGE_ALIASES[value] ?? null;
}

/** Reverse of leadStatusToPipelineStage — CRM status from mortgage stage. */
export function pipelineStageToLeadStatus(
  stage: MortgagePipelineStage | string,
): LeadStatus {
  switch (stage) {
    case "New Lead":
    case "Appointment Booked":
    case "Appointment Missed":
      return "New";
    case "In Conversation":
    case "Hold":
    case "No Answer":
      return "Contacted";
    case "Waiting on Docs":
    case "Document Received":
    case "Findings":
    case "Research & Servicing":
    case "Servicing Completed":
    case "Loan Proposal Presented":
    case "Future Potential Clients":
      return "Qualified";
    case "Closed Won":
      return "Converted";
    case "Closed Lost":
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
  const resolved = resolvePipelineStage(stage) ?? stage;
  return (FINAL_PIPELINE_STAGES as readonly string[]).includes(resolved);
}

/** Closed Won is final (mirrors Converted). Closed Lost may still move. */
export function assertPipelineStageChange(
  from: string,
  to: string,
): RuleResult {
  if (from === to) return ok();
  const toStage = resolvePipelineStage(to);
  if (!toStage) {
    return fail(
      "PIPELINE_STAGE_UNKNOWN",
      `Unknown pipeline stage "${to}"`,
    );
  }
  if (isFinalPipelineStage(from) && from !== toStage) {
    return fail(
      "PIPELINE_STAGE_FINAL",
      'Pipeline stage "Closed Won" is final and cannot be changed',
    );
  }
  return ok();
}

export const PIPELINE_STAGE_DOT: Record<MortgagePipelineStage, string> = {
  "New Lead": "bg-sky-500",
  "Appointment Booked": "bg-cyan-500",
  "Appointment Missed": "bg-rose-400",
  "In Conversation": "bg-amber-400",
  Hold: "bg-slate-400",
  "No Answer": "bg-orange-400",
  "Waiting on Docs": "bg-orange-500",
  "Document Received": "bg-violet-500",
  Findings: "bg-fuchsia-500",
  "Research & Servicing": "bg-indigo-500",
  "Servicing Completed": "bg-blue-500",
  "Loan Proposal Presented": "bg-purple-500",
  "Future Potential Clients": "bg-teal-500",
  "Closed Won": "bg-emerald-500",
  "Closed Lost": "bg-slate-400",
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
    const stage = resolvePipelineStage(col.title);
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
