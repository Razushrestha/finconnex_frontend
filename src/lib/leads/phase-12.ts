/**
 * Phase 12 / Session 12 — Timeline completeness + a11y surface CI.
 */

export const PHASE_12_ID = "lead-card-phase-12";
export const PHASE_12_TITLE = "Timeline completeness + a11y surface";
export const SESSION_12_ID = "lead-card-session-12";

export const PHASE_12_DELIVERED = [
  "Lead status changes (audit) → Last Activity “Status changed” (spec §6)",
  "Kanban drag emits lead-activity refresh after logStatusChange",
  "hrefForLeadActivity supports leads + documents modules",
  "Work Queue HREF map includes /documents/requests",
  "Static a11y surface contracts (LeadCard / List / panels) for CI",
  "smoke-session12 + Vitest coverage",
] as const;

export const PHASE_12_OUT_OF_SCOPE = [
  "Human keyboard/SR walk sign-off (Phase 9 checklist)",
  "Deal stage_change timeline (Lead uses status_change)",
  "Live CRM REST cutover (Phase 10)",
] as const;

export const PHASE_12_PRODUCT_WALK = [
  "Drag a lead across Kanban columns → Last Activity shows Status changed after refresh",
  "Katherina seed history includes Status New → Contacted in activity index",
  "Click Last Activity on a status event deep-links toward /sales/leads",
  "Document request Last Activity deep-links to /documents/requests",
] as const;

export function getPhase12Manifest() {
  return {
    id: PHASE_12_ID,
    sessionId: SESSION_12_ID,
    title: PHASE_12_TITLE,
    status: "timeline_complete" as const,
    delivered: [...PHASE_12_DELIVERED],
    outOfScope: [...PHASE_12_OUT_OF_SCOPE],
    productWalk: [...PHASE_12_PRODUCT_WALK],
    docs: {
      index: "docs/lead-card/README.md",
      timeline: "docs/lead-card/phase-12-timeline.md",
    },
    prevPhase: {
      id: "lead-card-phase-11",
      title: "Spec polish — fields + document requested",
    },
    nextPhase: {
      id: "lead-card-phase-13",
      title: "Acceptance close-out",
    },
  };
}
