/**
 * The Create Deal step's form, shaped like the Create Deal modal
 * (CreateDealForm), and its conversion to and from the step config. The
 * config is built with the modal's own toCreateDealBody, so the step sends
 * the values the modal sends.
 *
 * Two things differ, because a workflow runs many times:
 * - Contact links a real contact to the deal — a picked one, or the trigger
 *   record's — where the modal's free-text contact is never saved.
 * - Expected Close Date can be a time after the workflow runs; a fixed date
 *   would already be past on later runs.
 */

import {
  TASK_OFFSET_UNITS,
  offsetFromMs,
  offsetMs,
  type TaskOffset,
} from "@/lib/automations/task-action-form";
import { apiDealStage, mapLostReason, toCreateDealBody } from "@/lib/deals/api";
import {
  DEAL_STAGES,
  LOST_REASONS,
  type DealCurrency,
  type DealStageTitle,
} from "@/lib/deals/types";
import { crmSourceToUi } from "@/lib/leads/api/map";
import type { LeadSource } from "@/lib/leads/types";

export { TASK_OFFSET_UNITS as DEAL_OFFSET_UNITS };

/** The modal's stage → probability defaults (STAGE_PROBABILITY). */
export const DEAL_STAGE_PROBABILITY: Record<DealStageTitle, number> = {
  Prospecting: 10,
  Qualification: 25,
  Proposal: 50,
  Negotiation: 75,
  "Closed Won": 100,
  "Closed Lost": 0,
};

export interface DealActionFormState {
  dealName: string;
  accountId: string;
  /** Link the trigger record's contact instead of a picked one. */
  contactFromTrigger: boolean;
  contactId: string;
  leadSource: LeadSource | "";
  stage: DealStageTitle;
  probability: string;
  closeMode: "relative" | "date";
  /** Blank amount means no close date, as an empty date does on the modal. */
  closeIn: { amount: number | ""; unit: TaskOffset["unit"] };
  /** `yyyy-mm-dd`, as on the modal. */
  expectedCloseDate: string;
  dealValue: string;
  currency: DealCurrency;
  ownerId: string;
  description: string;
  lostReason: string;
  competitor: string;
}

export function emptyDealActionForm(contactFromTrigger: boolean): DealActionFormState {
  return {
    dealName: "",
    accountId: "",
    contactFromTrigger,
    contactId: "",
    leadSource: "",
    stage: "Prospecting",
    probability: "10",
    closeMode: "relative",
    closeIn: { amount: "", unit: "days" },
    expectedCloseDate: "",
    dealValue: "",
    currency: "AUD",
    ownerId: "",
    description: "",
    lostReason: "",
    competitor: "",
  };
}

export function dealActionConfigFromForm(form: DealActionFormState): Record<string, unknown> {
  const closedLost = form.stage === "Closed Lost";
  const config = toCreateDealBody({
    name: form.dealName,
    companyId: form.accountId,
    stage: form.stage,
    value: form.dealValue,
    currency: form.currency,
    probability: form.probability.trim() ? Number(form.probability) : undefined,
    ownerId: form.ownerId,
    closeDate: form.closeMode === "date" ? form.expectedCloseDate || undefined : undefined,
    source: form.leadSource || undefined,
    description: form.description,
    lostReason: closedLost ? form.lostReason || undefined : undefined,
    competitor: closedLost ? form.competitor : undefined,
  });
  if (form.closeMode === "relative" && form.closeIn.amount !== "" && form.closeIn.amount > 0) {
    config.expectedCloseInMs = offsetMs({ amount: form.closeIn.amount, unit: form.closeIn.unit });
  }
  if (form.contactFromTrigger) config.contactFromTrigger = true;
  else if (form.contactId) config.contactId = form.contactId;
  return config;
}

export function dealActionFormFromConfig(
  config: Record<string, unknown>,
  defaultContactFromTrigger: boolean,
): DealActionFormState {
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const saved = Object.keys(config).length > 0;
  const form = emptyDealActionForm(saved ? config.contactFromTrigger === true : defaultContactFromTrigger);
  form.dealName = str(config.name);
  form.accountId = str(config.companyId);
  form.contactId = str(config.contactId);
  if (str(config.source)) form.leadSource = crmSourceToUi(str(config.source));
  const stage = DEAL_STAGES.find((title) => apiDealStage(title) === str(config.stage));
  if (stage) form.stage = stage;
  form.probability =
    typeof config.probability === "number" ? String(config.probability) : saved ? "" : form.probability;
  if (typeof config.expectedCloseInMs === "number") {
    const offset = offsetFromMs(config.expectedCloseInMs);
    form.closeIn = { amount: offset.amount, unit: offset.unit };
  } else if (str(config.expectedCloseDate)) {
    form.closeMode = "date";
    form.expectedCloseDate = str(config.expectedCloseDate).slice(0, 10);
  }
  form.dealValue = str(config.value);
  const currency = str(config.currency);
  if (currency) form.currency = currency as DealCurrency;
  form.ownerId = str(config.ownerId);
  form.description = str(config.description);
  form.lostReason = LOST_REASONS.find((reason) => mapLostReason(reason) === str(config.lostReason)) ?? "";
  form.competitor = str(config.competitor);
  return form;
}

/** The Create Deal modal's required fields, plus the workflow's contact rule. */
export function dealActionProblems(
  form: DealActionFormState,
  opts: { triggerHasContact: boolean; accountsExist: boolean },
): string[] {
  const problems: string[] = [];
  if (!form.dealName.trim()) problems.push("Deal Name is required");
  if (opts.accountsExist && !form.accountId) problems.push("Select a CRM company");
  if (form.contactFromTrigger && !opts.triggerHasContact) {
    problems.push("This trigger's record has no contact — pick one instead");
  }
  if (!form.dealValue.trim()) problems.push("Deal Value is required");
  if (!form.ownerId) problems.push("Owner is required");
  if (form.stage === "Closed Lost" && !form.lostReason) problems.push("Lost Reason is required for Closed Lost");
  return problems;
}
