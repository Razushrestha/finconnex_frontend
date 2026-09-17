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
  | "contact"
  | "number"
  | "boolean"
  | "date"
  | "text"
  | "longtext";

export interface UpdatableField {
  label: string;
  widget: UpdatableFieldWidget;
  options?: { label: string; value: string }[];
  helpText?: string;
  /**
   * Still written by the executor, but no longer offered for a new row. A
   * step that already sets it keeps showing it, so opening an older workflow
   * never turns a working field into a warning.
   */
  legacy?: boolean;
}

/**
 * prisma/schema.prisma → enum MortgagePipelineStage, labelled as the lead's
 * pipeline and board columns name them. This is the "status" people see on
 * a lead, so it is what Update Field offers as Status.
 */
const LEAD_PIPELINE_STAGE = [
  { label: "New Lead", value: "NEW_LEAD" },
  { label: "Appointment Booked", value: "APPOINTMENT_BOOKED" },
  { label: "Appointment Missed", value: "APPOINTMENT_MISSED" },
  { label: "In Conversation", value: "IN_CONVERSATION" },
  { label: "Hold", value: "HOLD" },
  { label: "No Answer", value: "NO_ANSWER" },
  { label: "Waiting on Docs", value: "WAITING_ON_DOCS" },
  { label: "Document Received", value: "DOCUMENT_RECEIVED" },
  { label: "Findings", value: "FINDINGS" },
  { label: "Research & Servicing", value: "RESEARCH_AND_SERVICING" },
  { label: "Servicing Completed", value: "SERVICING_COMPLETED" },
  { label: "Loan Proposal Presented", value: "LOAN_PROPOSAL_PRESENTED" },
  { label: "Future Potential Clients", value: "FUTURE_POTENTIAL_CLIENTS" },
  { label: "Closed Won", value: "CLOSED_WON" },
  { label: "Closed Lost", value: "CLOSED_LOST" },
];

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

/** CreateLeadForm → LOAN_PURPOSES, stored in the lead's mortgage profile. */
const LOAN_PURPOSE = [
  { label: "Purchase", value: "Purchase" },
  { label: "Refinance", value: "Refinance" },
  { label: "Investment", value: "Investment" },
];

export const UPDATABLE_FIELDS: Partial<
  Record<AutomationEntityType, Record<string, UpdatableField>>
> = {
  // Order is the order "Add field" offers them in: the lead page's own
  // fields first. `name`, `loanPurpose` and `secondaryContactId` are not
  // columns — the executor maps them (automation-action.service updateLead).
  LEAD: {
    name: {
      label: "Lead Name",
      widget: "text",
      helpText: "e.g. Priya Mehta",
    },
    ownerId: { label: "Lead Owner", widget: "member" },
    pipelineStage: { label: "Lead Status", widget: "select", options: LEAD_PIPELINE_STAGE },
    loanPurpose: { label: "Loan Purpose", widget: "select", options: LOAN_PURPOSE },
    secondaryContactId: { label: "Add Secondary Contact", widget: "contact" },
    notes: { label: "Notes", widget: "longtext", helpText: "Replaces the lead's notes" },
    status: {
      label: "Legacy status",
      widget: "select",
      options: LEAD_STATUS,
      legacy: true,
    },
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

/** Fields a row may be set to: every current field, plus a legacy one the step already uses. */
export function offerableFieldKeys(
  entityType: AutomationEntityType,
  fields: Record<string, unknown>,
): string[] {
  return Object.entries(updatableFields(entityType))
    .filter(([key, meta]) => !meta.legacy || key in fields)
    .map(([key]) => key);
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
