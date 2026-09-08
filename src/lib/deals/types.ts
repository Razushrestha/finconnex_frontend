/** SRS §6.4 Deals: default stages + industry pipeline variants */

export const DEAL_STAGES = [
  "Prospecting",
  "Qualification",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;
export type DealStageTitle = (typeof DEAL_STAGES)[number];

export const DEAL_CURRENCIES = ["AUD", "USD", "NZD", "GBP", "EUR"] as const;
export type DealCurrency = (typeof DEAL_CURRENCIES)[number];

export interface DealLocation {
  deal: DealRecord;
  stage: DealStage;
  pipeline: DealPipeline;
}

export const LOST_REASONS = [
  "Price",
  "Feature",
  "Competitor",
  "No Budget",
  "No Response",
  "Other",
] as const;


export const DEAL_PIPELINES = [
  "Deals",
  "Refinance",
  "Commercial",
  "Insurance",
] as const;
export type DealPipeline = (typeof DEAL_PIPELINES)[number];

export interface DealRecord {
  id: string;
  name: string;
  initials: string;
  account: string;
  contact?: string;
  /** Stable link to ContactCardData.id when set. */
  contactId?: string;
  value: string;
  currency: DealCurrency;
  probability: number;
  owner: string;
  closeDate: string;
  tags?: string[];
  accentColorClass: string;
  avatarBgClass: string;
}

export interface DealStage {
  id: string;
  title: string;
  dotColorClass: string;
  visible?: boolean;
  deals: DealRecord[];
}

export function findDealById(id: string): DealLocation | undefined {
  for (const pipeline of DEAL_PIPELINES) {
    for (const stage of DEAL_PIPELINE_STAGES[pipeline]) {
      const deal = stage.deals.find((d) => d.id === id);
      if (deal) return { deal, stage, pipeline };
    }
  }
  return undefined;
}

export const DEAL_PIPELINE_STAGES: Record<DealPipeline, DealStage[]> = {
  Deals: [
    {
      id: "prospecting",
      title: "Prospecting",
      dotColorClass: "bg-sky-500",
      deals: [],
    },
    {
      id: "qualification",
      title: "Qualification",
      dotColorClass: "bg-amber-400",
      deals: [],
    },
    {
      id: "proposal",
      title: "Proposal",
      dotColorClass: "bg-blue-600",
      deals: [],
    },
    {
      id: "negotiation",
      title: "Negotiation",
      dotColorClass: "bg-violet-500",
      deals: [],
    },
    {
      id: "closed-won",
      title: "Closed Won",
      dotColorClass: "bg-emerald-500",
      deals: [],
    },
    {
      id: "closed-lost",
      title: "Closed Lost",
      dotColorClass: "bg-rose-500",
      deals: [],
    },
  ],
  Refinance: [
    {
      id: "application",
      title: "Application",
      dotColorClass: "bg-amber-400",
      deals: [],
    },
    {
      id: "underwriting",
      title: "Underwriting",
      dotColorClass: "bg-blue-600",
      deals: [],
    },
    {
      id: "approval",
      title: "Approval",
      dotColorClass: "bg-violet-500",
      deals: [],
    },
    {
      id: "funded",
      title: "Funded",
      dotColorClass: "bg-emerald-500",
      deals: [],
    },
  ],
  Commercial: [
    {
      id: "discovery",
      title: "Discovery",
      dotColorClass: "bg-amber-400",
      deals: [],
    },
    {
      id: "due-diligence",
      title: "Due Diligence",
      dotColorClass: "bg-blue-600",
      deals: [],
    },
    {
      id: "contract",
      title: "Contract",
      dotColorClass: "bg-violet-500",
      deals: [],
    },
    {
      id: "closed",
      title: "Closed",
      dotColorClass: "bg-emerald-500",
      deals: [],
    },
  ],
  Insurance: [
    {
      id: "quote",
      title: "Quote",
      dotColorClass: "bg-amber-400",
      deals: [],
    },
    {
      id: "underwriting-review",
      title: "Underwriting",
      dotColorClass: "bg-blue-600",
      deals: [],
    },
    {
      id: "bound",
      title: "Bound",
      dotColorClass: "bg-violet-500",
      deals: [],
    },
    {
      id: "renewed",
      title: "Renewed",
      dotColorClass: "bg-emerald-500",
      deals: [],
    },
  ],
};
