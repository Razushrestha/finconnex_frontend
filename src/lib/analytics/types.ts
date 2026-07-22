/** SRS §15 Analytics — pre-built KPI dashboard (mock) */

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
  delta: string;
  deltaPositive: boolean;
  hint?: string;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  target: number;
}

export interface SourceSlice {
  name: string;
  value: number;
}

export interface TopUserRow {
  name: string;
  dealsWon: number;
  revenue: number;
  activities: number;
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

export function getAnalyticsSnapshot(opts: {
  period: AnalyticsPeriod;
  team: AnalyticsTeam;
  owner: string;
}) {
  const f = periodFactor(opts.period);
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

  const kpis: AnalyticsKpi[] = [
    {
      id: "leadConv",
      label: "Lead Conversion Rate",
      value: `${Math.min(48, Math.round(21 * ownerScale))}%`,
      delta: "+2.4%",
      deltaPositive: true,
    },
    {
      id: "winRate",
      label: "Deal Win Rate",
      value: `${Math.min(55, Math.round(28 * ownerScale))}%`,
      delta: "+1.1%",
      deltaPositive: true,
    },
    {
      id: "avgDeal",
      label: "Average Deal Size",
      value: `$${Math.round(86400 * ownerScale).toLocaleString("en-AU")}`,
      delta: "-3.2%",
      deltaPositive: false,
    },
    {
      id: "cycle",
      label: "Sales Cycle Length",
      value: `${Math.round(34 / ownerScale)} days`,
      delta: "-2 days",
      deltaPositive: true,
      hint: "Shorter is better",
    },
    {
      id: "velocity",
      label: "Pipeline Velocity",
      value: `$${Math.round((42000 * scale) / 7).toLocaleString("en-AU")}/wk`,
      delta: "+8%",
      deltaPositive: true,
    },
    {
      id: "activities",
      label: "Activities Completed",
      value: String(Math.round(178 * scale)),
      delta: "+12%",
      deltaPositive: true,
    },
    {
      id: "overdue",
      label: "Tasks Overdue Rate",
      value: `${Math.max(4, Math.round(9 / ownerScale))}%`,
      delta: "-1.5%",
      deltaPositive: true,
      hint: "Lower is better",
    },
    {
      id: "emailOpen",
      label: "Email Open Rate",
      value: `${Math.round(38 * (opts.team === "Marketing" ? 1.1 : 1))}%`,
      delta: "+0.8%",
      deltaPositive: true,
    },
    {
      id: "campaignRoi",
      label: "Campaign ROI",
      value: `${(2.4 * (opts.team === "Marketing" ? 1.2 : 1)).toFixed(1)}x`,
      delta: "+0.3x",
      deltaPositive: true,
    },
    {
      id: "ticketTime",
      label: "Support Ticket Resolution Time",
      value: `${Math.max(8, Math.round(16.5 / (opts.team === "Support" ? 1.2 : 1)))} hrs`,
      delta: "-2.1 hrs",
      deltaPositive: true,
      hint: `${resolved} resolved · ${openish} open`,
    },
    {
      id: "csat",
      label: "Customer Satisfaction Score",
      value: `${csat} / 5`,
      delta: "+0.2",
      deltaPositive: true,
      hint: "From Support §11 ratings",
    },
  ];

  const revenueByMonth: RevenuePoint[] = [
    { month: "Jan", revenue: Math.round(180000 * teamScale), target: 200000 },
    { month: "Feb", revenue: Math.round(210000 * teamScale), target: 200000 },
    { month: "Mar", revenue: Math.round(195000 * teamScale), target: 220000 },
    { month: "Apr", revenue: Math.round(240000 * teamScale), target: 220000 },
    { month: "May", revenue: Math.round(255000 * teamScale), target: 240000 },
    { month: "Jun", revenue: Math.round(270000 * teamScale), target: 240000 },
    { month: "Jul", revenue: Math.round(298000 * ownerScale), target: 260000 },
  ];

  const revenueBySource: SourceSlice[] = [
    { name: "Referral", value: Math.round(32 * ownerScale) },
    { name: "Website", value: Math.round(28 * teamScale) },
    { name: "Campaign", value: Math.round(22 * (opts.team === "Marketing" ? 1.3 : 1)) },
    { name: "Partner", value: 12 },
    { name: "Other", value: 6 },
  ];

  const topUsers: TopUserRow[] = [
    {
      name: "John Smith",
      dealsWon: Math.round(8 * f),
      revenue: Math.round(620000 * f),
      activities: Math.round(54 * f),
    },
    {
      name: "Tejas Gokhe",
      dealsWon: Math.round(6 * f),
      revenue: Math.round(410000 * f),
      activities: Math.round(48 * f),
    },
    {
      name: "Roshna Abraham",
      dealsWon: Math.round(5 * f),
      revenue: Math.round(355000 * f),
      activities: Math.round(61 * f),
    },
    {
      name: "Shiva Kadhka",
      dealsWon: Math.round(4 * f),
      revenue: Math.round(290000 * f),
      activities: Math.round(39 * f),
    },
  ].filter((u) => opts.owner === "All" || u.name === opts.owner);

  return { kpis, revenueByMonth, revenueBySource, topUsers, csat };
}
