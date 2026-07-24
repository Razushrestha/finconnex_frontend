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

export const LOST_REASONS = [
  "Price",
  "Feature",
  "Competitor",
  "No Budget",
  "No Response",
  "Other",
] as const;

export const OWNERS = [
  "John Smith",
  "Shiva Kadhka",
  "Tejas Gokhe",
  "Roshna Abraham",
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
  value: string;
  currency: DealCurrency;
  probability: number;
  owner: string;
  closeDate: string;
  accentColorClass: string;
  avatarBgClass: string;
}

export interface DealStage {
  id: string;
  title: string;
  dotColorClass: string;
  deals: DealRecord[];
}

const AVATAR_COLORS = [
  "bg-amber-50 text-amber-600",
  "bg-pink-50 text-pink-600",
  "bg-teal-50 text-teal-600",
  "bg-blue-50 text-blue-600",
  "bg-indigo-50 text-indigo-600",
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-rose-50 text-rose-600",
];

function deal(
  data: Omit<DealRecord, "avatarBgClass"> & { avatarIndex: number },
): DealRecord {
  const { avatarIndex, ...rest } = data;
  return {
    ...rest,
    avatarBgClass: AVATAR_COLORS[avatarIndex % AVATAR_COLORS.length],
  };
}

export const DEAL_PIPELINE_STAGES: Record<DealPipeline, DealStage[]> = {
  Deals: [
    {
      id: "prospecting",
      title: "Prospecting",
      dotColorClass: "bg-sky-500",
      deals: [
        deal({
          id: "d-p1",
          name: "Atlas CRM Rollout",
          initials: "AR",
          account: "Atlas Manufacturing Co.",
          contact: "William Anderson",
          value: "$4,20,000",
          currency: "AUD",
          probability: 10,
          owner: "John Smith",
          closeDate: "Sep 14, 2026",
          accentColorClass: "bg-sky-500",
          avatarIndex: 0,
        }),
        deal({
          id: "d-p2",
          name: "Bramwell Onboarding",
          initials: "BO",
          account: "Bramwell Group Ltd.",
          value: "$1,85,000",
          currency: "AUD",
          probability: 10,
          owner: "Shiva Kadhka",
          closeDate: "Sep 22, 2026",
          accentColorClass: "bg-sky-500",
          avatarIndex: 1,
        }),
      ],
    },
    {
      id: "qualification",
      title: "Qualification",
      dotColorClass: "bg-amber-400",
      deals: [
        deal({
          id: "d-1",
          name: "Cedarline Platform",
          initials: "CP",
          account: "Cedarline Foods Inc.",
          contact: "Chloe Ramirez",
          value: "$3,10,000",
          currency: "AUD",
          probability: 25,
          owner: "Tejas Gokhe",
          closeDate: "Aug 14, 2026",
          accentColorClass: "bg-amber-500",
          avatarIndex: 2,
        }),
        deal({
          id: "d-2",
          name: "Driftwood Suite",
          initials: "DS",
          account: "Driftwood Retail Group",
          value: "$2,45,000",
          currency: "AUD",
          probability: 25,
          owner: "Roshna Abraham",
          closeDate: "Aug 22, 2026",
          accentColorClass: "bg-amber-500",
          avatarIndex: 3,
        }),
      ],
    },
    {
      id: "proposal",
      title: "Proposal",
      dotColorClass: "bg-blue-600",
      deals: [
        deal({
          id: "d-3",
          name: "Everton Freight Deal",
          initials: "EF",
          account: "Everton Freight Ltd.",
          value: "$5,60,000",
          currency: "AUD",
          probability: 50,
          owner: "John Smith",
          closeDate: "Sep 2, 2026",
          accentColorClass: "bg-blue-600",
          avatarIndex: 4,
        }),
        deal({
          id: "d-4",
          name: "Fenwick Labs Expand",
          initials: "FL",
          account: "Fenwick Labs",
          value: "$2,95,000",
          currency: "AUD",
          probability: 50,
          owner: "Shiva Kadhka",
          closeDate: "Sep 9, 2026",
          accentColorClass: "bg-blue-600",
          avatarIndex: 5,
        }),
      ],
    },
    {
      id: "negotiation",
      title: "Negotiation",
      dotColorClass: "bg-violet-500",
      deals: [
        deal({
          id: "d-5",
          name: "Greystone Realty",
          initials: "GR",
          account: "Greystone Realty Partners",
          contact: "Elizabeth Morgan",
          value: "$6,20,000",
          currency: "AUD",
          probability: 75,
          owner: "Tejas Gokhe",
          closeDate: "Aug 30, 2026",
          accentColorClass: "bg-violet-500",
          avatarIndex: 6,
        }),
        deal({
          id: "d-6",
          name: "Hallmark Textiles",
          initials: "HT",
          account: "Hallmark Textiles Co.",
          value: "$1,40,000",
          currency: "AUD",
          probability: 75,
          owner: "Roshna Abraham",
          closeDate: "Sep 18, 2026",
          accentColorClass: "bg-violet-500",
          avatarIndex: 7,
        }),
      ],
    },
    {
      id: "closed-won",
      title: "Closed Won",
      dotColorClass: "bg-emerald-500",
      deals: [
        deal({
          id: "d-7",
          name: "Mitchell Partners Win",
          initials: "MP",
          account: "Mitchell Partners",
          value: "$1,50,000",
          currency: "AUD",
          probability: 100,
          owner: "John Smith",
          closeDate: "Jul 28, 2026",
          accentColorClass: "bg-emerald-500",
          avatarIndex: 0,
        }),
        deal({
          id: "d-8",
          name: "Fabrikam Annual",
          initials: "FA",
          account: "Fabrikam Inc.",
          value: "$4,20,000",
          currency: "AUD",
          probability: 100,
          owner: "Tejas Gokhe",
          closeDate: "Jul 15, 2026",
          accentColorClass: "bg-emerald-500",
          avatarIndex: 1,
        }),
      ],
    },
    {
      id: "closed-lost",
      title: "Closed Lost",
      dotColorClass: "bg-rose-500",
      deals: [
        deal({
          id: "d-9",
          name: "Bright Bay Pilot",
          initials: "BB",
          account: "Bright Bay Co.",
          value: "$90,000",
          currency: "AUD",
          probability: 0,
          owner: "Shiva Kadhka",
          closeDate: "Jul 10, 2026",
          accentColorClass: "bg-rose-500",
          avatarIndex: 2,
        }),
      ],
    },
  ],
  Refinance: [
    {
      id: "application",
      title: "Application",
      dotColorClass: "bg-amber-400",
      deals: [
        deal({
          id: "r-1",
          name: "Ivy Holdings Refi",
          initials: "IH",
          account: "Ivy Holdings LLC",
          value: "$3,80,000",
          currency: "AUD",
          probability: 20,
          owner: "John Smith",
          closeDate: "Aug 20, 2026",
          accentColorClass: "bg-amber-500",
          avatarIndex: 0,
        }),
      ],
    },
    {
      id: "underwriting",
      title: "Underwriting",
      dotColorClass: "bg-blue-600",
      deals: [
        deal({
          id: "r-2",
          name: "Juniper Estates",
          initials: "JE",
          account: "Juniper Estates",
          value: "$2,10,000",
          currency: "AUD",
          probability: 45,
          owner: "Shiva Kadhka",
          closeDate: "Sep 5, 2026",
          accentColorClass: "bg-blue-600",
          avatarIndex: 1,
        }),
      ],
    },
    {
      id: "approval",
      title: "Approval",
      dotColorClass: "bg-violet-500",
      deals: [
        deal({
          id: "r-3",
          name: "Kensworth Homes",
          initials: "KH",
          account: "Kensworth Homes",
          value: "$4,50,000",
          currency: "AUD",
          probability: 70,
          owner: "Tejas Gokhe",
          closeDate: "Aug 26, 2026",
          accentColorClass: "bg-violet-500",
          avatarIndex: 2,
        }),
      ],
    },
    {
      id: "funded",
      title: "Funded",
      dotColorClass: "bg-emerald-500",
      deals: [
        deal({
          id: "r-4",
          name: "Lockhart Properties",
          initials: "LP",
          account: "Lockhart Properties",
          value: "$5,05,000",
          currency: "AUD",
          probability: 100,
          owner: "Roshna Abraham",
          closeDate: "Jul 30, 2026",
          accentColorClass: "bg-emerald-500",
          avatarIndex: 3,
        }),
      ],
    },
  ],
  Commercial: [
    {
      id: "discovery",
      title: "Discovery",
      dotColorClass: "bg-amber-400",
      deals: [
        deal({
          id: "c-1",
          name: "Meridian Logistics",
          initials: "ML",
          account: "Meridian Logistics Inc.",
          value: "$9,20,000",
          currency: "AUD",
          probability: 15,
          owner: "John Smith",
          closeDate: "Oct 4, 2026",
          accentColorClass: "bg-amber-500",
          avatarIndex: 0,
        }),
      ],
    },
    {
      id: "due-diligence",
      title: "Due Diligence",
      dotColorClass: "bg-blue-600",
      deals: [
        deal({
          id: "c-2",
          name: "Northgate Industrial",
          initials: "NI",
          account: "Northgate Industrial Park",
          value: "$7,60,000",
          currency: "AUD",
          probability: 40,
          owner: "Shiva Kadhka",
          closeDate: "Sep 22, 2026",
          accentColorClass: "bg-blue-600",
          avatarIndex: 1,
        }),
      ],
    },
    {
      id: "contract",
      title: "Contract",
      dotColorClass: "bg-violet-500",
      deals: [
        deal({
          id: "c-3",
          name: "Oakridge Ventures",
          initials: "OV",
          account: "Oakridge Ventures",
          value: "$4,90,000",
          currency: "AUD",
          probability: 70,
          owner: "Tejas Gokhe",
          closeDate: "Sep 12, 2026",
          accentColorClass: "bg-violet-500",
          avatarIndex: 2,
        }),
      ],
    },
    {
      id: "closed",
      title: "Closed",
      dotColorClass: "bg-emerald-500",
      deals: [
        deal({
          id: "c-4",
          name: "Pinehurst Capital",
          initials: "PC",
          account: "Pinehurst Capital Group",
          value: "$12,40,000",
          currency: "AUD",
          probability: 100,
          owner: "Roshna Abraham",
          closeDate: "Jul 20, 2026",
          accentColorClass: "bg-emerald-500",
          avatarIndex: 3,
        }),
      ],
    },
  ],
  Insurance: [
    {
      id: "quote",
      title: "Quote",
      dotColorClass: "bg-amber-400",
      deals: [
        deal({
          id: "i-1",
          name: "Quarrymill Estate",
          initials: "QE",
          account: "Quarrymill Estate Holdings",
          value: "$85,000",
          currency: "AUD",
          probability: 20,
          owner: "John Smith",
          closeDate: "Aug 12, 2026",
          accentColorClass: "bg-amber-500",
          avatarIndex: 0,
        }),
      ],
    },
    {
      id: "underwriting-review",
      title: "Underwriting",
      dotColorClass: "bg-blue-600",
      deals: [
        deal({
          id: "i-2",
          name: "Redwood Family Trust",
          initials: "RF",
          account: "Redwood Family Trust",
          value: "$1,10,000",
          currency: "AUD",
          probability: 45,
          owner: "Shiva Kadhka",
          closeDate: "Aug 28, 2026",
          accentColorClass: "bg-blue-600",
          avatarIndex: 1,
        }),
      ],
    },
    {
      id: "bound",
      title: "Bound",
      dotColorClass: "bg-violet-500",
      deals: [
        deal({
          id: "i-3",
          name: "Sutcliffe & Co.",
          initials: "SC",
          account: "Sutcliffe & Co.",
          value: "$65,000",
          currency: "AUD",
          probability: 80,
          owner: "Tejas Gokhe",
          closeDate: "Jul 25, 2026",
          accentColorClass: "bg-violet-500",
          avatarIndex: 2,
        }),
      ],
    },
    {
      id: "renewed",
      title: "Renewed",
      dotColorClass: "bg-emerald-500",
      deals: [
        deal({
          id: "i-4",
          name: "Thistledown Farms",
          initials: "TF",
          account: "Thistledown Farms",
          value: "$92,000",
          currency: "AUD",
          probability: 100,
          owner: "Roshna Abraham",
          closeDate: "Jul 10, 2026",
          accentColorClass: "bg-emerald-500",
          avatarIndex: 3,
        }),
      ],
    },
  ],
};
