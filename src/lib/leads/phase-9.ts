/**
 * Phase 9 — Acceptance & Production Ready contracts.
 * Feature work is complete; this phase gates human QA + API readiness.
 */

import { LEAD_CARD_A11Y_CHECKLIST } from "@/lib/leads/a11y-urgency";
import { LEAD_CARD_PRODUCT_DECISIONS } from "@/lib/leads/product-decisions";

export const PHASE_9_ID = "lead-card-phase-9" as const;
export const PHASE_9_TITLE = "Acceptance & Production Ready" as const;

/** Product walkthrough steps for board + list (manual). */
export const LEAD_CARD_PRODUCT_WALK = [
  "Sales → Leads Kanban: Activity Summary opens pending panel",
  "Last Activity opens timeline; note + attachment appear as completed",
  "All 7 quick actions open the correct dialog / form",
  "Call / SMS / Email: device intent works when phone/email present",
  "Call / SMS / Email: Log as sent / Log call writes to activity modules",
  "Attachment quick action appears under Activities → Attachments",
  "Settings → Custom Fields: active Lead fields show in Lead Card picker",
  "Lead Card settings: select cf:* field; value shows on seeded William card",
  "Leads list view: same summary urgency, last activity, and 7 actions",
  "Confirm locked defaults: owner avatar off, unreplied 24h, note/attach neutral",
] as const;

/** Logical store keys to hydrate for Lead Card when API mode is on. */
export const LEAD_CARD_HYDRATE_KEYS = [
  "sales:leads:board:v6",
  "sales:leads:activity-extras:v1",
  "activities:calls:board:v1",
  "activities:meetings:list:v1",
  "activities:messages:list:v1",
  "activities:emails:list:v1",
  "activities:notes:list:v1",
  "activities:attachments:list:v1",
  "activities:tasks:board:v2",
  "settings:values:v1",
  "settings:custom-fields:v1",
] as const;

/** Explicit non-goals for Phase 9 (deferred to Phase 10+). */
export const PHASE_9_OUT_OF_SCOPE = [
  "Live CRM REST modules (use adapter runbook instead)",
  "Binary attachment upload / object storage",
  "SMS/email gateway send (device compose + CRM log only)",
  "Escalation or push notifications from the Lead Card",
] as const;

export const PHASE_9_EXIT_CRITERIA = [
  "Manual a11y checklist walked on Kanban + List (keyboard + screen reader)",
  "Product walk signed; locked product decisions accepted for v1",
  "npm test + tsc --noEmit green; CI workflow present",
  "API adapter runbook reviewed; hydrate keys listed",
  "No open P0/P1 Lead Card defects from the walkthrough",
] as const;

/** Machine-readable snapshot for smokes / docs generators. */
export function getPhase9Manifest() {
  return {
    id: PHASE_9_ID,
    title: PHASE_9_TITLE,
    status: "ready_for_acceptance" as const,
    a11yChecklist: [...LEAD_CARD_A11Y_CHECKLIST],
    productWalk: [...LEAD_CARD_PRODUCT_WALK],
    outOfScope: [...PHASE_9_OUT_OF_SCOPE],
    exitCriteria: [...PHASE_9_EXIT_CRITERIA],
    hydrateKeys: [...LEAD_CARD_HYDRATE_KEYS],
    lockedDecisions: { ...LEAD_CARD_PRODUCT_DECISIONS },
    docs: {
      index: "docs/lead-card/README.md",
      acceptance: "docs/lead-card/phase-9-acceptance.md",
      apiRunbook: "docs/lead-card/api-adapter-runbook.md",
    },
    nextPhase: {
      id: "lead-card-phase-10",
      title: "Live CRM adapters",
      when: "Backend auth + module APIs available",
      session10: "Adapter bootstrap + mock KV shipped; live CRM still external",
    },
  };
}
