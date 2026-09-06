/** Map CRM dashboard metrics + widget payloads onto local dashboard models. */

import type { ExecutiveOverview, RankingRow } from "@/lib/dashboard/executive";
import {
  type DashboardLiveStats,
  type DashboardWidgetId,
} from "@/lib/dashboard/layout";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function unwrapPayload(value: unknown): Record<string, unknown> {
  let cur = value;
  for (let i = 0; i < 4; i++) {
    const rec = asRecord(cur);
    if (!rec) break;
    const nested =
      rec.metrics ??
      rec.stats ??
      rec.overview ??
      rec.kpis ??
      rec.data ??
      rec.result;
    if (nested && nested !== cur && typeof nested === "object" && !Array.isArray(nested)) {
      cur = nested;
      continue;
    }
    break;
  }
  return asRecord(cur) ?? {};
}

function pickNum(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const n = Number(value.replace(/[$,%\s]/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function flatten(rec: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...rec };
  for (const nested of [rec.period, rec.current, rec.totals, rec.summary]) {
    const row = asRecord(nested);
    if (row) Object.assign(out, row);
  }
  return out;
}

function num(rec: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const n = pickNum(rec[key]);
    if (n != null) return n;
  }
  const lower = Object.fromEntries(
    Object.entries(rec).map(([k, v]) => [k.toLowerCase().replace(/[_-]/g, ""), v]),
  );
  for (const key of keys) {
    const n = pickNum(lower[key.toLowerCase().replace(/[_-]/g, "")]);
    if (n != null) return n;
  }
  return undefined;
}

function asSpark(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const pts = value
    .map((item) =>
      typeof item === "number"
        ? item
        : pickNum(
            asRecord(item)?.value,
            asRecord(item)?.count,
            asRecord(item)?.y,
          ),
    )
    .filter((n): n is number => n != null);
  return pts.length ? pts : undefined;
}

function asRankings(value: unknown): RankingRow[] | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const rows: RankingRow[] = [];
  for (const item of value) {
    const rec = asRecord(item);
    if (!rec) continue;
    const name = String(rec.name ?? rec.label ?? rec.source ?? rec.owner ?? "").trim();
    if (!name) continue;
    rows.push({
      name,
      leads: num(rec, ["leads", "leadCount", "count"]) ?? 0,
      deals: num(rec, ["deals", "dealCount"]) ?? 0,
      conversion: num(rec, ["conversion", "conversionRate"]) ?? 0,
      pipeline: num(rec, ["pipeline", "pipelineValue", "value"]) ?? 0,
    });
  }
  return rows.length ? rows : undefined;
}

function asFunnel(
  value: unknown,
): Array<{ label: string; count: number; value: number }> | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const rows: Array<{ label: string; count: number; value: number }> = [];
  for (const item of value) {
    const rec = asRecord(item);
    if (!rec) continue;
    const label = String(rec.label ?? rec.name ?? rec.stage ?? "").trim();
    if (!label) continue;
    rows.push({
      label,
      count: num(rec, ["count", "leads", "total"]) ?? 0,
      value: num(rec, ["value", "pipeline", "amount"]) ?? 0,
    });
  }
  return rows.length ? rows : undefined;
}

function asTrend(
  value: unknown,
): ExecutiveOverview["trend"] | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const rows: ExecutiveOverview["trend"] = [];
  for (const item of value) {
    const rec = asRecord(item);
    if (!rec) continue;
    const label = String(rec.label ?? rec.month ?? rec.period ?? rec.date ?? "").trim();
    if (!label) continue;
    rows.push({
      label,
      leads: num(rec, ["leads", "newLeads"]) ?? 0,
      deals: num(rec, ["deals"]) ?? 0,
      settlements: num(rec, ["settlements", "won", "closedWon"]) ?? 0,
    });
  }
  return rows.length ? rows : undefined;
}

export function metricsRecord(raw: unknown): Record<string, unknown> {
  return flatten(unwrapPayload(raw));
}

export function applyMetricsToStats(
  stats: DashboardLiveStats,
  raw: unknown,
): DashboardLiveStats {
  const rec = metricsRecord(raw);
  if (!Object.keys(rec).length) return stats;
  const next = { ...stats };
  const totalLeads = num(rec, ["totalLeads", "leadCount", "leads"]);
  const totalContacts = num(rec, ["totalContacts", "contactCount", "contacts"]);
  const totalCompanies = num(rec, ["totalCompanies", "companyCount", "companies"]);
  const totalDeals = num(rec, ["totalDeals", "dealCount", "deals"]);
  const pipelineValue = num(rec, [
    "pipelineValue",
    "activePipeline",
    "openPipeline",
  ]);
  const wonDealsValue = num(rec, [
    "wonDealsValue",
    "settlementValue",
    "wonValue",
    "closedWonValue",
  ]);
  const openTasks = num(rec, ["openTasks", "tasksOpen"]);
  const overdueTasks = num(rec, ["overdueTasks", "overdue"]);
  const activitiesToday = num(rec, ["activitiesToday", "todayActivities"]);
  const conversionRate = num(rec, ["conversionRate", "leadToDeal", "conversion"]);
  if (totalLeads != null) next.totalLeads = totalLeads;
  if (totalContacts != null) next.totalContacts = totalContacts;
  if (totalCompanies != null) next.totalCompanies = totalCompanies;
  if (totalDeals != null) next.totalDeals = totalDeals;
  if (pipelineValue != null) next.pipelineValue = pipelineValue;
  if (wonDealsValue != null) next.wonDealsValue = wonDealsValue;
  if (openTasks != null) next.openTasks = openTasks;
  if (overdueTasks != null) next.overdueTasks = overdueTasks;
  if (activitiesToday != null) next.activitiesToday = activitiesToday;
  if (conversionRate != null) {
    next.conversionRate =
      conversionRate <= 1 && conversionRate > 0
        ? Math.round(conversionRate * 1000) / 10
        : conversionRate;
  }
  return next;
}

export function overlayExecutiveOverview(
  base: ExecutiveOverview,
  rawMetrics: unknown,
  widgets: Record<string, unknown> = {},
): ExecutiveOverview {
  const rec = {
    ...metricsRecord(rawMetrics),
    ...metricsRecord(widgets.kpis),
    ...metricsRecord(widgets.metrics),
  };
  const next = { ...base };
  const assign = (key: keyof ExecutiveOverview, keys: string[]) => {
    const n = num(rec, keys);
    if (n != null) (next as Record<string, unknown>)[key] = n;
  };

  assign("newLeads", ["newLeads", "leadsCreated", "leadsThisPeriod"]);
  assign("newLeadsDelta", ["newLeadsDelta", "leadsDelta"]);
  assign("activePipeline", ["activePipeline", "pipelineValue", "openPipeline"]);
  assign("activePipelineDelta", ["activePipelineDelta", "pipelineDelta"]);
  assign("settlements", ["settlements", "closedWon", "wonDeals", "settledCount"]);
  assign("settlementsDelta", ["settlementsDelta"]);
  assign("settlementValue", ["settlementValue", "wonDealsValue", "settledValue"]);
  assign("settlementValueDelta", ["settlementValueDelta"]);
  assign("commission", ["commission", "estimatedCommission"]);
  assign("commissionDelta", ["commissionDelta"]);
  assign("conversionRate", ["conversionRate", "leadToSettle"]);
  assign("conversionDelta", ["conversionDelta"]);
  assign("avgSettleDays", ["avgSettleDays", "averageSettleDays"]);
  assign("avgSettleDaysDelta", ["avgSettleDaysDelta"]);
  assign("overdue", ["overdue", "overdueDeals"]);
  assign("pipelineValue", ["pipelineValue"]);
  assign("weightedPipeline", ["weightedPipeline"]);
  assign("activeDeals", ["activeDeals", "openDeals"]);
  assign("leadToDeal", ["leadToDeal"]);
  assign("dealToSettle", ["dealToSettle"]);
  assign("leadToSettle", ["leadToSettle"]);
  assign("targetProgress", ["targetProgress"]);
  assign("overdueTasks", ["overdueTasks"]);
  assign("followUpsDue", ["followUpsDue", "followupsDue"]);
  assign("documentsPending", ["documentsPending"]);
  assign("appointmentsToday", ["appointmentsToday"]);
  assign("slaBreaches", ["slaBreaches"]);
  assign("leadToDealDelta", ["leadToDealDelta"]);
  assign("dealToSettleDelta", ["dealToSettleDelta"]);
  assign("avgDealSize", ["avgDealSize", "averageDealSize"]);
  assign("avgDealSizeDelta", ["avgDealSizeDelta"]);
  assign("bottleneckDays", ["bottleneckDays"]);
  assign("settlementTarget", ["settlementTarget"]);

  const spark = (key: keyof ExecutiveOverview, aliases: string[]) => {
    for (const alias of aliases) {
      const pts = asSpark(rec[alias]);
      if (pts) {
        (next as Record<string, unknown>)[key] = pts;
        return;
      }
    }
  };
  spark("newLeadsSpark", ["newLeadsSpark", "leadsSpark"]);
  spark("activePipelineSpark", ["activePipelineSpark", "pipelineSpark"]);
  spark("settlementsSpark", ["settlementsSpark"]);
  spark("settlementValueSpark", ["settlementValueSpark"]);
  spark("commissionSpark", ["commissionSpark"]);
  spark("conversionSpark", ["conversionSpark"]);
  spark("avgSettleDaysSpark", ["avgSettleDaysSpark"]);
  spark("overdueSpark", ["overdueSpark"]);

  const pipeline = metricsRecord(widgets.pipeline);
  const funnel =
    asFunnel(rec.funnel) ??
    asFunnel(pipeline.funnel) ??
    asFunnel(pipeline.stages);
  if (funnel) next.funnel = funnel;

  const trendWidget = metricsRecord(widgets.trend);
  const trend =
    asTrend(rec.trend) ??
    asTrend(trendWidget.points) ??
    asTrend(trendWidget.series) ??
    asTrend(trendWidget.trend);
  if (trend) next.trend = trend;

  const ranking = metricsRecord(widgets.ranking);
  next.sources = asRankings(ranking.sources) ?? asRankings(rec.sources) ?? next.sources;
  next.brokers = asRankings(ranking.brokers) ?? asRankings(rec.brokers) ?? next.brokers;
  next.loanTypes =
    asRankings(ranking.loanTypes) ?? asRankings(rec.loanTypes) ?? next.loanTypes;

  const bottleneck = rec.bottleneck;
  if (typeof bottleneck === "string" && bottleneck.trim()) {
    next.bottleneck = bottleneck.trim();
  }
  const summary = rec.summary;
  if (typeof summary === "string" && summary.trim()) {
    next.summary = summary.trim();
  }

  return next;
}

export function widgetPayloadMap(
  raw: unknown,
): Partial<Record<DashboardWidgetId | string, unknown>> {
  const out: Record<string, unknown> = {};
  const rec = asRecord(raw);
  const rows = Array.isArray(raw)
    ? raw
    : rec
      ? (rec.items as unknown[]) ??
        (rec.widgets as unknown[]) ??
        (rec.results as unknown[]) ??
        (rec.data as unknown[])
      : null;

  if (Array.isArray(rows)) {
    for (const item of rows) {
      const row = asRecord(item);
      if (!row) continue;
      const key = String(
        row.widgetKey ?? row.key ?? row.id ?? row.widget ?? "",
      ).trim();
      if (!key) continue;
      out[key] = row.data ?? row.payload ?? row;
    }
    return out;
  }

  if (rec) {
    const nested = asRecord(rec.data) ?? rec;
    for (const [key, value] of Object.entries(nested)) {
      if (value && typeof value === "object") out[key] = value;
    }
  }
  return out;
}
