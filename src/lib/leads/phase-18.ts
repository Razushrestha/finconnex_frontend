/**
 * Phase 18 / Session 18 — Pipeline SLA Work Queue.
 */

export const PHASE_18_ID = "lead-card-phase-18";
export const PHASE_18_TITLE = "Pipeline SLA Work Queue";
export const SESSION_18_ID = "lead-card-session-18";

export const PHASE_18_DELIVERED = [
  "listSlaAttentionLeads ranks Overdue → Milestone Overdue → Due Today → At Risk",
  "Work Queue sidebar category Pipeline SLA with band filters",
  "Rows deep-link to /sales/leads?focus=…",
  "Scoped by Work Queue user tab (owner)",
  "Live refresh when leads move or SLA settings change",
  "smoke-session18 + Vitest",
] as const;

export const PHASE_18_STAGING_CHECKLIST = [
  "Work Queue → Pipeline SLA → Needs attention lists Jennifer / Arjun / Chloe / Jamie (by owner tab)",
  "Overdue filter shows Jennifer; Milestone Overdue shows Arjun",
  "Row click opens Leads with that card focused",
  "William (On Track) does not appear in SLA attention",
  "Manage Queue shows Pipeline SLA category",
] as const;

export const PHASE_18_OUT_OF_SCOPE = [
  "Business-hours / holiday calendar for SLA clocks",
  "SLA escalation / push notifications",
  "Leads page filter chips for SLA bands (follow-up)",
  "Human Phase 13 a11y sign-off",
] as const;

export function getPhase18Manifest() {
  return {
    id: PHASE_18_ID,
    sessionId: SESSION_18_ID,
    title: PHASE_18_TITLE,
    status: "sla_work_queue_shipped" as const,
    delivered: [...PHASE_18_DELIVERED],
    stagingChecklist: [...PHASE_18_STAGING_CHECKLIST],
    outOfScope: [...PHASE_18_OUT_OF_SCOPE],
    docs: {
      index: "docs/lead-card/README.md",
      board: "docs/lead-card/phase-18-sla-work-queue.md",
    },
    prevPhase: {
      id: "lead-card-phase-17",
      title: "Mortgage pipeline Kanban",
    },
  };
}
