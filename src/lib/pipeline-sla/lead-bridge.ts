import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import type { LeadCardData, LeadStatus } from "@/lib/leads/types";
import {
  computeLeadSla,
  leadStatusToPipelineStage,
} from "@/lib/pipeline-sla/engine";
import { loadPipelineSlaConfig } from "@/lib/pipeline-sla/settings";
import type {
  LeadSlaViewModel,
  MortgagePipelineStage,
} from "@/lib/pipeline-sla/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";

function asStage(raw?: string): MortgagePipelineStage | null {
  if (!raw) return null;
  return (MORTGAGE_PIPELINE_STAGES as readonly string[]).includes(raw)
    ? (raw as MortgagePipelineStage)
    : null;
}

/** Resolve SLA view for a Kanban card. */
export function computeSlaForLeadCard(
  card: LeadCardData,
  status: LeadStatus,
  now = new Date(),
): LeadSlaViewModel {
  const stage =
    asStage(card.pipelineStage) ?? leadStatusToPipelineStage(status);

  const stageEnteredAt =
    parseFlexibleDate(card.stageEnteredAt) ??
    parseFlexibleDate(card.createdDate) ??
    now;

  const pipelineStartedAt =
    parseFlexibleDate(card.pipelineStartedAt) ??
    parseFlexibleDate(card.createdDate) ??
    stageEnteredAt;

  return computeLeadSla({
    stage,
    stageEnteredAt,
    pipelineStartedAt,
    config: loadPipelineSlaConfig(),
    now,
  });
}
