import type { DashboardDateRange } from "@/lib/dashboard/layout";

export const REPORT_CATEGORY_IDS = [
  "leads",
  "deals",
  "pipeline",
  "activity",
  "documents",
  "marketing",
  "finance",
  "team",
  "contacts",
  "executive",
] as const;

export type ReportCategoryId = (typeof REPORT_CATEGORY_IDS)[number];

export const REPORT_FILTER_IDS = [
  "dateRange",
  "owner",
  "team",
  "status",
  "source",
  "loanType",
  "loanPurpose",
  "stage",
  "campaign",
] as const;

export type ReportFilterId = (typeof REPORT_FILTER_IDS)[number];

export type ReportChartType = "bar" | "line" | "pie" | "funnel";

export type ReportColumnKind = "text" | "number" | "money" | "percent" | "date" | "badge";

export type ReportColumn = {
  id: string;
  label: string;
  kind?: ReportColumnKind;
  align?: "left" | "right";
};

export type ReportDef = {
  id: string;
  category: ReportCategoryId;
  name: string;
  purpose: string;
  filters: ReportFilterId[];
  columns: ReportColumn[];
  groupBy?: { id: string; label: string }[];
  chart?: { type: ReportChartType; x: string; y: string; title?: string };
  permission?: "reports.all";
};

export type ReportCategory = {
  id: ReportCategoryId;
  name: string;
  description: string;
  icon: string;
};

export type LibraryFilters = {
  dateRange: DashboardDateRange;
  owner: string;
  team: string;
  status: string;
  source: string;
  loanType: string;
  loanPurpose: string;
  stage: string;
  campaign: string;
  search: string;
  groupBy?: string;
};

export type ReportKpi = {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
};

export type ReportCell = string | number | null;

export type ReportRow = {
  id: string;
  cells: Record<string, ReportCell>;
};

export type ReportChartPoint = {
  name: string;
  value: number;
  secondary?: number;
};

export type ReportResult = {
  kpis: ReportKpi[];
  rows: ReportRow[];
  chart?: {
    type: ReportChartType;
    title?: string;
    points: ReportChartPoint[];
  };
  emptyReason?: string;
};

export type SavedReportView = {
  id: string;
  reportId: string;
  name: string;
  filters: LibraryFilters;
  createdAt: string;
};

export type ScheduledLibraryReport = {
  id: string;
  reportId: string;
  cadence: "Daily" | "Weekly" | "Monthly";
  createdAt: string;
};

export type ReportFolder = {
  id: string;
  name: string;
  reportIds: string[];
  createdAt: string;
};

export function defaultLibraryFilters(): LibraryFilters {
  return {
    dateRange: "all",
    owner: "All",
    team: "All teams",
    status: "All",
    source: "All",
    loanType: "All Loan Types",
    loanPurpose: "All",
    stage: "All",
    campaign: "All",
    search: "",
  };
}
