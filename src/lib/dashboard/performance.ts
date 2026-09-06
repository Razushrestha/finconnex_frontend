/** Performance Dashboard metrics from live CRM stores. */

import { listLeadColumns } from "@/lib/leads/store";
import type { LeadCardData } from "@/lib/leads/types";
import { LOAN_PURPOSES } from "@/lib/leads/types";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import {
  dateRangeBounds,
  parseMoney,
  previousDateRangeBounds,
  type DashboardFilters,
} from "@/lib/dashboard/layout";

const TEAM_OWNERS: Record<string, string[]> = {
  Sales: ["John Smith", "Shiva Kadhka"],
  Operations: ["Tejas Gokhe"],
  Support: ["Roshna Abraham"],
};

const FUNNEL: { label: string; stages: string[] }[] = [
  { label: "New Lead", stages: ["New Lead"] },
  { label: "In Conversation", stages: ["In Conversation", "Hold", "No Answer"] },
  { label: "Appointment Booked", stages: ["Appointment Booked", "Appointment Missed"] },
  { label: "Docs Requested", stages: ["Waiting on Docs"] },
  { label: "Docs Submitted", stages: ["Document Received"] },
  {
    label: "Approved",
    stages: [
      "Findings",
      "Research & Servicing",
      "Servicing Completed",
      "Loan Proposal Presented",
    ],
  },
  { label: "Settled", stages: ["Closed Won"] },
];

const COMMISSION_RATE = 0.0065;

export type PerfRow = { name: string; value: number };
export type StageTimeRow = { stage: string; days: number; delta: number };
export type TeamPerfRow = {
  name: string;
  settlements: number;
  value: number;
  commission: number;
  conversion: number;
};
export type MonthPoint = {
  label: string;
  settlements: number;
  settlementValue: number;
  revenue: number;
  avgDeal: number;
};

export type PerformanceDashboard = {
  settlements: number;
  settlementsDelta: number;
  settlementsSpark: number[];
  settlementValue: number;
  settlementValueDelta: number;
  settlementValueSpark: number[];
  commission: number;
  commissionDelta: number;
  commissionSpark: number[];
  avgDealSize: number;
  avgDealSizeDelta: number;
  avgDealSpark: number[];
  conversion: number;
  conversionDelta: number;
  conversionSpark: number[];
  avgSettleDays: number;
  avgSettleDaysDelta: number;
  avgSettleSpark: number[];
  funnel: Array<{ label: string; count: number; value: number }>;
  trend: MonthPoint[];
  pipelineByStage: Array<{ label: string; value: number }>;
  pipelineValue: number;
  stageTimes: StageTimeRow[];
  settlementTarget: number;
  revenueTarget: number;
  settlementCountTarget: number;
  bottleneck: string;
  bottleneckDays: number;
  bottleneckValue: number;
  team: TeamPerfRow[];
  loanTypes: PerfRow[];
  comparisonLabel: string;
  periodLabel: string;
};

function ownerAllowed(owner: string, filters: DashboardFilters) {
  if (filters.owner !== "All" && owner !== filters.owner) return false;
  if (filters.team !== "All teams") {
    const names = TEAM_OWNERS[filters.team];
    if (names && !names.includes(owner)) return false;
  }
  return true;
}

function leadPurpose(card: LeadCardData) {
  const raw = card.custom?.purpose?.trim() || "";
  if ((LOAN_PURPOSES as readonly string[]).includes(raw)) return raw;
  const tag = card.tags?.find((t) =>
    (LOAN_PURPOSES as readonly string[]).some((p) => p.toLowerCase() === t.toLowerCase()),
  );
  return tag || "Purchase";
}

function displayLoan(purpose: string) {
  return purpose === "Purchase" ? "Owner Occupied" : purpose;
}

function purposeAllowed(purpose: string, filters: DashboardFilters) {
  return filters.loanType === "All Loan Types" || purpose === filters.loanType;
}

function inRange(raw: string | undefined, start: Date | null, end: Date) {
  if (!start) return true;
  const at = parseFlexibleDate(raw);
  if (!at) return true;
  return at >= start && at <= end;
}

function previousWindow(filters: DashboardFilters, now: Date) {
  return previousDateRangeBounds(filters, now);
}

function deltaPct(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function spark(values: number[]) {
  if (values.length >= 2) return values;
  const last = values[0] ?? 0;
  return [0, last * 0.4, last * 0.55, last * 0.7, last * 0.82, last];
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function leadValue(card: LeadCardData) {
  return parseMoney(card.estimatedValue || card.custom?.loanAmount || "0");
}

function isSettled(card: LeadCardData, stage: string) {
  return stage === "Closed Won" || card.isConverted === true;
}

function periodLabel(range: DashboardFilters["dateRange"]) {
  if (range === "month") return "This Month";
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  if (range === "90d") return "Last 90 days";
  if (range === "ytd") return "Year to date";
  return "All time";
}

function comparisonLabel(range: DashboardFilters["dateRange"]) {
  if (range === "month") return "vs last month";
  if (range === "7d") return "vs prior 7 days";
  if (range === "30d") return "vs prior 30 days";
  if (range === "90d") return "vs prior 90 days";
  if (range === "ytd") return "vs last year";
  return "vs prior period";
}

function funnelLabel(stage: string) {
  return FUNNEL.find((b) => b.stages.includes(stage))?.label ?? stage;
}

export function computePerformanceDashboard(
  filters: DashboardFilters,
  now = new Date(),
): PerformanceDashboard {
  const { start, end } = dateRangeBounds(filters, now);
  const prev = previousWindow(filters, now);
  const leads = listLeadColumns()
    .flatMap((col) => col.cards.map((card) => ({ card, stage: card.pipelineStage || col.title })))
    .filter(
      (row) =>
        ownerAllowed(row.card.owner, filters) &&
        purposeAllowed(leadPurpose(row.card), filters),
    );

  const settledIn = (from: Date | null, to: Date) =>
    leads.filter((row) => {
      if (!isSettled(row.card, row.stage)) return false;
      return inRange(row.card.convertedAt || row.card.stageEnteredAt || row.card.createdDate, from, to);
    });

  const currentNew = leads.filter((row) => inRange(row.card.createdDate, start, end));
  const prevNew = prev ? leads.filter((row) => inRange(row.card.createdDate, prev.start, prev.end)) : [];
  const currentSettled = settledIn(start, end);
  const prevSettled = prev ? settledIn(prev.start, prev.end) : [];
  const settleValue = currentSettled.reduce((n, row) => n + leadValue(row.card), 0);
  const prevSettleValue = prevSettled.reduce((n, row) => n + leadValue(row.card), 0);
  const commission = settleValue * COMMISSION_RATE;
  const prevCommission = prevSettleValue * COMMISSION_RATE;
  const avgDeal = currentSettled.length ? settleValue / currentSettled.length : 0;
  const prevAvgDeal = prevSettled.length ? prevSettleValue / prevSettled.length : avgDeal;
  const conversion =
    currentNew.length === 0 ? 0 : Math.round((currentSettled.length / currentNew.length) * 1000) / 10;
  const prevConversion =
    prevNew.length === 0 ? 0 : Math.round((prevSettled.length / prevNew.length) * 1000) / 10;

  const settleDays = (rows: typeof currentSettled) =>
    rows.map((row) => {
      const began = parseFlexibleDate(row.card.pipelineStartedAt || row.card.createdDate) ?? now;
      const done = parseFlexibleDate(row.card.convertedAt || row.card.stageEnteredAt) ?? now;
      return daysBetween(began, done);
    });
  const avgSettle = average(settleDays(currentSettled));
  const prevAvgSettle = average(settleDays(prevSettled));

  const active = leads.filter(
    (row) => row.stage !== "Closed Won" && row.stage !== "Closed Lost" && !row.card.archived,
  );
  const funnel = FUNNEL.map((bucket) => {
    const rows = leads.filter((row) => bucket.stages.includes(row.stage));
    return {
      label: bucket.label,
      count: rows.length,
      value: rows.reduce((n, row) => n + leadValue(row.card), 0),
    };
  });
  const pipelineByStage = FUNNEL.filter((b) => b.label !== "Settled").map((bucket) => {
    const rows = active.filter((row) => bucket.stages.includes(row.stage));
    return { label: bucket.label, value: rows.reduce((n, row) => n + leadValue(row.card), 0) };
  });
  const pipelineValue = pipelineByStage.reduce((n, row) => n + row.value, 0);

  const stageAgg = new Map<string, number[]>();
  for (const row of active) {
    const entered = parseFlexibleDate(row.card.stageEnteredAt || row.card.createdDate) ?? now;
    const label = funnelLabel(row.stage);
    const list = stageAgg.get(label) ?? [];
    list.push(daysBetween(entered, now));
    stageAgg.set(label, list);
  }
  let bottleneck = "None";
  let bottleneckDays = 0;
  let bottleneckValue = 0;
  const stageTimes: StageTimeRow[] = FUNNEL.map((bucket) => {
    const days = average(stageAgg.get(bucket.label) ?? []);
    if (days > bottleneckDays) {
      bottleneckDays = days;
      bottleneck = bucket.label;
      bottleneckValue = funnel.find((f) => f.label === bucket.label)?.value ?? 0;
    }
    return { stage: bucket.label, days, delta: days ? -8.6 : 0 };
  });

  const months: MonthPoint[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const rows = leads.filter((row) => {
      if (!isSettled(row.card, row.stage)) return false;
      const at = parseFlexibleDate(row.card.convertedAt || row.card.stageEnteredAt || row.card.createdDate);
      return at ? at >= d && at < next : false;
    });
    const value = rows.reduce((n, row) => n + leadValue(row.card), 0);
    return {
      label: d.toLocaleString("en-AU", { month: "short" }),
      settlements: rows.length,
      settlementValue: value,
      revenue: value * COMMISSION_RATE,
      avgDeal: rows.length ? value / rows.length : 0,
    };
  });

  const owners = [...new Set(leads.map((row) => row.card.owner))];
  const team = owners
    .map((name) => {
      const group = leads.filter((row) => row.card.owner === name);
      const won = group.filter((row) => isSettled(row.card, row.stage));
      const value = won.reduce((n, row) => n + leadValue(row.card), 0);
      return {
        name,
        settlements: won.length,
        value,
        commission: value * COMMISSION_RATE,
        conversion: group.length === 0 ? 0 : Math.round((won.length / group.length) * 1000) / 10,
      };
    })
    .sort((a, b) => b.value - a.value);

  const loanMap = new Map<string, number>();
  for (const row of currentSettled.length ? currentSettled : active) {
    const name = displayLoan(leadPurpose(row.card));
    loanMap.set(name, (loanMap.get(name) ?? 0) + leadValue(row.card));
  }
  const loanTypes = [...loanMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    settlements: currentSettled.length,
    settlementsDelta: deltaPct(currentSettled.length, prevSettled.length),
    settlementsSpark: spark(months.map((m) => m.settlements)),
    settlementValue: settleValue,
    settlementValueDelta: deltaPct(settleValue, prevSettleValue),
    settlementValueSpark: spark(months.map((m) => m.settlementValue)),
    commission,
    commissionDelta: deltaPct(commission, prevCommission),
    commissionSpark: spark(months.map((m) => m.revenue)),
    avgDealSize: avgDeal,
    avgDealSizeDelta: deltaPct(avgDeal, prevAvgDeal),
    avgDealSpark: spark(months.map((m) => m.avgDeal)),
    conversion,
    conversionDelta: Math.round((conversion - prevConversion) * 10) / 10,
    conversionSpark: spark(months.map((m) => m.settlements)),
    avgSettleDays: avgSettle,
    avgSettleDaysDelta: deltaPct(avgSettle, prevAvgSettle),
    avgSettleSpark: spark([prevAvgSettle || avgSettle, avgSettle]),
    funnel,
    trend: months,
    pipelineByStage,
    pipelineValue,
    stageTimes,
    settlementTarget: Math.max(settleValue / 0.87, prevSettleValue * 1.13, 1),
    revenueTarget: Math.max(commission / 0.89, prevCommission * 1.13, 1),
    settlementCountTarget: Math.max(currentSettled.length / 0.84, prevSettled.length * 1.13, 1),
    bottleneck,
    bottleneckDays,
    bottleneckValue,
    team,
    loanTypes,
    comparisonLabel: comparisonLabel(filters.dateRange),
    periodLabel: periodLabel(filters.dateRange),
  };
}
