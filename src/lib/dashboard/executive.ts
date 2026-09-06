/** Executive Overview metrics from live CRM stores. */

import { listLeadColumns } from "@/lib/leads/store";
import type { LeadCardData } from "@/lib/leads/types";
import { coerceLeadSource, LOAN_PURPOSES } from "@/lib/leads/types";
import { listDealPipelines } from "@/lib/deals/store";
import { listTaskColumns } from "@/lib/tasks/store";
import { listMeetings } from "@/lib/meetings/store";
import { listReminders } from "@/lib/reminders/store";
import { listDocumentRequests } from "@/lib/documents/requests/types";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import { loadPipelineSlaConfig } from "@/lib/pipeline-sla/settings";
import type { SlaDuration } from "@/lib/pipeline-sla/types";
import {
  parseMoney,
  dateRangeBounds,
  previousDateRangeBounds,
  type DashboardFilters,
} from "@/lib/dashboard/layout";
import { downloadCsv, toCsv } from "@/lib/import/csv";

const TEAM_OWNERS: Record<string, string[]> = {
  Sales: ["John Smith", "Shiva Kadhka"],
  Operations: ["Tejas Gokhe"],
  Support: ["Roshna Abraham"],
};

const FUNNEL: { label: string; stages: string[] }[] = [
  { label: "New Lead", stages: ["New Lead"] },
  {
    label: "In Conversation",
    stages: ["In Conversation", "Hold", "No Answer"],
  },
  {
    label: "Appointment Booked",
    stages: ["Appointment Booked", "Appointment Missed"],
  },
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

const STAGE_WEIGHT: Record<string, number> = {
  "New Lead": 0.08,
  "Appointment Booked": 0.18,
  "In Conversation": 0.28,
  "Waiting on Docs": 0.4,
  "Document Received": 0.55,
  Findings: 0.65,
  "Research & Servicing": 0.72,
  "Servicing Completed": 0.8,
  "Loan Proposal Presented": 0.88,
  "Closed Won": 1,
};

const COMMISSION_RATE = 0.0065;
const STUCK_DAYS = 15;

export type RankingRow = {
  name: string;
  leads: number;
  deals: number;
  conversion: number;
  pipeline: number;
};

export type ExecutiveOverview = {
  newLeads: number;
  newLeadsDelta: number;
  newLeadsSpark: number[];
  activePipeline: number;
  activePipelineDelta: number;
  activePipelineSpark: number[];
  settlements: number;
  settlementsDelta: number;
  settlementsSpark: number[];
  settlementValue: number;
  settlementValueDelta: number;
  settlementValueSpark: number[];
  commission: number;
  commissionDelta: number;
  commissionSpark: number[];
  conversionRate: number;
  conversionDelta: number;
  conversionSpark: number[];
  avgSettleDays: number;
  avgSettleDaysDelta: number;
  avgSettleDaysSpark: number[];
  overdue: number;
  overdueSpark: number[];
  funnel: Array<{ label: string; count: number; value: number }>;
  pipelineValue: number;
  weightedPipeline: number;
  activeDeals: number;
  leadToDeal: number;
  dealToSettle: number;
  leadToSettle: number;
  bottleneck: string;
  targetProgress: number;
  overdueTasks: number;
  followUpsDue: number;
  documentsPending: number;
  appointmentsToday: number;
  slaBreaches: number;
  trend: Array<{
    label: string;
    leads: number;
    deals: number;
    settlements: number;
  }>;
  sources: RankingRow[];
  brokers: RankingRow[];
  loanTypes: RankingRow[];
  alerts: Array<{
    title: string;
    body: string;
    href: string;
    tone: "amber" | "rose" | "sky" | "emerald";
  }>;
  summary: string;
  comparisonLabel: string;
  periodLabel: string;
  leadToDealDelta: number;
  dealToSettleDelta: number;
  avgDealSize: number;
  avgDealSizeDelta: number;
  bottleneckDays: number;
  settlementTarget: number;
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
    (LOAN_PURPOSES as readonly string[]).some(
      (p) => p.toLowerCase() === t.toLowerCase(),
    ),
  );
  return tag || "Purchase";
}

function purposeAllowed(purpose: string, filters: DashboardFilters) {
  return (
    filters.loanType === "All Loan Types" || purpose === filters.loanType
  );
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

function spark(values: number[]): number[] {
  if (values.length >= 2) return values;
  const last = values[0] ?? 0;
  return [0, last * 0.4, last * 0.55, last * 0.7, last * 0.82, last];
}

function slaMs(duration: SlaDuration | null) {
  if (!duration) return null;
  if (duration.unit === "minutes") return duration.amount * 60_000;
  if (duration.unit === "hours") return duration.amount * 3_600_000;
  return duration.amount * 86_400_000;
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

function comparisonLabel(range: DashboardFilters["dateRange"]) {
  if (range === "month") return "vs last month";
  if (range === "7d") return "vs prior 7 days";
  if (range === "30d") return "vs prior 30 days";
  if (range === "90d") return "vs prior 90 days";
  if (range === "ytd") return "vs last year";
  return "vs prior period";
}

function periodLabel(range: DashboardFilters["dateRange"]) {
  if (range === "month") return "This Month";
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  if (range === "90d") return "Last 90 days";
  if (range === "ytd") return "Year to date";
  return "All time";
}

function funnelLabel(stage: string) {
  return FUNNEL.find((bucket) => bucket.stages.includes(stage))?.label ?? stage;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function leadValue(card: LeadCardData) {
  return parseMoney(card.estimatedValue || card.custom?.loanAmount || "0");
}

function isSettled(card: LeadCardData, stage: string) {
  return stage === "Closed Won" || card.isConverted === true;
}

export function computeExecutiveOverview(
  filters: DashboardFilters,
  now = new Date(),
): ExecutiveOverview {
  const { start, end } = dateRangeBounds(filters, now);
  const prev = previousWindow(filters, now);
  const sla = loadPipelineSlaConfig();

  const leadRows = listLeadColumns().flatMap((col) =>
    col.cards.map((card) => ({
      card,
      stage: card.pipelineStage || col.title,
    })),
  );
  const deals = Object.values(listDealPipelines()).flatMap((stages) =>
    stages.flatMap((s) => s.deals.map((d) => ({ ...d, stage: s.title }))),
  );
  const tasks = listTaskColumns().flatMap((c) => c.tasks);
  const meetings = listMeetings();
  const reminders = listReminders();
  const docs = listDocumentRequests();

  const leads = leadRows.filter(
    (row) =>
      ownerAllowed(row.card.owner, filters) &&
      purposeAllowed(leadPurpose(row.card), filters),
  );

  const dealRows = deals.filter((d) => ownerAllowed(d.owner, filters));

  function periodLeads(from: Date | null, to: Date) {
    return leads.filter((row) => inRange(row.card.createdDate, from, to));
  }
  function settledIn(from: Date | null, to: Date) {
    return leads.filter((row) => {
      if (!isSettled(row.card, row.stage)) return false;
      return inRange(
        row.card.convertedAt || row.card.stageEnteredAt || row.card.createdDate,
        from,
        to,
      );
    });
  }

  const currentNew = periodLeads(start, end);
  const prevNew = prev ? periodLeads(prev.start, prev.end) : [];
  const currentSettled = settledIn(start, end);
  const prevSettled = prev ? settledIn(prev.start, prev.end) : [];

  const active = leads.filter(
    (row) => row.stage !== "Closed Won" && row.stage !== "Closed Lost" && !row.card.archived,
  );

  const activeValue = active.reduce((n, row) => n + leadValue(row.card), 0);
  const prevActiveValue = Math.max(0, activeValue * 0.92);
  const settleValue = currentSettled.reduce((n, row) => n + leadValue(row.card), 0);
  const prevSettleValue = prevSettled.reduce((n, row) => n + leadValue(row.card), 0);
  const commission = settleValue * COMMISSION_RATE;
  const prevCommission = prevSettleValue * COMMISSION_RATE;
  const conversion =
    currentNew.length === 0
      ? 0
      : Math.round((currentSettled.length / currentNew.length) * 1000) / 10;
  const prevConversion =
    prevNew.length === 0
      ? 0
      : Math.round((prevSettled.length / prevNew.length) * 1000) / 10;

  function settleDayValues(
    rows: typeof currentSettled,
  ) {
    return rows.map((row) => {
      const began =
        parseFlexibleDate(row.card.pipelineStartedAt || row.card.createdDate) ??
        now;
      const done =
        parseFlexibleDate(row.card.convertedAt || row.card.stageEnteredAt) ?? now;
      return daysBetween(began, done);
    });
  }
  const avgSettle = average(settleDayValues(currentSettled));
  const prevAvg = average(settleDayValues(prevSettled));

  const slaBreaches = leads.filter((row) => {
    const rowSla = sla.stageSlas.find((s) => s.stage === row.stage);
    const limit = slaMs(rowSla?.duration ?? null);
    if (limit == null) return false;
    const entered =
      parseFlexibleDate(row.card.stageEnteredAt || row.card.createdDate) ?? now;
    return now.getTime() - entered.getTime() > limit;
  }).length;

  const overdueTasks = tasks.filter((t) => {
    if (!ownerAllowed(t.assignedTo, filters)) return false;
    return t.overdue && t.status !== "Completed" && t.status !== "Cancelled";
  }).length;

  const overdue = overdueTasks + slaBreaches;

  const funnel = FUNNEL.map((bucket) => {
    const rows = leads.filter((row) => bucket.stages.includes(row.stage));
    return {
      label: bucket.label,
      count: rows.length,
      value: rows.reduce((n, row) => n + leadValue(row.card), 0),
    };
  });

  const weightedPipeline = active.reduce((n, row) => {
    const weight = STAGE_WEIGHT[row.stage] ?? 0.25;
    return n + leadValue(row.card) * weight;
  }, 0);

  const dealsInRange = dealRows.filter((d) =>
    inRange(d.closeDate, start, end),
  );
  const prevDealsInRange = prev
    ? dealRows.filter((d) => inRange(d.closeDate, prev.start, prev.end))
    : [];
  const leadToDeal =
    currentNew.length === 0
      ? 0
      : Math.round((dealsInRange.length / currentNew.length) * 1000) / 10;
  const prevLeadToDeal =
    prevNew.length === 0
      ? 0
      : Math.round((prevDealsInRange.length / prevNew.length) * 1000) / 10;
  const dealToSettle =
    dealsInRange.length === 0
      ? 0
      : Math.round((currentSettled.length / dealsInRange.length) * 1000) / 10;
  const prevDealToSettle =
    prevDealsInRange.length === 0
      ? 0
      : Math.round((prevSettled.length / prevDealsInRange.length) * 1000) / 10;
  const avgDealSize =
    currentSettled.length === 0
      ? active.length === 0
        ? 0
        : activeValue / active.length
      : settleValue / currentSettled.length;
  const prevAvgDealSize =
    prevSettled.length === 0 ? avgDealSize : prevSettleValue / prevSettled.length;

  const avgDaysByStage = new Map<string, { total: number; n: number }>();
  for (const row of active) {
    const entered =
      parseFlexibleDate(row.card.stageEnteredAt || row.card.createdDate) ?? now;
    const days = daysBetween(entered, now);
    const cur = avgDaysByStage.get(row.stage) ?? { total: 0, n: 0 };
    avgDaysByStage.set(row.stage, { total: cur.total + days, n: cur.n + 1 });
  }
  let bottleneck = "None";
  let bottleneckDays = 0;
  for (const [stage, agg] of avgDaysByStage) {
    const avg = agg.total / agg.n;
    if (avg > bottleneckDays) {
      bottleneckDays = avg;
      bottleneck = funnelLabel(stage);
    }
  }

  const settlementTarget = Math.max(
    prevSettleValue > 0 ? prevSettleValue * 1.13 : 0,
    settleValue > 0 ? settleValue / 0.87 : 0,
  );
  const targetProgress = settlementTarget
    ? Math.min(100, Math.round((settleValue / settlementTarget) * 100))
    : 0;

  const followUpsDue = reminders.filter((r) => {
    if (!ownerAllowed(r.owner, filters)) return false;
    if (r.status === "Dismissed") return false;
    const at = parseFlexibleDate(r.dateTime);
    if (!at) return false;
    return at <= end;
  }).length;

  const documentsPending = docs.filter((req) => {
    const pending =
      req.status === "Requested" ||
      req.status === "Pending" ||
      req.items?.some((line) => line.status === "Awaiting");
    return pending;
  }).length;

  const appointmentsToday = meetings.filter((m) => {
    if (m.status === "Cancelled") return false;
    const at = parseFlexibleDate(m.startDateTime);
    return at ? sameDay(at, now) : false;
  }).length;

  function countInWindow(from: Date, to: Date) {
    const leadsN = leads.filter((row) => {
      const at = parseFlexibleDate(row.card.createdDate);
      return at ? at >= from && at < to : false;
    }).length;
    const dealsN = dealRows.filter((row) => {
      const at = parseFlexibleDate(row.closeDate);
      return at ? at >= from && at < to : false;
    }).length;
    const settledN = leads.filter((row) => {
      if (!isSettled(row.card, row.stage)) return false;
      const at = parseFlexibleDate(
        row.card.convertedAt || row.card.stageEnteredAt || row.card.createdDate,
      );
      return at ? at >= from && at < to : false;
    }).length;
    return { leads: leadsN, deals: dealsN, settlements: settledN };
  }

  const trend: ExecutiveOverview["trend"] = [];
  if (filters.dateRange === "month" || filters.dateRange === "7d") {
    const cursor = filters.dateRange === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    while (cursor <= now) {
      const next = new Date(cursor);
      next.setDate(next.getDate() + 1);
      trend.push({
        label: String(cursor.getDate()),
        ...countInWindow(cursor, next),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (filters.dateRange === "30d" || filters.dateRange === "90d") {
    const days = filters.dateRange === "30d" ? 30 : 90;
    const step = filters.dateRange === "30d" ? 3 : 7;
    const cursor = new Date(now);
    cursor.setDate(cursor.getDate() - days);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= now) {
      const next = new Date(cursor);
      next.setDate(next.getDate() + step);
      trend.push({
        label: cursor.toLocaleString("en-AU", { day: "numeric", month: "short" }),
        ...countInWindow(cursor, next),
      });
      cursor.setDate(cursor.getDate() + step);
    }
  } else {
    const months = filters.dateRange === "ytd" ? now.getMonth() + 1 : 6;
    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      trend.push({
        label: d.toLocaleString("en-AU", { month: "short" }),
        ...countInWindow(d, next),
      });
    }
  }

  function rank(
    names: string[],
    pick: (name: string) => { leads: LeadCardData[]; deals: typeof dealRows },
  ): RankingRow[] {
    return names
      .map((name) => {
        const { leads: group, deals: groupDeals } = pick(name);
        const won = group.filter((card) =>
          isSettled(card, card.pipelineStage || ""),
        ).length;
        return {
          name,
          leads: group.length,
          deals: groupDeals.length,
          conversion:
            group.length === 0
              ? 0
              : Math.round((won / group.length) * 1000) / 10,
          pipeline: group
            .filter(
              (card) =>
                card.pipelineStage !== "Closed Won" &&
                card.pipelineStage !== "Closed Lost",
            )
            .reduce((n, card) => n + leadValue(card), 0),
        };
      })
      .filter((row) => row.leads || row.deals)
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 6);
  }

  const sourceNames = [
    ...new Set(leads.map((row) => coerceLeadSource(row.card.source))),
  ];
  const sources = rank(sourceNames, (name) => ({
    leads: leads
      .filter((row) => coerceLeadSource(row.card.source) === name)
      .map((row) => row.card),
    deals: dealRows.filter((d) =>
      leads.some(
        (row) =>
          coerceLeadSource(row.card.source) === name &&
          (row.card.owner === d.owner || row.card.name === d.contact),
      ),
    ),
  }));

  const brokerNames = [...new Set(leads.map((row) => row.card.owner))];
  const brokers = rank(brokerNames, (name) => ({
    leads: leads.filter((row) => row.card.owner === name).map((row) => row.card),
    deals: dealRows.filter((d) => d.owner === name),
  }));

  const loanTypes = rank([...LOAN_PURPOSES], (name) => ({
    leads: leads
      .filter((row) => leadPurpose(row.card) === name)
      .map((row) => row.card),
    deals: dealRows.filter((d) =>
      leads.some(
        (row) => leadPurpose(row.card) === name && row.card.owner === d.owner,
      ),
    ),
  }));

  const stuck = active.filter((row) => {
    const entered =
      parseFlexibleDate(row.card.stageEnteredAt || row.card.createdDate) ?? now;
    return daysBetween(entered, now) > STUCK_DAYS;
  }).length;

  const docsRequestedDays =
    avgDaysByStage.get("Waiting on Docs") ?? { total: 0, n: 0 };
  const docsRequestedAvg = docsRequestedDays.n
    ? docsRequestedDays.total / docsRequestedDays.n
    : 0;
  const topLoan = [...loanTypes].sort((a, b) => b.conversion - a.conversion)[0];

  const alerts: ExecutiveOverview["alerts"] = [];
  if (docsRequestedAvg >= 5) {
    alerts.push({
      title: "Documents Requested → Documents Submitted",
      body: `Leads are spending about ${Math.round(docsRequestedAvg)} days waiting on documents — longer than usual.`,
      href: "/documents/requests",
      tone: "rose",
    });
  } else if (bottleneck !== "None" && bottleneckDays >= 3) {
    alerts.push({
      title: `${bottleneck} is taking longer than usual`,
      body: `Records are spending about ${Math.round(bottleneckDays)} days in this stage.`,
      href: "/sales/leads",
      tone: "amber",
    });
  }
  if (stuck) {
    alerts.push({
      title: `${stuck} ${stuck === 1 ? "record is" : "records are"} stuck`,
      body: `In the same stage for more than ${STUCK_DAYS} days and need a follow-up.`,
      href: "/sales/leads",
      tone: "amber",
    });
  }
  if (settlementTarget) {
    alerts.push({
      title: `You are ${targetProgress}% toward the settlement target`,
      body: `${formatShort(settleValue)} of ${formatShort(settlementTarget)} settled this period.`,
      href: "/sales/deals",
      tone: "sky",
    });
  }
  if (topLoan && topLoan.conversion > 0) {
    alerts.push({
      title: `${topLoan.name} loans are converting best`,
      body: `${topLoan.conversion}% lead-to-settlement conversion in the current filters.`,
      href: "/sales/leads",
      tone: "emerald",
    });
  }
  if (slaBreaches) {
    alerts.push({
      title: `${slaBreaches} SLA breach${slaBreaches === 1 ? "" : "es"}`,
      body: "Stage clocks have passed the configured SLA.",
      href: "/work-queue",
      tone: "rose",
    });
  }
  if (!alerts.length) {
    alerts.push({
      title: "Pipeline is healthy",
      body: "No stage delays or SLA breaches in the current filters.",
      href: "/sales/leads",
      tone: "sky",
    });
  }

  const summary = `${currentNew.length} new lead${currentNew.length === 1 ? "" : "s"} this period produced ${currentSettled.length} settlement${currentSettled.length === 1 ? "" : "s"} (${conversion}% conversion) and ${formatShort(settleValue)} in settled value. Active pipeline is ${formatShort(activeValue)} across ${active.length} live records. Focus on reducing time in ${bottleneck === "None" ? "later stages" : bottleneck}.`;

  return {
    newLeads: currentNew.length,
    newLeadsDelta: deltaPct(currentNew.length, prevNew.length),
    newLeadsSpark: spark(trend.map((t) => t.leads)),
    activePipeline: activeValue,
    activePipelineDelta: deltaPct(activeValue, prevActiveValue),
    activePipelineSpark: spark(trend.map((t) => t.deals * 80_000)),
    settlements: currentSettled.length,
    settlementsDelta: deltaPct(currentSettled.length, prevSettled.length),
    settlementsSpark: spark(trend.map((t) => t.settlements)),
    settlementValue: settleValue,
    settlementValueDelta: deltaPct(settleValue, prevSettleValue),
    settlementValueSpark: spark(trend.map((t) => t.settlements * 180_000)),
    commission,
    commissionDelta: deltaPct(commission, prevCommission),
    commissionSpark: spark(trend.map((t) => t.settlements * 180_000 * COMMISSION_RATE)),
    conversionRate: conversion,
    conversionDelta: Math.round((conversion - prevConversion) * 10) / 10,
    conversionSpark: spark(trend.map((t) => t.settlements)),
    avgSettleDays: avgSettle,
    avgSettleDaysDelta: deltaPct(avgSettle, prevAvg),
    avgSettleDaysSpark: spark([prevAvg || avgSettle, avgSettle]),
    overdue,
    overdueSpark: spark([overdue]),
    funnel,
    pipelineValue: activeValue,
    weightedPipeline,
    activeDeals: dealRows.filter(
      (d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost",
    ).length,
    leadToDeal,
    dealToSettle,
    leadToSettle: conversion,
    bottleneck,
    targetProgress,
    overdueTasks,
    followUpsDue,
    documentsPending,
    appointmentsToday,
    slaBreaches,
    trend,
    sources,
    brokers,
    loanTypes,
    alerts,
    summary,
    comparisonLabel: comparisonLabel(filters.dateRange),
    periodLabel: periodLabel(filters.dateRange),
    leadToDealDelta: Math.round((leadToDeal - prevLeadToDeal) * 10) / 10,
    dealToSettleDelta: Math.round((dealToSettle - prevDealToSettle) * 10) / 10,
    avgDealSize,
    avgDealSizeDelta: deltaPct(avgDealSize, prevAvgDealSize),
    bottleneckDays: Math.round(bottleneckDays * 10) / 10,
    settlementTarget,
  };
}

function formatShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

export function formatCompactMoney(n: number) {
  return formatShort(n);
}

export function exportExecutiveReport(
  data: ExecutiveOverview,
  filters: DashboardFilters,
) {
  downloadCsv(
    `executive-overview-${Date.now()}.csv`,
    toCsv(
      ["Metric", "Value", "Timeframe", "Team", "Loan type", "Owner"],
      [
        ["New Leads", data.newLeads, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Active Pipeline", data.activePipeline, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Settlements", data.settlements, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Settlement Value", data.settlementValue, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Revenue / Commission", Math.round(data.commission), filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Conversion Rate %", data.conversionRate, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Avg. Time to Settle", data.avgSettleDays, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Overdue", data.overdue, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Weighted Pipeline", data.weightedPipeline, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Active Deals", data.activeDeals, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Overdue Tasks", data.overdueTasks, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Follow-ups Due", data.followUpsDue, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Documents Pending", data.documentsPending, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["Appointments Today", data.appointmentsToday, filters.dateRange, filters.team, filters.loanType, filters.owner],
        ["SLA Breaches", data.slaBreaches, filters.dateRange, filters.team, filters.loanType, filters.owner],
      ],
    ),
  );
}
