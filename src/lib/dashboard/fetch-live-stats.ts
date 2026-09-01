/** Overlay dashboard KPIs from live CRM lists + analytics. */

import { fetchWorkspaceActivityTimeline } from "@/lib/activity-timeline";
import {
  analyticsPeriodRange,
  type AnalyticsWidgetResponse,
} from "@/lib/analytics/crm";
import { ensureCrmSession } from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import { listCrmCompanies } from "@/lib/companies/api";
import { listCrmContacts } from "@/lib/contacts/api";
import { listCrmDeals } from "@/lib/deals/api";
import { listCrmInvoices } from "@/lib/finance/invoices/api";
import { fetchLeadList } from "@/lib/leads/api/client";
import {
  buildTrend,
  chartsFromStats,
  type DashboardChartData,
} from "@/lib/dashboard/charts";
import {
  computeDashboardStats,
  parseMoney,
  type DashboardFilters,
  type DashboardLiveStats,
} from "@/lib/dashboard/layout";
import {
  industryTiles,
  loadIndustryPreset,
  type DashboardIndustryTile,
  type IndustryExtras,
} from "@/lib/dashboard/industry";
import {
  listCrmTasks,
  listCrmTasksToday,
  listOverdueCrmTasks,
  tryCrmTask,
} from "@/lib/tasks/api";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";
import type { WorkspaceMember } from "@/lib/workspace-members/types";

export type DashboardDataSource = "api" | "demo" | "partial";

export type LiveDashboardSnapshot = {
  stats: DashboardLiveStats;
  source: DashboardDataSource;
  industryTiles: DashboardIndustryTile[];
  charts: DashboardChartData;
  owners: string[];
  liveHits: string[];
};

async function settle<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function inDateRange(iso: string | undefined, start: Date | null): boolean {
  if (!start || !iso) return true;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true;
  return t >= start.getTime();
}

function rangeStart(range: DashboardFilters["dateRange"]): Date | null {
  const now = new Date();
  if (range === "all") return null;
  if (range === "ytd") return new Date(now.getFullYear(), 0, 1);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

function todayIsoRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function analyticsPeriod(range: DashboardFilters["dateRange"]) {
  if (range === "7d") return "7d" as const;
  if (range === "90d") return "quarter" as const;
  if (range === "ytd" || range === "all") return "year" as const;
  return "30d" as const;
}

async function fetchAnalyticsWidget(
  range: DashboardFilters["dateRange"],
  widget: string,
): Promise<AnalyticsWidgetResponse | null> {
  const session = await ensureCrmSession();
  if (!session) return null;
  const window = analyticsPeriodRange(analyticsPeriod(range));
  const params = new URLSearchParams({
    widget,
    startDate: window.startDate,
    endDate: window.endDate,
  });
  return crmFetch<AnalyticsWidgetResponse>(
    session,
    `/v1/analytics?${params.toString()}`,
  );
}

function widgetNumber(data: AnalyticsWidgetResponse | null): number | null {
  const raw = data?.period?.value;
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw)
        : NaN;
  if (!Number.isFinite(n)) return null;
  return n;
}

async function fetchLeadConversionRate(
  range: DashboardFilters["dateRange"],
): Promise<number | null> {
  const n = widgetNumber(await fetchAnalyticsWidget(range, "LEAD_CONVERSION_RATE"));
  if (n == null) return null;
  return n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
}

function ownerMatch(
  owner: string | null,
  value: string | null | undefined,
  ownerId: string | null | undefined,
  members: WorkspaceMember[],
): boolean {
  if (!owner) return true;
  const needle = owner.toLowerCase();
  if (value && value.toLowerCase() === needle) return true;
  if (ownerId && ownerId.toLowerCase() === needle) return true;
  const member = members.find(
    (m) => m.name.toLowerCase() === needle || m.email.toLowerCase() === needle,
  );
  if (!member) return false;
  return (
    ownerId === member.userId ||
    ownerId === member.id ||
    (value ?? "").toLowerCase() === member.name.toLowerCase()
  );
}

function teamOwnerNames(
  team: DashboardFilters["team"],
  members: WorkspaceMember[],
): Set<string> | null {
  if (team === "All teams") return null;
  const names = members
    .filter((m) => (m.team ?? "").toLowerCase() === team.toLowerCase())
    .flatMap((m) => [m.name, m.email, m.userId, m.id]);
  return names.length ? new Set(names.map((n) => n.toLowerCase())) : new Set();
}

export async function fetchLiveDashboardSnapshot(
  filters: DashboardFilters,
): Promise<LiveDashboardSnapshot> {
  const demo = computeDashboardStats(filters);
  const start = rangeStart(filters.dateRange);
  const owner = filters.owner === "All" ? null : filters.owner;

  const [
    leads,
    contacts,
    companies,
    deals,
    tasks,
    tasksToday,
    overdue,
    members,
    invoices,
    conversion,
    todayTimeline,
    revenueByMonth,
  ] = await Promise.all([
    settle(() => fetchLeadList({ limit: 100 })),
    settle(() => listCrmContacts({ limit: 100 })),
    settle(() => listCrmCompanies({ limit: 100 })),
    settle(() => listCrmDeals({ limit: 100 })),
    settle(() => listCrmTasks({ limit: 100 })),
    settle(() => tryCrmTask(() => listCrmTasksToday())),
    settle(() => tryCrmTask(() => listOverdueCrmTasks())),
    settle(() => listCrmWorkspaceMembers()),
    settle(() => listCrmInvoices({ limit: 100 })),
    settle(() => fetchLeadConversionRate(filters.dateRange)),
    settle(() => {
      const { from, to } = todayIsoRange();
      return fetchWorkspaceActivityTimeline({ page: 1, limit: 1, from, to });
    }),
    settle(() => fetchAnalyticsWidget(filters.dateRange, "REVENUE_BY_MONTH")),
  ]);

  const liveHits: string[] = [];
  if (leads) liveHits.push("leads");
  if (contacts) liveHits.push("contacts");
  if (companies) liveHits.push("companies");
  if (deals) liveHits.push("deals");
  if (tasks) liveHits.push("tasks");
  if (overdue) liveHits.push("overdue-tasks");
  if (tasksToday) liveHits.push("tasks-today");
  if (conversion != null) liveHits.push("conversion");
  if (todayTimeline) liveHits.push("activities-today");
  if (invoices) liveHits.push("invoices");
  if (revenueByMonth) liveHits.push("revenue-trend");

  const memberList = members ?? [];
  const teamNames = teamOwnerNames(filters.team, memberList);

  function allowOwner(value?: string | null, ownerId?: string | null) {
    if (teamNames) {
      const keys = [value, ownerId].filter(Boolean).map((v) => v!.toLowerCase());
      if (!keys.some((k) => teamNames.has(k))) return false;
    }
    return ownerMatch(owner, value, ownerId, memberList);
  }

  const stats: DashboardLiveStats = { ...demo };
  let leadDates: Array<string | undefined> = [];
  let dealDates: Array<string | undefined> = [];
  let wonByDate: Array<{ date?: string; value: number }> = [];

  if (leads) {
    const rows = leads.filter(
      (l) =>
        allowOwner(null, l.ownerId) && inDateRange(l.createdAt, start),
    );
    stats.totalLeads = rows.length;
    leadDates = rows.map((l) => l.createdAt);
    const converted = rows.filter(
      (l) =>
        l.isConverted ||
        String(l.status).toUpperCase() === "CONVERTED",
    ).length;
    stats.conversionRate =
      rows.length === 0 ? 0 : Math.round((converted / rows.length) * 1000) / 10;
  }

  if (contacts) {
    stats.totalContacts = contacts.filter(
      (c) =>
        allowOwner(c.contact.owner) &&
        inDateRange(c.contact.createdDate, start),
    ).length;
  }

  if (companies) {
    stats.totalCompanies = companies.filter((c) =>
      allowOwner(c.company.owner),
    ).length;
  }

  if (deals) {
    const rows = deals.filter(
      (d) => allowOwner(d.owner) && inDateRange(d.closeDate, start),
    );
    stats.totalDeals = rows.length;
    dealDates = rows.map((d) => d.closeDate);
    stats.pipelineValue = rows
      .filter((d) => d.stageTitle !== "Closed Won" && d.stageTitle !== "Closed Lost")
      .reduce((n, d) => n + parseMoney(d.value), 0);
    const wonRows = rows.filter((d) => d.stageTitle === "Closed Won");
    stats.wonDealsValue = wonRows.reduce((n, d) => n + parseMoney(d.value), 0);
    wonByDate = wonRows.map((d) => ({
      date: d.closeDate,
      value: parseMoney(d.value),
    }));
  }

  if (tasks) {
    const rows = tasks.filter((t) => allowOwner(t.assignedTo));
    stats.openTasks = rows.filter(
      (t) => t.status !== "Completed" && t.status !== "Cancelled",
    ).length;
  }
  if (overdue) {
    stats.overdueTasks = overdue.filter((t) => allowOwner(t.assignedTo)).length;
  }
  if (tasksToday && !todayTimeline) {
    stats.activitiesToday = tasksToday.filter((t) =>
      allowOwner(t.assignedTo),
    ).length;
  }
  if (todayTimeline) {
    stats.activitiesToday = todayTimeline.metadata.totalItems;
  }
  if (conversion != null) {
    stats.conversionRate = conversion;
  }

  const extras: IndustryExtras = {};
  if (invoices) {
    extras.openInvoices = invoices.filter(
      (inv) => inv.status !== "Paid" && inv.status !== "Cancelled" && inv.status !== "Void",
    ).length;
    extras.overdueInvoices = invoices.filter((inv) => inv.status === "Overdue").length;
  }

  const source: DashboardDataSource =
    liveHits.length === 0
      ? "demo"
      : liveHits.length >= 6
        ? "api"
        : "partial";

  const owners = [
    "All",
    ...new Set(
      memberList
        .map((m) => m.name)
        .filter(Boolean)
        .concat(demo.filteredOwner === "All" ? [] : [demo.filteredOwner]),
    ),
  ];

  let trend = buildTrend({ leadDates, dealDates, wonByDate });
  const monthRows = Array.isArray(revenueByMonth?.period?.value)
    ? (revenueByMonth.period.value as unknown[])
    : [];
  if (monthRows.length) {
    trend = trend.map((point, i) => {
      const row = monthRows[i];
      const rec = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      const revenue =
        typeof rec.revenue === "number"
          ? rec.revenue
          : typeof rec.value === "number"
            ? rec.value
            : point.won;
      return { ...point, won: Number.isFinite(revenue) ? Number(revenue) : point.won };
    });
  }
  const trendHasData = trend.some((p) => p.leads || p.deals || p.won);

  return {
    stats,
    source,
    industryTiles: industryTiles(loadIndustryPreset(), stats, extras),
    charts: chartsFromStats(stats, trendHasData ? trend : []),
    owners: owners.length > 1 ? owners : [],
    liveHits,
  };
}
