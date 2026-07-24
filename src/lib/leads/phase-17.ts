/**
 * Phase 17 / Session 17 — Mortgage pipeline Kanban (Option B).
 */

export const PHASE_17_ID = "lead-card-phase-17";
export const PHASE_17_TITLE = "Mortgage pipeline Kanban";
export const SESSION_17_ID = "lead-card-session-17";

export const PHASE_17_DELIVERED = [
  "Kanban columns = mortgage stages (New Lead → Lost)",
  "pipelineStageToLeadStatus + assertPipelineStageChange",
  "Drag sets real pipelineStage; Settled is final; New Lead restarts pipelineStartedAt",
  "normalizeMortgageBoard restores PDF order + card↔column sync",
  "Lead Card / List show mortgage stage under the name",
  "Create form Pipeline stage + column Plus deep-link",
  "Filters use pipeline stages; CRM LeadStatus kept as bridge",
  "Board store v6 seed (Jamie Cole on New Lead)",
  "smoke-session17 + Vitest",
] as const;

export const PHASE_17_STAGING_CHECKLIST = [
  "Sales → Leads shows 8 mortgage stage columns with Jamie on New Lead",
  "Drag William from In Conversation → Waiting on Documents; Stage SLA resets",
  "Drag into New Lead restarts milestone clock",
  "Cannot drag out of Settled",
  "Column + opens create with that stage prefilled",
  "Lost column cards show no SLA chip",
  "Filter by pipeline stage hides other columns",
] as const;

export const PHASE_17_OUT_OF_SCOPE = [
  "Business-hours / holiday calendar for SLA",
  "SLA escalation notifications",
  "Deal-pipeline boards other than mortgage leads",
  "Human Phase 13 a11y sign-off",
] as const;

export function getPhase17Manifest() {
  return {
    id: PHASE_17_ID,
    sessionId: SESSION_17_ID,
    title: PHASE_17_TITLE,
    status: "mortgage_kanban_shipped" as const,
    delivered: [...PHASE_17_DELIVERED],
    stagingChecklist: [...PHASE_17_STAGING_CHECKLIST],
    outOfScope: [...PHASE_17_OUT_OF_SCOPE],
    docs: {
      index: "docs/lead-card/README.md",
      board: "docs/lead-card/phase-17-mortgage-kanban.md",
    },
    prevPhase: {
      id: "lead-card-phase-16",
      title: "Pipeline Stage + Milestone SLA",
    },
  };
}
