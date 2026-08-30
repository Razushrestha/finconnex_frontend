import { type DashboardLiveStats } from "@/lib/dashboard/layout";

export type NamedValue = { name: string; value: number };

export type DashboardTrendPoint = {
  month: string;
  leads: number;
  deals: number;
  won: number;
};

export type DashboardChartData = {
  volumes: NamedValue[];
  values: NamedValue[];
  mix: NamedValue[];
  tasks: NamedValue[];
  conversion: NamedValue[];
  trend: DashboardTrendPoint[];
};

export function chartsFromStats(
  stats: DashboardLiveStats,
  trend: DashboardTrendPoint[] = [],
): DashboardChartData {
  const converted = Math.round((stats.conversionRate / 100) * stats.totalLeads);
  return {
    volumes: [
      { name: "Leads", value: stats.totalLeads },
      { name: "Contacts", value: stats.totalContacts },
      { name: "Companies", value: stats.totalCompanies },
      { name: "Deals", value: stats.totalDeals },
    ],
    values: [
      { name: "Pipeline", value: stats.pipelineValue },
      { name: "Won", value: stats.wonDealsValue },
    ],
    mix: [
      { name: "Leads", value: stats.totalLeads },
      { name: "Contacts", value: stats.totalContacts },
      { name: "Companies", value: stats.totalCompanies },
      { name: "Deals", value: stats.totalDeals },
    ],
    tasks: [
      { name: "Open", value: stats.openTasks },
      { name: "Overdue", value: stats.overdueTasks },
      { name: "Today", value: stats.activitiesToday },
    ],
    conversion: [
      { name: "Converted", value: converted },
      { name: "Open", value: Math.max(0, stats.totalLeads - converted) },
    ],
    trend: trend.length ? trend : fallbackTrend(stats),
  };
}

function fallbackTrend(stats: DashboardLiveStats): DashboardTrendPoint[] {
  const months = lastMonthLabels(6);
  return months.map((month, i) => {
    const weight = (i + 1) / months.length;
    return {
      month,
      leads: Math.round(stats.totalLeads * weight),
      deals: Math.round(stats.totalDeals * weight),
      won: Math.round(stats.wonDealsValue * weight),
    };
  });
}

export function lastMonthLabels(count: number): string[] {
  const now = new Date();
  const labels: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString("en-AU", { month: "short" }));
  }
  return labels;
}

export function monthBucket(iso?: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleString("en-AU", { month: "short" });
}

export function buildTrend(input: {
  leadDates: Array<string | undefined>;
  dealDates: Array<string | undefined>;
  wonByDate: Array<{ date?: string; value: number }>;
}): DashboardTrendPoint[] {
  const months = lastMonthLabels(6);
  const leads = new Map(months.map((m) => [m, 0]));
  const deals = new Map(months.map((m) => [m, 0]));
  const won = new Map(months.map((m) => [m, 0]));

  for (const iso of input.leadDates) {
    const key = monthBucket(iso);
    if (key && leads.has(key)) leads.set(key, (leads.get(key) ?? 0) + 1);
  }
  for (const iso of input.dealDates) {
    const key = monthBucket(iso);
    if (key && deals.has(key)) deals.set(key, (deals.get(key) ?? 0) + 1);
  }
  for (const row of input.wonByDate) {
    const key = monthBucket(row.date);
    if (key && won.has(key)) won.set(key, (won.get(key) ?? 0) + row.value);
  }

  return months.map((month) => ({
    month,
    leads: leads.get(month) ?? 0,
    deals: deals.get(month) ?? 0,
    won: won.get(month) ?? 0,
  }));
}
