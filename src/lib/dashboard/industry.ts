/** Industry widgets follow Settings → CRM → Industry Preset (Section 3). */

import { loadSettingsValues } from "@/lib/settings/settings-store";
import { formatCurrency, type DashboardLiveStats } from "@/lib/dashboard/layout";

export const INDUSTRY_PRESETS = [
  "mortgage",
  "accounting",
  "real-estate",
  "legal",
  "insurance",
  "recruitment",
  "education",
  "trades",
  "agency",
  "custom",
] as const;

export type IndustryPreset = (typeof INDUSTRY_PRESETS)[number];

export type DashboardIndustryTile = {
  label: string;
  value: string;
  /** True when no FinConnex route exists for this KPI. */
  missingApi?: boolean;
};

export function loadIndustryPreset(): IndustryPreset {
  const values = loadSettingsValues("crm-configuration/industry-preset");
  const raw = String(values.preset ?? "mortgage");
  return (INDUSTRY_PRESETS as readonly string[]).includes(raw)
    ? (raw as IndustryPreset)
    : "mortgage";
}

export function industryPresetLabel(preset: IndustryPreset): string {
  switch (preset) {
    case "mortgage":
      return "Mortgage / Finance";
    case "accounting":
      return "Accounting";
    case "real-estate":
      return "Real Estate";
    case "legal":
      return "Legal";
    case "insurance":
      return "Insurance";
    case "recruitment":
      return "Recruitment";
    case "education":
      return "Migration / Education";
    case "trades":
      return "Trades";
    case "agency":
      return "Agency";
    default:
      return "Custom";
  }
}

export type IndustryExtras = {
  openInvoices?: number | null;
  overdueInvoices?: number | null;
};

function missing(label: string): DashboardIndustryTile {
  return { label, value: "—", missingApi: true };
}

export function industryTiles(
  preset: IndustryPreset,
  stats: DashboardLiveStats,
  extras: IndustryExtras = {},
): DashboardIndustryTile[] {
  switch (preset) {
    case "mortgage":
      return [
        { label: "Settled value", value: formatCurrency(stats.wonDealsValue) },
        { label: "Open pipeline", value: formatCurrency(stats.pipelineValue) },
        {
          label: "Overdue SLAs (task proxy)",
          value: String(stats.overdueTasks),
        },
      ];
    case "accounting":
      return [
        extras.openInvoices != null
          ? { label: "Open invoices", value: String(extras.openInvoices) }
          : missing("Open invoices"),
        extras.overdueInvoices != null
          ? { label: "Overdue invoices", value: String(extras.overdueInvoices) }
          : missing("Overdue invoices"),
        { label: "Won billing", value: formatCurrency(stats.wonDealsValue) },
      ];
    case "real-estate":
      return [
        missing("Active listings"),
        { label: "Open pipeline", value: formatCurrency(stats.pipelineValue) },
        missing("Settled settlements"),
      ];
    case "legal":
      return [
        missing("Open matters"),
        { label: "Open tasks", value: String(stats.openTasks) },
        { label: "Overdue tasks", value: String(stats.overdueTasks) },
      ];
    case "insurance":
      return [
        missing("Open policies"),
        { label: "Pipeline value", value: formatCurrency(stats.pipelineValue) },
        missing("Renewals due"),
      ];
    case "recruitment":
      return [
        missing("Open roles"),
        { label: "Total candidates (contacts)", value: String(stats.totalContacts) },
        missing("Placements this period"),
      ];
    case "education":
      return [
        missing("Open applications"),
        { label: "Total leads", value: String(stats.totalLeads) },
        { label: "Conversion rate", value: `${stats.conversionRate}%` },
      ];
    case "trades":
      return [
        { label: "Jobs today (tasks)", value: String(stats.activitiesToday) },
        { label: "Overdue jobs", value: String(stats.overdueTasks) },
        { label: "Open jobs", value: String(stats.openTasks) },
      ];
    case "agency":
      return [
        { label: "Active clients (companies)", value: String(stats.totalCompanies) },
        { label: "Pipeline value", value: formatCurrency(stats.pipelineValue) },
        { label: "Open tasks", value: String(stats.openTasks) },
      ];
    default:
      return [
        { label: "Pipeline value", value: formatCurrency(stats.pipelineValue) },
        { label: "Won deals", value: formatCurrency(stats.wonDealsValue) },
        { label: "Conversion rate", value: `${stats.conversionRate}%` },
      ];
  }
}
