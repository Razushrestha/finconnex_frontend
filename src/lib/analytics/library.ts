export const ANALYTICS_SECTION_IDS = [
  "business",
  "leads",
  "deals",
  "marketing",
  "activity",
  "team",
  "revenue",
  "operations",
  "customers",
  "forecast",
] as const;

export type AnalyticsSectionId = (typeof ANALYTICS_SECTION_IDS)[number];

export type AnalyticsSection = {
  id: AnalyticsSectionId;
  name: string;
  description: string;
  icon: string;
};

export const ANALYTICS_SECTIONS: AnalyticsSection[] = [
  {
    id: "business",
    name: "Business Analytics",
    description: "Overall growth, KPIs, revenue, settlements, conversion and business trends.",
    icon: "building",
  },
  {
    id: "leads",
    name: "Lead Analytics",
    description: "Lead quality, sources, response time, conversion, ageing and lost reasons.",
    icon: "users",
  },
  {
    id: "deals",
    name: "Deal & Pipeline Analytics",
    description: "Pipeline movement, stage conversion, velocity, ageing, win/loss and bottlenecks.",
    icon: "handshake",
  },
  {
    id: "marketing",
    name: "Marketing Analytics",
    description: "Campaign/source performance, CPL, conversion, revenue and ROI.",
    icon: "megaphone",
  },
  {
    id: "activity",
    name: "Activity Analytics",
    description: "Calls, emails, tasks, meetings, follow-ups and activity → conversion.",
    icon: "zap",
  },
  {
    id: "team",
    name: "Team Analytics",
    description: "Individual/team productivity, conversion, settlements, revenue and target performance.",
    icon: "trophy",
  },
  {
    id: "revenue",
    name: "Revenue Analytics",
    description: "Revenue trends, revenue by service, owner, source, customer and financial growth.",
    icon: "wallet",
  },
  {
    id: "operations",
    name: "Operations Analytics",
    description: "Processing time, document turnaround, approval time, settlement time, SLA and bottlenecks.",
    icon: "file",
  },
  {
    id: "customers",
    name: "Customer Analytics",
    description: "Customer acquisition, engagement, conversion, retention, repeat business and customer value.",
    icon: "user",
  },
  {
    id: "forecast",
    name: "Forecast & AI Insights",
    description: "Forecasted settlements, revenue predictions, pipeline risk, anomalies, bottleneck detection and AI-generated business insights.",
    icon: "sparkles",
  },
];

export function isAnalyticsSectionId(value: string): value is AnalyticsSectionId {
  return ANALYTICS_SECTION_IDS.includes(value as AnalyticsSectionId);
}

export function analyticsSectionById(id: string) {
  return ANALYTICS_SECTIONS.find((section) => section.id === id) ?? null;
}
