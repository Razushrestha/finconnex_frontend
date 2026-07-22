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
  company: string;
  value: string;
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

export const DEAL_PIPELINE_STAGES: Record<DealPipeline, DealStage[]> = {
  Deals: [
    {
      id: "qualification",
      title: "Qualification",
      dotColorClass: "bg-amber-400",
      deals: [
        {
          id: "d-1",
          name: "Atlas Manufacturing",
          initials: "AM",
          company: "Atlas Manufacturing Co.",
          value: "$4,20,000",
          closeDate: "Aug 14, 2026",
          accentColorClass: "bg-amber-500",
          avatarBgClass: "bg-amber-50 text-amber-600",
        },
        {
          id: "d-2",
          name: "Bramwell Group",
          initials: "BG",
          company: "Bramwell Group Ltd.",
          value: "$1,85,000",
          closeDate: "Aug 22, 2026",
          accentColorClass: "bg-amber-500",
          avatarBgClass: "bg-pink-50 text-pink-600",
        },
      ],
    },
    {
      id: "proposal",
      title: "Proposal",
      dotColorClass: "bg-blue-600",
      deals: [
        {
          id: "d-3",
          name: "Cedarline Foods",
          initials: "CF",
          company: "Cedarline Foods Inc.",
          value: "$3,10,000",
          closeDate: "Sep 2, 2026",
          accentColorClass: "bg-blue-600",
          avatarBgClass: "bg-blue-50 text-blue-600",
        },
        {
          id: "d-4",
          name: "Driftwood Retail",
          initials: "DR",
          company: "Driftwood Retail Group",
          value: "$2,45,000",
          closeDate: "Sep 9, 2026",
          accentColorClass: "bg-blue-600",
          avatarBgClass: "bg-indigo-50 text-indigo-600",
        },
      ],
    },
    {
      id: "negotiation",
      title: "Negotiation",
      dotColorClass: "bg-violet-500",
      deals: [
        {
          id: "d-5",
          name: "Everton Freight",
          initials: "EF",
          company: "Everton Freight Ltd.",
          value: "$5,60,000",
          closeDate: "Aug 30, 2026",
          accentColorClass: "bg-violet-500",
          avatarBgClass: "bg-violet-50 text-violet-600",
        },
        {
          id: "d-6",
          name: "Fenwick Labs",
          initials: "FL",
          company: "Fenwick Labs",
          value: "$2,95,000",
          closeDate: "Sep 18, 2026",
          accentColorClass: "bg-violet-500",
          avatarBgClass: "bg-cyan-50 text-cyan-600",
        },
      ],
    },
    {
      id: "closed-won",
      title: "Closed Won",
      dotColorClass: "bg-emerald-500",
      deals: [
        {
          id: "d-7",
          name: "Greystone Realty",
          initials: "GR",
          company: "Greystone Realty Partners",
          value: "$6,20,000",
          closeDate: "Jul 28, 2026",
          accentColorClass: "bg-emerald-500",
          avatarBgClass: "bg-emerald-50 text-emerald-600",
        },
        {
          id: "d-8",
          name: "Hallmark Textiles",
          initials: "HT",
          company: "Hallmark Textiles Co.",
          value: "$1,40,000",
          closeDate: "Jul 15, 2026",
          accentColorClass: "bg-emerald-500",
          avatarBgClass: "bg-teal-50 text-teal-600",
        },
      ],
    },
  ],
  Refinance: [
    {
      id: "application",
      title: "Application",
      dotColorClass: "bg-amber-400",
      deals: [
        {
          id: "r-1",
          name: "Ivy Holdings",
          initials: "IH",
          company: "Ivy Holdings LLC",
          value: "$3,80,000",
          closeDate: "Aug 20, 2026",
          accentColorClass: "bg-amber-500",
          avatarBgClass: "bg-amber-50 text-amber-600",
        },
      ],
    },
    {
      id: "underwriting",
      title: "Underwriting",
      dotColorClass: "bg-blue-600",
      deals: [
        {
          id: "r-2",
          name: "Juniper Estates",
          initials: "JE",
          company: "Juniper Estates",
          value: "$2,10,000",
          closeDate: "Sep 5, 2026",
          accentColorClass: "bg-blue-600",
          avatarBgClass: "bg-blue-50 text-blue-600",
        },
      ],
    },
    {
      id: "approval",
      title: "Approval",
      dotColorClass: "bg-violet-500",
      deals: [
        {
          id: "r-3",
          name: "Kensworth Homes",
          initials: "KH",
          company: "Kensworth Homes",
          value: "$4,50,000",
          closeDate: "Aug 26, 2026",
          accentColorClass: "bg-violet-500",
          avatarBgClass: "bg-violet-50 text-violet-600",
        },
      ],
    },
    {
      id: "funded",
      title: "Funded",
      dotColorClass: "bg-emerald-500",
      deals: [
        {
          id: "r-4",
          name: "Lockhart Properties",
          initials: "LP",
          company: "Lockhart Properties",
          value: "$5,05,000",
          closeDate: "Jul 30, 2026",
          accentColorClass: "bg-emerald-500",
          avatarBgClass: "bg-emerald-50 text-emerald-600",
        },
      ],
    },
  ],
  Commercial: [
    {
      id: "discovery",
      title: "Discovery",
      dotColorClass: "bg-amber-400",
      deals: [
        {
          id: "c-1",
          name: "Meridian Logistics",
          initials: "ML",
          company: "Meridian Logistics Inc.",
          value: "$9,20,000",
          closeDate: "Oct 4, 2026",
          accentColorClass: "bg-amber-500",
          avatarBgClass: "bg-amber-50 text-amber-600",
        },
      ],
    },
    {
      id: "due-diligence",
      title: "Due Diligence",
      dotColorClass: "bg-blue-600",
      deals: [
        {
          id: "c-2",
          name: "Northgate Industrial",
          initials: "NI",
          company: "Northgate Industrial Park",
          value: "$7,60,000",
          closeDate: "Sep 22, 2026",
          accentColorClass: "bg-blue-600",
          avatarBgClass: "bg-blue-50 text-blue-600",
        },
      ],
    },
    {
      id: "contract",
      title: "Contract",
      dotColorClass: "bg-violet-500",
      deals: [
        {
          id: "c-3",
          name: "Oakridge Ventures",
          initials: "OV",
          company: "Oakridge Ventures",
          value: "$4,90,000",
          closeDate: "Sep 12, 2026",
          accentColorClass: "bg-violet-500",
          avatarBgClass: "bg-violet-50 text-violet-600",
        },
      ],
    },
    {
      id: "closed",
      title: "Closed",
      dotColorClass: "bg-emerald-500",
      deals: [
        {
          id: "c-4",
          name: "Pinehurst Capital",
          initials: "PC",
          company: "Pinehurst Capital Group",
          value: "$12,40,000",
          closeDate: "Jul 20, 2026",
          accentColorClass: "bg-emerald-500",
          avatarBgClass: "bg-emerald-50 text-emerald-600",
        },
      ],
    },
  ],
  Insurance: [
    {
      id: "quote",
      title: "Quote",
      dotColorClass: "bg-amber-400",
      deals: [
        {
          id: "i-1",
          name: "Quarrymill Estate",
          initials: "QE",
          company: "Quarrymill Estate Holdings",
          value: "$85,000",
          closeDate: "Aug 12, 2026",
          accentColorClass: "bg-amber-500",
          avatarBgClass: "bg-amber-50 text-amber-600",
        },
      ],
    },
    {
      id: "underwriting-review",
      title: "Underwriting",
      dotColorClass: "bg-blue-600",
      deals: [
        {
          id: "i-2",
          name: "Redwood Family Trust",
          initials: "RF",
          company: "Redwood Family Trust",
          value: "$1,10,000",
          closeDate: "Aug 28, 2026",
          accentColorClass: "bg-blue-600",
          avatarBgClass: "bg-blue-50 text-blue-600",
        },
      ],
    },
    {
      id: "bound",
      title: "Bound",
      dotColorClass: "bg-violet-500",
      deals: [
        {
          id: "i-3",
          name: "Sutcliffe & Co.",
          initials: "SC",
          company: "Sutcliffe & Co.",
          value: "$65,000",
          closeDate: "Jul 25, 2026",
          accentColorClass: "bg-violet-500",
          avatarBgClass: "bg-violet-50 text-violet-600",
        },
      ],
    },
    {
      id: "renewed",
      title: "Renewed",
      dotColorClass: "bg-emerald-500",
      deals: [
        {
          id: "i-4",
          name: "Thistledown Farms",
          initials: "TF",
          company: "Thistledown Farms",
          value: "$92,000",
          closeDate: "Jul 10, 2026",
          accentColorClass: "bg-emerald-500",
          avatarBgClass: "bg-emerald-50 text-emerald-600",
        },
      ],
    },
  ],
};
