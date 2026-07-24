/**
 * Phase 14 / Session 14 — Live API cutover scaffolding.
 * Auth bridge + module REST hydrate; staging backend still external.
 */

import { LEAD_CARD_HYDRATE_KEYS } from "@/lib/leads/phase-9";
import { LEAD_CARD_MODULE_ROUTES } from "@/lib/persistence/module-routes";

export const PHASE_14_ID = "lead-card-phase-14";
export const PHASE_14_TITLE = "Live API cutover";
export const SESSION_14_ID = "lead-card-session-14";

export const PHASE_14_DELIVERED = [
  "/api/auth/crm-token — session JWT → CRM Bearer bridge",
  "fetchAuthBridge() — /api/auth/me + crm-token",
  "runLiveApiCutover() — tenant + module/KV hydrate",
  "createModuleRestClient + createMockModuleApi",
  "ApiDriver.seedCache for module hydrate without PUT",
  "PersistenceBootstrap uses runLiveApiCutover",
  "smoke-session14 + Vitest",
] as const;

export const PHASE_14_STAGING_CHECKLIST = [
  "Log in so /api/auth/me returns tenant_finconnex (or org id)",
  "Set NEXT_PUBLIC_CRM_API_URL to staging CRM origin",
  "Confirm X-Tenant-Id + Bearer on module GETs",
  "Module collections return { value } or JSON for each LEAD_CARD_HYDRATE_KEYS path",
  "Lead Card board loads hydrated data after login (no demo seed overwrite)",
  "Write path: create call/note from card persists via API flush",
] as const;

export const PHASE_14_OUT_OF_SCOPE = [
  "Production CRM backend implementation",
  "Binary attachment multipart upload (Phase 15)",
  "Carrier / ESP send gateways (Phase 15)",
  "Offline retry / conflict merge",
] as const;

export function getPhase14Manifest() {
  return {
    id: PHASE_14_ID,
    sessionId: SESSION_14_ID,
    title: PHASE_14_TITLE,
    status: "cutover_scaffolded" as const,
    delivered: [...PHASE_14_DELIVERED],
    stagingChecklist: [...PHASE_14_STAGING_CHECKLIST],
    outOfScope: [...PHASE_14_OUT_OF_SCOPE],
    hydrateKeys: [...LEAD_CARD_HYDRATE_KEYS],
    moduleRoutes: LEAD_CARD_MODULE_ROUTES.map((r) => ({ ...r })),
    docs: {
      index: "docs/lead-card/README.md",
      cutover: "docs/lead-card/phase-14-cutover.md",
      apiRunbook: "docs/lead-card/api-adapter-runbook.md",
    },
    prevPhase: {
      id: "lead-card-phase-13",
      title: "Acceptance close-out",
    },
    nextPhase: {
      id: "lead-card-phase-15",
      title: "Comms + files production",
    },
  };
}
