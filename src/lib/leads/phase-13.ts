/**
 * Phase 13 / Session 13 — Acceptance close-out pack.
 * Feature work (Sessions 1–12) is done; this phase gates human sign-off.
 */

import { LEAD_CARD_A11Y_CHECKLIST } from "@/lib/leads/a11y-urgency";
import { LEAD_CARD_PRODUCT_WALK, PHASE_9_EXIT_CRITERIA } from "@/lib/leads/phase-9";
import { PHASE_12_PRODUCT_WALK } from "@/lib/leads/phase-12";

export const PHASE_13_ID = "lead-card-phase-13";
export const PHASE_13_TITLE = "Acceptance close-out";
export const SESSION_13_ID = "lead-card-session-13";

/** Automated gates Phase 13 smoke must keep green. */
export const PHASE_13_AUTOMATED_GATES = [
  "npm run typecheck",
  "npm test (sessions 1–13 smokes + hardening)",
  "npm run smoke:phase9",
  "npm run smoke:phase12",
  "CI workflow present (.github/workflows/ci.yml)",
] as const;

/** Extended product walk after Sessions 11–12 (human). */
export const PHASE_13_EXTENDED_WALK = [
  "Lead Card settings: Pipeline / Stage and Tags selectable (max 4 fields)",
  "William card shows tags when Tags selected (Refinance, Hot)",
  "Document request appears as Last Activity label Document requested when newest",
  ...PHASE_12_PRODUCT_WALK,
] as const;

/** Human-only exit criteria — fill in phase-13-closeout.md / phase-9-acceptance.md. */
export const PHASE_13_HUMAN_EXIT = [
  "Manual a11y checklist walked on Kanban + List (keyboard + screen reader)",
  "Phase 9 product walk signed (10 steps)",
  "Phase 13 extended walk signed (fields + timeline + documents)",
  "Locked product decisions accepted for v1",
  "No open P0/P1 Lead Card defects from the walkthrough",
  "Confirm GitHub Actions green on a real remote PR",
  "Sign-off table completed (Product / Engineering / QA)",
] as const;

export const PHASE_13_NEXT_AFTER_ACCEPT = [
  {
    id: "lead-card-phase-14",
    title: "Live API cutover",
    when: "Backend auth + module APIs available",
  },
  {
    id: "lead-card-phase-15",
    title: "Comms + files production",
    when: "After Phase 14 — binary upload + send gateways",
  },
] as const;

export function getPhase13Manifest() {
  return {
    id: PHASE_13_ID,
    sessionId: SESSION_13_ID,
    title: PHASE_13_TITLE,
    status: "awaiting_human_signoff" as const,
    automatedGates: [...PHASE_13_AUTOMATED_GATES],
    humanExit: [...PHASE_13_HUMAN_EXIT],
    a11yChecklist: [...LEAD_CARD_A11Y_CHECKLIST],
    productWalk: [...LEAD_CARD_PRODUCT_WALK],
    extendedWalk: [...PHASE_13_EXTENDED_WALK],
    phase9ExitCriteria: [...PHASE_9_EXIT_CRITERIA],
    nextAfterAccept: [...PHASE_13_NEXT_AFTER_ACCEPT],
    docs: {
      index: "docs/lead-card/README.md",
      closeout: "docs/lead-card/phase-13-closeout.md",
      acceptance: "docs/lead-card/phase-9-acceptance.md",
    },
    prevPhase: {
      id: "lead-card-phase-12",
      title: "Timeline completeness + a11y surface",
    },
  };
}
