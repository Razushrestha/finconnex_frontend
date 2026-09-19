/**
 * The Create Contact step's form, shaped like the Create Contact modal
 * (CreateContactForm), and its conversion to and from the step config.
 *
 * A contact's email is unique in the workspace, so a step with a fixed email
 * creates the contact once and fails on every later run. On a lead trigger
 * the form can instead copy the name, email and phone of the lead the
 * workflow runs for.
 */

import { optionalPhoneError } from "@/lib/contacts/phone";
import type { ContactSource } from "@/lib/contacts/types";
import { crmSourceToUi, uiSourceToCrm } from "@/lib/leads/api/map";

/**
 * The modal's statuses the CRM stores. "Bounced" and "Archived" have no
 * ContactStatus on the API — saving them fails — so they are left out.
 */
export const CONTACT_ACTION_STATUSES = ["Active", "Inactive", "Unsubscribed"] as const;
export type ContactActionStatus = (typeof CONTACT_ACTION_STATUSES)[number];

export interface ContactActionFormState {
  /** Copy first/last name, email, phone and mobile from the trigger lead. */
  copyFromTrigger: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  companyId: string;
  leadSource: ContactSource | "";
  status: ContactActionStatus;
  ownerId: string;
}

export function emptyContactActionForm(copyFromTrigger: boolean): ContactActionFormState {
  return {
    copyFromTrigger,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    mobile: "",
    companyId: "",
    leadSource: "",
    status: "Active",
    ownerId: "",
  };
}

export function contactActionConfigFromForm(form: ContactActionFormState): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (form.copyFromTrigger) {
    config.copyFromTrigger = true;
  } else {
    config.firstName = form.firstName.trim();
    config.lastName = form.lastName.trim();
    config.email = form.email.trim();
    if (form.phone.trim()) config.phone = form.phone.trim();
    if (form.mobile.trim()) config.mobilePhone = form.mobile.trim();
  }
  if (form.companyId) config.companyId = form.companyId;
  if (form.leadSource) config.source = uiSourceToCrm(form.leadSource);
  if (form.status !== "Active") config.status = form.status.toUpperCase();
  if (form.ownerId) config.ownerId = form.ownerId;
  return config;
}

export function contactActionFormFromConfig(
  config: Record<string, unknown>,
  defaultCopyFromTrigger: boolean,
): ContactActionFormState {
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const saved = Object.keys(config).length > 0;
  const form = emptyContactActionForm(saved ? config.copyFromTrigger === true : defaultCopyFromTrigger);
  form.firstName = str(config.firstName);
  form.lastName = str(config.lastName);
  form.email = str(config.email);
  form.phone = str(config.phone);
  form.mobile = str(config.mobilePhone);
  form.companyId = str(config.companyId);
  if (str(config.source)) form.leadSource = crmSourceToUi(str(config.source));
  const status = CONTACT_ACTION_STATUSES.find((s) => s.toUpperCase() === str(config.status));
  if (status) form.status = status;
  form.ownerId = str(config.ownerId);
  return form;
}

/** The Create Contact modal's required fields and checks. */
export function contactActionProblems(
  form: ContactActionFormState,
  triggerIsLead: boolean,
): string[] {
  const problems: string[] = [];
  if (form.copyFromTrigger) {
    if (!triggerIsLead) problems.push("Only a lead trigger has details to copy — fill them in instead");
  } else {
    if (!form.firstName.trim()) problems.push("First Name is required");
    if (!form.lastName.trim()) problems.push("Last Name is required");
    if (!form.email.trim()) problems.push("Email is required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) problems.push("Enter a valid email");
    if (form.phone.trim() && optionalPhoneError(form.phone)) problems.push("Enter a valid phone number");
    if (form.mobile.trim() && optionalPhoneError(form.mobile)) problems.push("Enter a valid mobile number");
  }
  if (!form.ownerId) problems.push("Owner is required");
  return problems;
}
