/**
 * The Create Lead step's form, shaped like the Create Lead modal
 * (CreateLeadForm), and its conversion to and from the step config.
 *
 * The step builds the lead from a contact, as the modal does: the primary
 * contact's email and phone become the lead's. In a workflow the primary
 * contact is usually the one the workflow is running for, so the form can
 * use the trigger record's contact instead of a fixed one — a fixed contact
 * would get the same lead every run, and a lead email is unique, so the
 * second run would fail.
 */

import type { LinkedLeadContact } from "@/components/sales/leads/LeadContactPicker";
import { crmSourceToUi, uiPipelineStageToCrm, uiSourceToCrm } from "@/lib/leads/api/map";
import {
  LEAD_PIPELINE_STAGES,
  type LeadPipelineStage,
  type LeadSource,
  type LoanPurpose,
} from "@/lib/leads/types";

export interface LeadActionFormState {
  /** Build the lead from the record that started the workflow. */
  useTriggerContact: boolean;
  /** Picked contacts: primary first, then an optional secondary. */
  contacts: LinkedLeadContact[];
  /** Secondary contact when the primary comes from the trigger record. */
  secondaryContactId: string;
  secondaryContactName: string;
  leadName: string;
  pipelineStage: LeadPipelineStage;
  leadSource: LeadSource | "";
  ownerId: string;
  /** Follower user ids; the field shows their names. */
  followerIds: string[];
  loanPurpose: LoanPurpose | "";
  tags: string[];
  notes: string;
}

export function emptyLeadActionForm(useTriggerContact: boolean): LeadActionFormState {
  return {
    useTriggerContact,
    contacts: [],
    secondaryContactId: "",
    secondaryContactName: "",
    leadName: "",
    pipelineStage: "New Lead",
    leadSource: "",
    ownerId: "",
    followerIds: [],
    loanPurpose: "",
    tags: [],
    notes: "",
  };
}

function stageLabel(code: unknown): LeadPipelineStage {
  if (typeof code !== "string") return "New Lead";
  return (
    LEAD_PIPELINE_STAGES.find((stage) => uiPipelineStageToCrm(stage) === code) ?? "New Lead"
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function leadActionConfigFromForm(form: LeadActionFormState): Record<string, unknown> {
  const config: Record<string, unknown> = {
    name: form.leadName.trim(),
    pipelineStage: uiPipelineStageToCrm(form.pipelineStage),
  };
  if (form.useTriggerContact) {
    if (form.secondaryContactId) config.secondaryContactId = form.secondaryContactId;
  } else {
    const [primary, secondary] = form.contacts;
    if (primary?.id) config.contactId = primary.id;
    if (secondary?.id) config.secondaryContactId = secondary.id;
  }
  if (form.leadSource) config.source = uiSourceToCrm(form.leadSource);
  if (form.ownerId) config.ownerId = form.ownerId;
  if (form.followerIds.length) config.followerIds = form.followerIds;
  if (form.loanPurpose) config.loanPurpose = form.loanPurpose;
  if (form.tags.length) config.tags = form.tags;
  if (form.notes.trim()) config.notes = form.notes.trim();
  return config;
}

/**
 * The form for a saved step. Contact names are not in the config, so picked
 * contacts come back with their id and the form resolves their names.
 */
export function leadActionFormFromConfig(
  config: Record<string, unknown>,
  defaultUseTriggerContact: boolean,
): LeadActionFormState {
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const saved = Object.keys(config).length > 0;
  const contactId = str(config.contactId);
  const form = emptyLeadActionForm(saved ? !contactId : defaultUseTriggerContact);
  const contact = (id: string): LinkedLeadContact => ({
    id,
    name: "",
    email: "",
    phone: "",
    firstName: "",
    middleName: "",
    lastName: "",
  });
  if (contactId) {
    form.contacts = [contact(contactId)];
    if (str(config.secondaryContactId)) form.contacts.push(contact(str(config.secondaryContactId)));
  } else {
    form.secondaryContactId = str(config.secondaryContactId);
  }
  form.leadName = str(config.name);
  form.pipelineStage = stageLabel(config.pipelineStage);
  if (str(config.source)) form.leadSource = crmSourceToUi(str(config.source));
  form.ownerId = str(config.ownerId);
  form.followerIds = Array.isArray(config.followerIds)
    ? config.followerIds.filter((id): id is string => typeof id === "string")
    : [];
  const purpose = str(config.loanPurpose);
  if (purpose === "Purchase" || purpose === "Refinance" || purpose === "Investment") {
    form.loanPurpose = purpose;
  }
  form.tags = Array.isArray(config.tags)
    ? config.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  form.notes = str(config.notes);
  return form;
}

/** The Create Lead modal's required fields, plus the workflow's contact rule. */
export function leadActionProblems(
  form: LeadActionFormState,
  triggerHasContact: boolean,
): string[] {
  const problems: string[] = [];
  if (form.useTriggerContact) {
    if (!triggerHasContact) problems.push("This trigger's record has no contact — pick one instead");
  } else if (!form.contacts[0]) {
    problems.push("Add a primary contact");
  } else if (form.contacts.slice(0, 2).some((c) => !UUID.test(c.id))) {
    problems.push("That contact isn't saved to the CRM yet — pick a saved contact");
  }
  if (!form.leadName.trim()) problems.push("Lead name is required");
  if (!form.leadSource) problems.push("Lead source is required");
  if (!form.ownerId) problems.push("Lead owner is required");
  return problems;
}
