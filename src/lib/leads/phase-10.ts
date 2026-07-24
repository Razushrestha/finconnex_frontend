import { LEAD_CARD_HYDRATE_KEYS } from "@/lib/leads/phase-9";
import { LEAD_CARD_MODULE_ROUTES } from "@/lib/persistence/module-routes";

export const PHASE_10_ID = "lead-card-phase-10";
export const PHASE_10_TITLE = "Live CRM adapters";
export const SESSION_10_ID = "lead-card-session-10";

/**
 * Session 10 delivers adapter bootstrap + contract tests against mock KV.
 * Full OpenAPI module REST + binary upload remain cutover work when backend ships.
 */
export const PHASE_10_DELIVERED = [
  "bootstrapPersistence() — tenant + session/API mode from env",
  "PersistenceBootstrap client — mounts in app Providers",
  "createMockKvBackend() — /v1/kv contract without network",
  "LEAD_CARD_MODULE_ROUTES — preferred REST path map for OpenAPI cutover",
  "smoke-session10 + Vitest API roundtrip",
] as const;

export const PHASE_10_CUTOVER_CHECKLIST = [
  "Auth supplies orgId + access token to bootstrapPersistence",
  "NEXT_PUBLIC_CRM_API_URL points at live CRM origin",
  "KV or module APIs honour X-Tenant-Id + Bearer",
  "Hydrate LEAD_CARD_HYDRATE_KEYS after login before Lead Card mount",
  "Replace KV with module REST adapters per LEAD_CARD_MODULE_ROUTES",
  "Attachment binary upload (multipart) outside JSON KV",
  "True Call/SMS/Email send gateways (not mailto/sms/tel intents only)",
] as const;

export const PHASE_10_OUT_OF_SCOPE = [
  "Live production CRM backend implementation",
  "Attachment binary storage / CDN",
  "Carrier / ESP send pipelines",
  "Offline retry queue / conflict merge",
] as const;

export function getPhase10Manifest() {
  return {
    id: PHASE_10_ID,
    sessionId: SESSION_10_ID,
    title: PHASE_10_TITLE,
    status: "adapter_ready" as const,
    delivered: [...PHASE_10_DELIVERED],
    cutoverChecklist: [...PHASE_10_CUTOVER_CHECKLIST],
    outOfScope: [...PHASE_10_OUT_OF_SCOPE],
    hydrateKeys: [...LEAD_CARD_HYDRATE_KEYS],
    moduleRoutes: LEAD_CARD_MODULE_ROUTES.map((r) => ({ ...r })),
    docs: {
      index: "docs/lead-card/README.md",
      cutover: "docs/lead-card/phase-10-cutover.md",
      apiRunbook: "docs/lead-card/api-adapter-runbook.md",
    },
    prevPhase: {
      id: "lead-card-phase-9",
      title: "Acceptance & production ready",
    },
    nextPhase: {
      id: "lead-card-phase-11",
      title: "Spec polish — fields + document requested",
    },
  };
}
