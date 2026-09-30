import { ensureCrmSession } from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import type { AnalyticsSectionId } from "@/lib/analytics/library";
import type { SectionPageModel } from "@/lib/analytics/section-page";
import { formatCurrency, type DashboardDateRange } from "@/lib/dashboard/layout";
import {
  formatBenchmark,
  LOWER_IS_BETTER,
  type AnalyticsKpi,
  type AnalyticsPeriod,
  type AnalyticsSnapshot,
  type OwnerSlice,
  type RevenuePoint,
  type SourceSlice,
  type TopUserRow,
} from "@/lib/analytics/types";

export const ANALYTICS_WIDGETS = [
  "LEAD_CONVERSION_RATE",
  "DEAL_WIN_RATE",
  "AVERAGE_DEAL_SIZE",
  "SALES_CYCLE_LENGTH",
  "PIPELINE_VELOCITY",
  "REVENUE_BY_SOURCE",
  "REVENUE_BY_OWNER",
  "REVENUE_BY_MONTH",
  "TOP_PERFORMING_USERS",
  "ACTIVITIES_COMPLETED",
  "TASKS_OVERDUE_RATE",
  "EMAIL_OPEN_RATE",
  "CAMPAIGN_ROI",
  "SUPPORT_TICKET_RESOLUTION_TIME",
  "CUSTOMER_SATISFACTION_SCORE",
] as const;

export type AnalyticsWidgetId = (typeof ANALYTICS_WIDGETS)[number];

type PeriodValue = {
  startDate: string;
  endDate: string;
  value: unknown;
};

export type AnalyticsWidgetResponse = {
  widget: AnalyticsWidgetId | string;
  period: PeriodValue;
  comparison?: PeriodValue;
};

const KPI_WIDGET: Record<string, AnalyticsWidgetId> = {
  leadConv: "LEAD_CONVERSION_RATE",
  winRate: "DEAL_WIN_RATE",
  avgDeal: "AVERAGE_DEAL_SIZE",
  cycle: "SALES_CYCLE_LENGTH",
  velocity: "PIPELINE_VELOCITY",
  activities: "ACTIVITIES_COMPLETED",
  overdue: "TASKS_OVERDUE_RATE",
  emailOpen: "EMAIL_OPEN_RATE",
  campaignRoi: "CAMPAIGN_ROI",
  ticketTime: "SUPPORT_TICKET_RESOLUTION_TIME",
  csat: "CUSTOMER_SATISFACTION_SCORE",
};

export function analyticsPeriodRange(period: AnalyticsPeriod): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date();
  if (period === "7d") start.setDate(end.getDate() - 7);
  else if (period === "30d") start.setDate(end.getDate() - 30);
  else if (period === "quarter") start.setMonth(end.getMonth() - 3);
  else start.setFullYear(end.getFullYear() - 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? (value.filter((row) => row && typeof row === "object") as Record<
        string,
        unknown
      >[])
    : [];
}

function shortId(id: unknown): string {
  const s = typeof id === "string" ? id : String(id ?? "");
  if (s.length <= 12) return s || "Unknown";
  return `${s.slice(0, 8)}…`;
}

function monthLabel(raw: unknown): string {
  const s = String(raw ?? "");
  const match = s.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return d.toLocaleString("en-AU", { month: "short" });
  }
  return s || "—";
}

export function dashboardRangeToAnalyticsPeriod(
  range: DashboardDateRange,
): AnalyticsPeriod {
  if (
    range === "7d" ||
    range === "today" ||
    range === "yesterday" ||
    range === "this-week"
  ) {
    return "7d";
  }
  if (
    range === "30d" ||
    range === "this-month" ||
    range === "last-month" ||
    range === "last-week" ||
    range === "month"
  ) {
    return "30d";
  }
  if (
    range === "90d" ||
    range === "this-quarter" ||
    range === "last-quarter"
  ) {
    return "quarter";
  }
  return "year";
}

async function fetchOneAnalyticsWidget(
  path: string,
): Promise<AnalyticsWidgetResponse | null> {
  try {
    return await crmBffFetch<AnalyticsWidgetResponse>(path);
  } catch {
    const session = await ensureCrmSession();
    if (!session) return null;
    try {
      return await crmFetch<AnalyticsWidgetResponse>(session, path);
    } catch {
      return null;
    }
  }
}

export async function fetchAnalyticsWidgets(opts: {
  period: AnalyticsPeriod;
  compare: boolean;
}): Promise<Map<string, AnalyticsWidgetResponse>> {
  const range = analyticsPeriodRange(opts.period);
  const results = await Promise.allSettled(
    ANALYTICS_WIDGETS.map(async (widget) => {
      const params = new URLSearchParams({
        widget,
        startDate: range.startDate,
        endDate: range.endDate,
      });
      if (opts.compare) params.set("comparePeriod", "previous_period");
      return fetchOneAnalyticsWidget(`/v1/analytics?${params.toString()}`);
    }),
  );

  const map = new Map<string, AnalyticsWidgetResponse>();
  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value?.widget) continue;
    map.set(result.value.widget, result.value);
  }
  return map;
}

function overlayKpi(
  kpi: AnalyticsKpi,
  widgets: Map<string, AnalyticsWidgetResponse>,
): AnalyticsKpi {
  const key = KPI_WIDGET[kpi.id];
  if (!key) return kpi;
  const widget = widgets.get(key);
  if (!widget) return kpi;
  const n = toNum(widget.period.value);
  if (n == null) return kpi;

  const prev = widget.comparison ? toNum(widget.comparison.value) : null;
  let delta = kpi.delta;
  let deltaPositive = kpi.deltaPositive;
  if (prev != null) {
    const diff = n - prev;
    const lower = LOWER_IS_BETTER.has(kpi.id);
    deltaPositive = lower ? n <= prev : n >= prev;
    if (prev !== 0) {
      const pct = (diff / Math.abs(prev)) * 100;
      delta = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
    } else {
      delta = diff === 0 ? "0" : `${diff >= 0 ? "+" : ""}${diff}`;
    }
  }

  return {
    ...kpi,
    numericValue: n,
    value: formatBenchmark({ ...kpi, numericValue: n }, n),
    delta,
    deltaPositive,
  };
}

function overlayMonth(
  mock: RevenuePoint[],
  widgets: Map<string, AnalyticsWidgetResponse>,
): RevenuePoint[] {
  const rows = asList(widgets.get("REVENUE_BY_MONTH")?.period.value);
  if (!rows.length) return mock;
  return rows.map((row, i) => ({
    month: monthLabel(row.month),
    revenue: toNum(row.revenue) ?? 0,
    target: mock[i]?.target ?? 0,
    prior: toNum(row.prior) ?? mock[i]?.prior,
  }));
}

function overlaySource(
  mock: SourceSlice[],
  widgets: Map<string, AnalyticsWidgetResponse>,
): SourceSlice[] {
  const rows = asList(widgets.get("REVENUE_BY_SOURCE")?.period.value);
  if (!rows.length) return mock;
  return rows.map((row) => ({
    name: String(row.source ?? row.name ?? "Other"),
    value: toNum(row.revenue) ?? toNum(row.value) ?? 0,
  }));
}

function overlayOwner(
  mock: OwnerSlice[],
  widgets: Map<string, AnalyticsWidgetResponse>,
): OwnerSlice[] {
  const rows = asList(widgets.get("REVENUE_BY_OWNER")?.period.value);
  if (!rows.length) return mock;
  return rows.map((row) => ({
    name: String(row.owner ?? row.name ?? shortId(row.ownerId)),
    revenue: toNum(row.revenue) ?? 0,
  }));
}

function overlayTopUsers(
  mock: TopUserRow[],
  widgets: Map<string, AnalyticsWidgetResponse>,
): TopUserRow[] {
  const rows = asList(widgets.get("TOP_PERFORMING_USERS")?.period.value);
  if (!rows.length) return mock;
  return rows.map((row) => ({
    name: String(row.owner ?? row.name ?? shortId(row.ownerId)),
    dealsWon: toNum(row.wonDeals) ?? toNum(row.dealsWon) ?? 0,
    revenue: toNum(row.revenue) ?? 0,
    activities: toNum(row.activities) ?? 0,
    href: "/settings/users-and-access/users",
  }));
}

export function overlayAnalyticsSnapshot(
  base: AnalyticsSnapshot,
  widgets: Map<string, AnalyticsWidgetResponse>,
): AnalyticsSnapshot {
  if (widgets.size === 0) return base;
  const csatWidget = widgets.get("CUSTOMER_SATISFACTION_SCORE");
  const csat = toNum(csatWidget?.period.value) ?? base.csat;
  return {
    ...base,
    kpis: base.kpis.map((kpi) => overlayKpi(kpi, widgets)),
    revenueByMonth: overlayMonth(base.revenueByMonth, widgets),
    revenueBySource: overlaySource(base.revenueBySource, widgets),
    revenueByOwner: overlayOwner(base.revenueByOwner, widgets),
    topUsers: overlayTopUsers(base.topUsers, widgets),
    csat,
  };
}

export const SECTION_WIDGET_KPIS: Record<
  AnalyticsSectionId,
  Record<string, AnalyticsWidgetId>
> = {
  business: {
    conversion: "LEAD_CONVERSION_RATE",
    win: "DEAL_WIN_RATE",
    revenue: "AVERAGE_DEAL_SIZE",
  },
  leads: { rate: "LEAD_CONVERSION_RATE" },
  deals: {
    win: "DEAL_WIN_RATE",
    cycle: "SALES_CYCLE_LENGTH",
    pipe: "PIPELINE_VELOCITY",
  },
  marketing: { conv: "CAMPAIGN_ROI" },
  activity: {
    total: "ACTIVITIES_COMPLETED",
    sla: "TASKS_OVERDUE_RATE",
  },
  team: { activities: "ACTIVITIES_COMPLETED" },
  revenue: {
    conversion: "LEAD_CONVERSION_RATE",
    win: "DEAL_WIN_RATE",
    revenue: "AVERAGE_DEAL_SIZE",
  },
  operations: { overdue: "SUPPORT_TICKET_RESOLUTION_TIME" },
  customers: { retention: "CUSTOMER_SATISFACTION_SCORE" },
  forecast: { weighted: "PIPELINE_VELOCITY" },
};

function formatOverlayValue(existing: string, n: number, points?: boolean) {
  if (points || existing.includes("%")) return `${Math.round(n * 10) / 10}%`;
  if (existing.startsWith("$")) return formatCurrency(n);
  return String(Math.round(n * 10) / 10);
}

export function overlaySectionPage(
  sectionId: AnalyticsSectionId,
  base: SectionPageModel,
  widgets: Map<string, AnalyticsWidgetResponse>,
): SectionPageModel {
  if (widgets.size === 0) return base;
  const map = SECTION_WIDGET_KPIS[sectionId];
  const kpis = base.kpis.map((kpi) => {
    const widgetId = map[kpi.id];
    if (!widgetId) return kpi;
    const widget = widgets.get(widgetId);
    if (!widget) return kpi;
    const n = toNum(widget.period.value);
    if (n == null) return kpi;
    const prev = widget.comparison ? toNum(widget.comparison.value) : null;
    let delta = kpi.delta;
    let previous = kpi.previous;
    if (prev != null) {
      previous = formatOverlayValue(kpi.previous, prev, kpi.points);
      if (!prev) delta = n ? 100 : 0;
      else delta = Math.round(((n - prev) / Math.abs(prev)) * 1000) / 10;
    }
    return {
      ...kpi,
      value: formatOverlayValue(kpi.value, n, kpi.points),
      delta,
      previous,
    };
  });

  let trend = base.trend;
  const months = overlayMonth(
    base.trend.map((row) => ({ month: row.label, revenue: row.primary, target: 0 })),
    widgets,
  );
  if (widgets.get("REVENUE_BY_MONTH") && months.length) {
    trend = months.map((row, i) => ({
      label: row.month,
      primary: row.revenue,
      secondary: base.trend[i]?.secondary ?? 0,
    }));
  }

  let slices = base.slices;
  const sources = overlaySource(
    base.slices.map((row) => ({ name: row.name, value: row.value })),
    widgets,
  );
  if (widgets.get("REVENUE_BY_SOURCE") && sources.length) {
    slices = sources.map((row) => ({ name: row.name, value: row.value }));
  }

  let list = base.list;
  const owners = overlayOwner(
    base.list.map((row) => ({ name: row.name, revenue: 0 })),
    widgets,
  );
  if (widgets.get("REVENUE_BY_OWNER") && owners.length) {
    const max = Math.max(1, ...owners.map((row) => row.revenue));
    list = owners.map((row) => ({
      name: row.name,
      detail: formatCurrency(row.revenue),
      bar: (row.revenue / max) * 100,
    }));
  }
  const top = overlayTopUsers([], widgets);
  if (widgets.get("TOP_PERFORMING_USERS") && top.length && sectionId === "team") {
    const max = Math.max(1, ...top.map((row) => row.revenue || row.activities));
    list = top.map((row) => ({
      name: row.name,
      detail: `${row.dealsWon} won · ${formatCurrency(row.revenue)}`,
      bar: ((row.revenue || row.activities) / max) * 100,
    }));
  }

  return {
    ...base,
    kpis,
    trend,
    slices,
    sliceTotal: slices.reduce((n, row) => n + row.value, 0) || base.sliceTotal,
    list,
  };
}

