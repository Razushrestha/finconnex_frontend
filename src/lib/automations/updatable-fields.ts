/**
 * The fields an UPDATE_RECORD / CHANGE_STATUS step may actually write, per
 * entity.
 *
 * Mirrors MUTABLE_LEAD_FIELDS / MUTABLE_DEAL_FIELDS / MUTABLE_CONTACT_FIELDS
 * / MUTABLE_COMPANY_FIELDS in automation-action.service.ts. The executor runs
 * every `fields` object through pickAllowed() against those sets, so a key
 * that is not listed here is dropped *silently* — the step reports success
 * and nothing changes. That is exactly what a free-text JSON box invites, and
 * why this list exists.
 *
 * AUTOMATION_FIELD_REGISTRY in ./types is a different list and must not be
 * used here: it is the *condition* registry (what a filter may read,
 * including id/createdAt/isConverted, none of which are writable).
 */

import type { AutomationEntityType } from "./types";

export type UpdatableFieldWidget =
  | "select"
  | "member"
  | "number"
  | "boolean"
  | "date"
  | "text";

export interface UpdatableField {
  label: string;
  widget: UpdatableFieldWidget;
  options?: { label: string; value: string }[];
  helpText?: string;
}

/** prisma/schema.prisma → enum LeadStatus */
const LEAD_STATUS = [
  { label: "New", value: "NEW" },
  { label: "Contacted", value: "CONTACTED" },
  { label: "Qualified", value: "QUALIFIED" },
  { label: "Unqualified", value: "UNQUALIFIED" },
  { label: "Converted", value: "CONVERTED" },
  { label: "Open", value: "OPEN" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Nurture", value: "NURTURE" },
  { label: "Lost", value: "LOST" },
];

/** prisma/schema.prisma → enum LifecycleStage */
const LIFECYCLE_STAGE = [
  { label: "Subscriber", value: "SUBSCRIBER" },
  { label: "Lead", value: "LEAD" },
  { label: "MQL", value: "MQL" },
  { label: "SQL", value: "SQL" },
  { label: "Opportunity", value: "OPPORTUNITY" },
  { label: "Customer", value: "CUSTOMER" },
  { label: "Evangelist", value: "EVANGELIST" },
  { label: "Lost", value: "LOST" },
];

const OWNER: UpdatableField = { label: "Owner", widget: "member" };

export const UPDATABLE_FIELDS: Partial<
  Record<AutomationEntityType, Record<string, UpdatableField>>
> = {
  LEAD: {
    status: { label: "Status", widget: "select", options: LEAD_STATUS },
    ownerId: OWNER,
    rating: {
      label: "Rating",
      widget: "select",
      options: [
        { label: "Hot", value: "HOT" },
        { label: "Warm", value: "WARM" },
        { label: "Cold", value: "COLD" },
      ],
    },
    lifecycleStage: {
      label: "Lifecycle Stage",
      widget: "select",
      options: LIFECYCLE_STAGE,
    },
    score: { label: "Score", widget: "number" },
  },
  CONTACT: {
    status: {
      label: "Status",
      widget: "select",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
        { label: "Unsubscribed", value: "UNSUBSCRIBED" },
      ],
    },
    ownerId: OWNER,
    lifecycleStage: {
      label: "Lifecycle Stage",
      widget: "select",
      options: LIFECYCLE_STAGE,
    },
    doNotContact: { label: "Do Not Contact", widget: "boolean" },
  },
  COMPANY: {
    status: {
      label: "Status",
      widget: "select",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
        { label: "Prospect", value: "PROSPECT" },
        { label: "Customer", value: "CUSTOMER" },
        { label: "Partner", value: "PARTNER" },
      ],
    },
    ownerId: OWNER,
    // Company.industry is a plain String? column, not an enum.
    industry: { label: "Industry", widget: "text" },
    size: {
      label: "Size",
      widget: "select",
      options: [
        { label: "Micro (1–9)", value: "MICRO" },
        { label: "Small (10–49)", value: "SMALL" },
        { label: "Medium (50–249)", value: "MEDIUM" },
        { label: "Large (250–999)", value: "LARGE" },
        { label: "Enterprise (1000+)", value: "ENTERPRISE" },
      ],
    },
  },
  DEAL: {
    stage: {
      label: "Stage",
      widget: "select",
      options: [
        { label: "Prospecting", value: "PROSPECTING" },
        { label: "Qualification", value: "QUALIFICATION" },
        { label: "Proposal", value: "PROPOSAL" },
        { label: "Negotiation", value: "NEGOTIATION" },
        { label: "Contract Sent", value: "CONTRACT_SENT" },
        { label: "Closed Won", value: "CLOSED_WON" },
        { label: "Closed Lost", value: "CLOSED_LOST" },
      ],
    },
    ownerId: OWNER,
    probability: { label: "Probability (%)", widget: "number" },
    expectedCloseDate: { label: "Expected Close Date", widget: "date" },
    lostReason: { label: "Lost Reason", widget: "text" },
  },
};

export function updatableFields(
  entityType: AutomationEntityType,
): Record<string, UpdatableField> {
  return UPDATABLE_FIELDS[entityType] ?? {};
}

/**
 * Keys saved on a step that this build cannot offer as a row — an entity with
 * no list, or a key written by hand through the API. They are surfaced as
 * read-only rows rather than dropped, so opening a step never silently
 * discards what someone else configured.
 */
export function unknownFieldKeys(
  entityType: AutomationEntityType,
  fields: Record<string, unknown>,
): string[] {
  const known = updatableFields(entityType);
  return Object.keys(fields).filter((key) => !(key in known));
}
