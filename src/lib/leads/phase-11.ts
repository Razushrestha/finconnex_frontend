/**
 * Phase 11 / Session 11 — Spec polish for remaining §4 / §6 gaps.
 */

export const PHASE_11_ID = "lead-card-phase-11";
export const PHASE_11_TITLE = "Spec polish — fields + document requested";
export const SESSION_11_ID = "lead-card-session-11";

export const PHASE_11_DELIVERED = [
  "Pipeline / Stage (status) selectable as a Lead Card dynamic field",
  "Tags selectable as a Lead Card dynamic field (seeded on William + Chloe)",
  "Document requests → Last Activity label “Document requested” (spec §6)",
  "Deep-link sourceModule documents → /documents/requests",
  "smoke-session11 + Vitest coverage",
] as const;

export const PHASE_11_OUT_OF_SCOPE = [
  "Human Phase 9 a11y / product sign-off (still manual)",
  "Live CRM REST / binary upload / send gateways (Phase 10 cutover)",
  "Escalation or push from the Lead Card",
] as const;

export function getPhase11Manifest() {
  return {
    id: PHASE_11_ID,
    sessionId: SESSION_11_ID,
    title: PHASE_11_TITLE,
    status: "spec_polish_complete" as const,
    delivered: [...PHASE_11_DELIVERED],
    outOfScope: [...PHASE_11_OUT_OF_SCOPE],
    docs: {
      index: "docs/lead-card/README.md",
      polish: "docs/lead-card/phase-11-polish.md",
    },
    prevPhase: {
      id: "lead-card-phase-10",
      title: "Live CRM adapters",
    },
    nextPhase: {
      id: "lead-card-phase-12",
      title: "Timeline completeness + a11y surface",
    },
  };
}
