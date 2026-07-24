/** SRS §15 Analytics: pre-built KPI dashboard (mock) */

import { csatAverage, listTickets } from "@/lib/support/types";

export type AnalyticsPeriod = "7d" | "30d" | "quarter" | "year";
export type AnalyticsTeam = "All" | "Sales" | "Marketing" | "Support";

export const ANALYTICS_PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "quarter", label: "This quarter" },
  { id: "year", label: "This year" },
];

export const ANALYTICS_TEAMS: AnalyticsTeam[] = [
  "All",
  "Sales",
  "Marketing",
  "Support",
];

export const ANALYTICS_OWNERS = [
  "All",
  "John Smith",
  "Tejas Gokhe",
  "Roshna Abraham",
  "Shiva Kadhka",
] as const;

export interface AnalyticsKpi {
  id: string;
  label: string;
  value: string;
  /** Numeric for benchmark compare when possible */
  numericValue?: number;
  unit?: "percent" | "currency" | "days" | "hours" | "count" | "multiple" | "score";
  delta: string;
  deltaPositive: boolean;
  hint?: string;
  /** Drill into related CRM module */
  drillHref: string;
  drillLabel: string;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  target: number;
  prior?: number;
}

export interface SourceSlice {
  name: string;
  value: number;
}

export interface OwnerSlice {
  name: string;
  revenue: number;
}

export interface TopUserRow {
  name: string;
  dealsWon: number;
  revenue: number;
  activities: number;
  href: string;
}

export type BenchmarkMap = Record<string, number>;

const BENCHMARK_KEY = "analytics:benchmarks:v1";

export const DEFAULT_BENCHMARKS: BenchmarkMap = {
  leadConv: 20,
  winRate: 25,
  avgDeal: 80000,
  cycle: 40,
  velocity: 35000,
  activities: 150,
  overdue: 12,
  emailOpen: 35,
  campaignRoi: 2,
  ticketTime: 24,
  csat: 4.2,
};

export function loadBenchmarks(): BenchmarkMap {
  if (typeof window === "undefined") return { ...DEFAULT_BENCHMARKS };
  try {
    const raw = sessionStorage.getItem(BENCHMARK_KEY);
    if (!raw) return { ...DEFAULT_BENCHMARKS };
    return { ...DEFAULT_BENCHMARKS, ...(JSON.parse(raw) as BenchmarkMap) };
  } catch {
    return { ...DEFAULT_BENCHMARKS };
  }
}

export function saveBenchmarks(map: BenchmarkMap) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BENCHMARK_KEY, JSON.stringify(map));
}

/** Static seed scaled lightly by period for demo feel */
function periodFactor(period: AnalyticsPeriod) {
  switch (period) {
    case "7d":
      return 0.25;
    case "30d":
      return 1;
    case "quarter":
      return 2.4;
    case "year":
      return 8;
  }
}

export function priorPeriod(period: AnalyticsPeriod): AnalyticsPeriod {
  // Same grain, treated as “previous window” via lower scale in snapshot
  return period;
}

export function getAnalyticsSnapshot(opts: {
  period: AnalyticsPeriod;
  team: AnalyticsTeam;
  owner: string;
  /** Multiply all scales: used for prior-period compare (~85%) */
  priorScale?: number;
}) {
  const f = periodFactor(opts.period) * (opts.priorScale ?? 1);
  const ownerScale =
    opts.owner === "All" ? 1 : opts.owner === "John Smith" ? 1.15 : 0.85;
  const teamScale =
    opts.team === "All"
      ? 1
      : opts.team === "Sales"
        ? 1.05
        : opts.team === "Marketing"
          ? 0.9
          : 0.8;

  const scale = f * ownerScale * teamScale;
  const tickets = typeof window !== "undefined" ? listTickets() : [];
  const csat = csatAverage(tickets) ?? 4.5;

  const resolved = tickets.filter(
    (t) => t.status === "Resolved" || t.status === "Closed",
  ).length;
  const openish = tickets.filter((t) =>
    ["New", "Open", "In Progress", "Pending", "Reopened"].includes(t.status),
  ).length;

  const leadConv = Math.min(48, Math.round(21 * ownerScale));
  const winRate = Math.min(55, Math.round(28 * ownerScale));
  const avgDeal = Math.round(86400 * ownerScale);
  const cycle = Math.round(34 / ownerScale);
  const velocity = Math.round((42000 * scale) / 7);
  const activities = Math.round(178 * scale);
  const overdue = Math.max(4, Math.round(9 / ownerScale));
  const emailOpen = Math.round(38 * (opts.team === "Marketing" ? 1.1 : 1));
  const campaignRoi = Number(
    (2.4 * (opts.team === "Marketing" ? 1.2 : 1)).toFixed(1),
  );
  const ticketTime = Math.max(
    8,
    Math.round(16.5 / (opts.team === "Support" ? 1.2 : 1)),
  );

  const kpis: AnalyticsKpi[] = [
    {
      id: "leadConv",
      label: "Lead Conversion Rate",
      value: `${leadConv}%`,
      numericValue: leadConv,
      unit: "percent",
      delta: "+2.4%",
      deltaPositive: true,
      drillHref: "/sales/leads",
      drillLabel: "Leads",
    },
    {
      id: "winRate",
      label: "Deal Win Rate",
      value: `${winRate}%`,
      numericValue: winRate,
      unit: "percent",
      delta: "+1.1%",
      deltaPositive: true,
      drillHref: "/sales/deals",
      drillLabel: "Deals",
    },
    {
      id: "avgDeal",
      label: "Average Deal Size",
      value: `$${avgDeal.toLocaleString("en-AU")}`,
      numericValue: avgDeal,
      unit: "currency",
      delta: "-3.2%",
      deltaPositive: false,
      drillHref: "/sales/deals",
      drillLabel: "Deals",
    },
    {
      id: "cycle",
      label: "Sales Cycle Length",
      value: `${cycle} days`,
      numericValue: cycle,
      unit: "days",
      delta: "-2 days",
      deltaPositive: true,
      hint: "Shorter is better",
      drillHref: "/sales/deals",
      drillLabel: "Deals",
    },
    {
      id: "velocity",
      label: "Pipeline Velocity",
      value: `$${velocity.toLocaleString("en-AU")}/wk`,
      numericValue: velocity,
      unit: "currency",
      delta: "+8%",
      deltaPositive: true,
      drillHref: "/sales/forecasting",
      drillLabel: "Forecasting",
    },
    {
      id: "activities",
      label: "Activities Completed",
      value: String(activities),
      numericValue: activities,
      unit: "count",
      delta: "+12%",
      deltaPositive: true,
      drillHref: "/activities/tasks",
      drillLabel: "Tasks",
    },
    {
      id: "overdue",
      label: "Tasks Overdue Rate",
      value: `${overdue}%`,
      numericValue: overdue,
      unit: "percent",
      delta: "-1.5%",
      deltaPositive: true,
      hint: "Lower is better",
      drillHref: "/activities/tasks",
      drillLabel: "Tasks",
    },
    {
      id: "emailOpen",
      label: "Email Open Rate",
      value: `${emailOpen}%`,
      numericValue: emailOpen,
      unit: "percent",
      delta: "+0.8%",
      deltaPositive: true,
      drillHref: "/marketing/email",
      drillLabel: "Email campaigns",
    },
    {
      id: "campaignRoi",
      label: "Campaign ROI",
      value: `${campaignRoi}x`,
      numericValue: campaignRoi,
      unit: "multiple",
      delta: "+0.3x",
      deltaPositive: true,
      drillHref: "/marketing/email",
      drillLabel: "Campaigns",
    },
    {
      id: "ticketTime",
      label: "Support Ticket Resolution Time",
      value: `${ticketTime} hrs`,
      numericValue: ticketTime,
      unit: "hours",
      delta: "-2.1 hrs",
      deltaPositive: true,
      hint: `${resolved} resolved · ${openish} open`,
      drillHref: "/support",
      drillLabel: "Support",
    },
    {
      id: "csat",
      label: "Customer Satisfaction Score",
      value: `${csat} / 5`,
      numericValue: csat,
      unit: "score",
      delta: "+0.2",
      deltaPositive: true,
      hint: "From Support §11 ratings",
      drillHref: "/support",
      drillLabel: "Support",
    },
  ];

  const revenueByMonth: RevenuePoint[] = [
    {
      month: "Jan",
      revenue: Math.round(180000 * teamScale * (opts.priorScale ?? 1)),
      target: 200000,
      prior: Math.round(165000 * teamScale),
    },
    {
      month: "Feb",
      revenue: Math.round(210000 * teamScale * (opts.priorScale ?? 1)),
      target: 200000,
      prior: Math.round(190000 * teamScale),
    },
    {
      month: "Mar",
      revenue: Math.round(195000 * teamScale * (opts.priorScale ?? 1)),
      target: 220000,
      prior: Math.round(200000 * teamScale),
    },
    {
      month: "Apr",
      revenue: Math.round(240000 * teamScale * (opts.priorScale ?? 1)),
      target: 220000,
      prior: Math.round(215000 * teamScale),
    },
    {
      month: "May",
      revenue: Math.round(255000 * teamScale * (opts.priorScale ?? 1)),
      target: 240000,
      prior: Math.round(230000 * teamScale),
    },
    {
      month: "Jun",
      revenue: Math.round(270000 * teamScale * (opts.priorScale ?? 1)),
      target: 240000,
      prior: Math.round(245000 * teamScale),
    },
    {
      month: "Jul",
      revenue: Math.round(298000 * ownerScale * (opts.priorScale ?? 1)),
      target: 260000,
      prior: Math.round(270000 * ownerScale),
    },
  ];

  const revenueBySource: SourceSlice[] = [
    { name: "Referral", value: Math.round(32 * ownerScale) },
    { name: "Website", value: Math.round(28 * teamScale) },
    {
      name: "Campaign",
      value: Math.round(22 * (opts.team === "Marketing" ? 1.3 : 1)),
    },
    { name: "Partner", value: 12 },
    { name: "Other", value: 6 },
  ];

  const revenueByOwner: OwnerSlice[] = [
    { name: "John Smith", revenue: Math.round(620000 * f) },
    { name: "Tejas Gokhe", revenue: Math.round(410000 * f) },
    { name: "Roshna Abraham", revenue: Math.round(355000 * f) },
    { name: "Shiva Kadhka", revenue: Math.round(290000 * f) },
  ].filter((u) => opts.owner === "All" || u.name === opts.owner);

  const topUsers: TopUserRow[] = [
    {
      name: "John Smith",
      dealsWon: Math.round(8 * f),
      revenue: Math.round(620000 * f),
      activities: Math.round(54 * f),
      href: "/team",
    },
    {
      name: "Tejas Gokhe",
      dealsWon: Math.round(6 * f),
      revenue: Math.round(410000 * f),
      activities: Math.round(48 * f),
      href: "/team",
    },
    {
      name: "Roshna Abraham",
      dealsWon: Math.round(5 * f),
      revenue: Math.round(355000 * f),
      activities: Math.round(61 * f),
      href: "/team",
    },
    {
      name: "Shiva Kadhka",
      dealsWon: Math.round(4 * f),
      revenue: Math.round(290000 * f),
      activities: Math.round(39 * f),
      href: "/team",
    },
  ].filter((u) => opts.owner === "All" || u.name === opts.owner);

  return {
    kpis,
    revenueByMonth,
    revenueBySource,
    revenueByOwner,
    topUsers,
    csat,
  };
}

/** Lower-is-better KPIs for benchmark vs actual */
export const LOWER_IS_BETTER = new Set(["cycle", "overdue", "ticketTime"]);

export function vsBenchmark(
  kpi: AnalyticsKpi,
  benchmarks: BenchmarkMap,
): "above" | "below" | "met" | null {
  const b = benchmarks[kpi.id];
  if (b == null || kpi.numericValue == null) return null;
  const v = kpi.numericValue;
  const tol = b * 0.02;
  if (LOWER_IS_BETTER.has(kpi.id)) {
    if (v <= b) return "above"; // beating target
    if (v <= b + tol) return "met";
    return "below";
  }
  if (v >= b) return "above";
  if (v >= b - tol) return "met";
  return "below";
}

export function formatBenchmark(kpi: AnalyticsKpi, n: number) {
  switch (kpi.unit) {
    case "percent":
      return `${n}%`;
    case "currency":
      return `$${n.toLocaleString("en-AU")}`;
    case "days":
      return `${n} days`;
    case "hours":
      return `${n} hrs`;
    case "multiple":
      return `${n}x`;
    case "score":
      return `${n} / 5`;
    default:
      return String(n);
  }
}

export function exportAnalyticsCsv(
  snap: ReturnType<typeof getAnalyticsSnapshot>,
  meta: { period: string; team: string; owner: string; compare: boolean },
) {
  const lines = [
    `"Period","${meta.period}"`,
    `"Team","${meta.team}"`,
    `"Owner","${meta.owner}"`,
    `"Compare periods","${meta.compare}"`,
    "",
    "KPI,Value,Delta,Drill",
    ...snap.kpis.map((k) =>
      [k.label, k.value, k.delta, k.drillHref]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    ),
    "",
    "Month,Revenue,Target,Prior",
    ...snap.revenueByMonth.map((r) =>
      [r.month, r.revenue, r.target, r.prior ?? ""]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    ),
    "",
    "Source,Share %",
    ...snap.revenueBySource.map((s) => `"${s.name}","${s.value}"`),
    "",
    "Owner,Revenue",
    ...snap.revenueByOwner.map(
      (o) => `"${o.name}","${o.revenue}"`,
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "analytics-dashboard.csv";
  a.click();
  URL.revokeObjectURL(url);
}
