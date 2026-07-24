/**
 * Phase 16 / Session 16 — Pipeline Stage + Milestone SLA.
 */

export const PHASE_16_ID = "lead-card-phase-16";
export const PHASE_16_TITLE = "Pipeline Stage + Milestone SLA";
export const SESSION_16_ID = "lead-card-session-16";

export const PHASE_16_DELIVERED = [
  "pipeline-sla types + mortgage seed defaults (PDF stages)",
  "Pure computeLeadSla engine (stage + milestone bands)",
  "Settings store at crm-configuration/pipelines",
  "PipelineSlaSettingsClient admin UI (stage + milestone tables)",
  "Lead Card + List LeadSlaChip (separate from Activity Summary)",
  "Kanban drag resets stageEnteredAt; keeps pipelineStartedAt",
  "Seed bands: William On Track, Chloe Due Today, Jennifer Overdue, Arjun Milestone Overdue",
  "smoke-session16 + Vitest",
] as const;

export const PHASE_16_STAGING_CHECKLIST = [
  "Open Settings → CRM Configuration → Pipelines; edit stage/milestone durations; Save",
  "Leads board shows SLA chips alongside Activity Summary (both visible)",
  "Drag a lead to a new status — Stage SLA resets; milestone clock continues",
  "Lost / Unqualified shows No SLA (chip hidden)",
  "List view Pipeline SLA column mirrors card badge bands",
] as const;

export const PHASE_16_OUT_OF_SCOPE = [
  "Business-hours / holiday calendar for SLA clocks",
  "Escalation / push notifications for SLA breach",
  "Human Phase 13 a11y sign-off",
  // Delivered in Session 17: mortgage stage Kanban columns
] as const;

export function getPhase16Manifest() {
  return {
    id: PHASE_16_ID,
    sessionId: SESSION_16_ID,
    title: PHASE_16_TITLE,
    status: "pipeline_sla_shipped" as const,
    delivered: [...PHASE_16_DELIVERED],
    stagingChecklist: [...PHASE_16_STAGING_CHECKLIST],
    outOfScope: [...PHASE_16_OUT_OF_SCOPE],
    docs: {
      index: "docs/lead-card/README.md",
      sla: "docs/lead-card/phase-16-pipeline-sla.md",
    },
    prevPhase: {
      id: "lead-card-phase-15",
      title: "Comms + files production",
    },
  };
}
