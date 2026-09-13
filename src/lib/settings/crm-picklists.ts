export type CrmPicklistValue = {
  code: string;
  label: string;
};

export type CrmPicklistSpec = {
  title: string;
  description: string;
  values: CrmPicklistValue[];
  appliesTo: string;
  nestEnum: string;
  moduleHref?: string;
  moduleLabel?: string;
};

function rows(
  entries: Array<[code: string, label: string]>,
): CrmPicklistValue[] {
  return entries.map(([code, label]) => ({ code, label }));
}

/** Settings pages whose values are Prisma enums, not the dummy hub form. */
export const CRM_SETTINGS_PICKLISTS: Record<string, CrmPicklistSpec> = {
  "crm-configuration/lost-reasons": {
    title: "Lost Reasons",
    description:
      "Required when a deal moves to Closed Lost. These values come from the CRM LostReason enum — they cannot be renamed or added from Settings.",
    nestEnum: "LostReason",
    appliesTo: "Deals (CLOSED_LOST)",
    moduleHref: "/sales/deals",
    moduleLabel: "Open Deals",
    values: rows([
      ["PRICE", "Price"],
      ["FEATURE", "Feature"],
      ["COMPETITOR", "Competitor"],
      ["NO_BUDGET", "No budget"],
      ["NO_RESPONSE", "No response"],
      ["OTHER", "Other"],
    ]),
  },
  "crm-configuration/lead-statuses": {
    title: "Lead Statuses",
    description:
      "Workspace lead status values from the CRM LeadStatus enum. The mortgage Kanban uses pipeline stages; this list is what Nest stores on the lead record.",
    nestEnum: "LeadStatus",
    appliesTo: "Leads",
    moduleHref: "/sales/leads",
    moduleLabel: "Open Leads",
    values: rows([
      ["NEW", "New"],
      ["CONTACTED", "Contacted"],
      ["QUALIFIED", "Qualified"],
      ["UNQUALIFIED", "Unqualified"],
      ["CONVERTED", "Converted"],
      ["OPEN", "Open"],
      ["IN_PROGRESS", "In progress"],
      ["NURTURE", "Nurture"],
      ["LOST", "Lost"],
    ]),
  },
  "crm-configuration/deal-stages": {
    title: "Deal Stages",
    description:
      "Deal pipeline stages from the CRM DealStage enum. Closed Lost also requires a lost reason.",
    nestEnum: "DealStage",
    appliesTo: "Deals",
    moduleHref: "/sales/deals",
    moduleLabel: "Open Deals",
    values: rows([
      ["PROSPECTING", "Prospecting"],
      ["QUALIFICATION", "Qualification"],
      ["PROPOSAL", "Proposal"],
      ["NEGOTIATION", "Negotiation"],
      ["CONTRACT_SENT", "Contract sent"],
      ["CLOSED_WON", "Closed won"],
      ["CLOSED_LOST", "Closed lost"],
    ]),
  },
  "crm-configuration/lead-sources": {
    title: "Lead Sources",
    description:
      "How a lead entered the workspace. Nest stores LeadSource; the sales UI maps marketing labels onto this list.",
    nestEnum: "LeadSource",
    appliesTo: "Leads",
    moduleHref: "/sales/leads",
    moduleLabel: "Open Leads",
    values: rows([
      ["WEBSITE", "Website"],
      ["REFERRAL", "Referral"],
      ["COLD_CALL", "Cold call"],
      ["SOCIAL_MEDIA", "Social media"],
      ["EMAIL_CAMPAIGN", "Email campaign"],
      ["PAID_AD", "Paid ad"],
      ["EVENT", "Event"],
      ["PARTNER", "Partner"],
      ["OTHER", "Other"],
    ]),
  },
};
