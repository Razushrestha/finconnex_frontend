/**
 * Phase 15 / Session 15 — Comms + files production scaffolding.
 */

export const PHASE_15_ID = "lead-card-phase-15";
export const PHASE_15_TITLE = "Comms + files production";
export const SESSION_15_ID = "lead-card-session-15";

export const PHASE_15_DELIVERED = [
  "AttachmentUploadAdapter — local + API (POST /v1/attachments/upload)",
  "createMockUploadFetch for smokes",
  "Attachment.storageUrl / contentType / byteSize on create",
  "SendGateway — device intents + API (/v1/calls/initiate, /messages/send, /emails/send)",
  "enableProductionComms() flips adapters when CRM URL set",
  "LeadQuickActionDialog uses getSendGateway(); submitLeadQuickAction uploads via adapter",
  "smoke-session15 + Vitest",
] as const;

export const PHASE_15_STAGING_CHECKLIST = [
  "Set NEXT_PUBLIC_CRM_API_URL so enableProductionComms enters api mode",
  "POST multipart/JSON upload returns storageUrl",
  "Call initiate / SMS send / Email send honour X-Tenant-Id + Bearer",
  "Lead Card attachment quick action stores storageUrl on record",
  "Call/SMS/Email intent buttons hit gateway (not only tel/sms/mailto) when api mode",
] as const;

export const PHASE_15_OUT_OF_SCOPE = [
  "Carrier / ESP vendor contracts (Twilio, SES, etc.)",
  "CDN provisioning / virus scan",
  "Offline retry queue",
  "Human Phase 13 sign-off",
] as const;

export function getPhase15Manifest() {
  return {
    id: PHASE_15_ID,
    sessionId: SESSION_15_ID,
    title: PHASE_15_TITLE,
    status: "comms_files_scaffolded" as const,
    delivered: [...PHASE_15_DELIVERED],
    stagingChecklist: [...PHASE_15_STAGING_CHECKLIST],
    outOfScope: [...PHASE_15_OUT_OF_SCOPE],
    docs: {
      index: "docs/lead-card/README.md",
      production: "docs/lead-card/phase-15-comms-files.md",
    },
    prevPhase: {
      id: "lead-card-phase-14",
      title: "Live API cutover",
    },
  };
}
