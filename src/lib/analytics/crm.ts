import { ensureCrmSession } from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
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

export async function fetchAnalyticsWidgets(opts: {
  period: AnalyticsPeriod;
  compare: boolean;
}): Promise<Map<string, AnalyticsWidgetResponse>> {
  const session = await ensureCrmSession();
  if (!session) return new Map();

  const range = analyticsPeriodRange(opts.period);
  const results = await Promise.allSettled(
    ANALYTICS_WIDGETS.map((widget) => {
      const params = new URLSearchParams({
        widget,
        startDate: range.startDate,
        endDate: range.endDate,
      });
      if (opts.compare) params.set("comparePeriod", "previous_period");
      return crmFetch<AnalyticsWidgetResponse>(
        session,
        `/v1/analytics?${params.toString()}`,
      );
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
    href: "/team",
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
