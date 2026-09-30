import type { AnalyticsSectionId } from "@/lib/analytics/library";
import { computeBusinessAnalytics } from "@/lib/analytics/business";
import {
  computeActivityAnalytics,
  defaultActivityAnalyticsFilters,
} from "@/lib/analytics/activity";
import { computeCustomerAnalytics } from "@/lib/analytics/customers";
import {
  computeTeamAnalytics,
  defaultTeamAnalyticsFilters,
  formatDuration,
} from "@/lib/analytics/team";
import {
  dateRangeBounds,
  formatCurrency,
  previousDateRangeBounds,
  type DashboardDateRange,
} from "@/lib/dashboard/layout";
import {
  loadActivities,
  loadCampaigns,
  loadDeals,
  loadLeads,
} from "@/lib/reports/library/records";
import { listDocumentRequests } from "@/lib/documents/requests/types";
import { parseDate } from "@/lib/reports/library/format";

export type SectionPageFilters = {
  dateRange: DashboardDateRange;
  dateFrom?: string;
  dateTo?: string;
  owner: string;
};

export type SectionKpi = {
  id: string;
  label: string;
  value: string;
  delta: number;
  previous: string;
  points?: boolean;
  spark?: number[];
};

export type SectionPageModel = {
  comparisonShort: string;
  kpis: SectionKpi[];
  trend: { label: string; primary: number; secondary: number }[];
  primaryLegend: string;
  secondaryLegend: string;
  primaryMoney?: boolean;
  secondaryMoney?: boolean;
  trendTitle: string;
  slices: { name: string; value: number }[];
  sliceTotal: number;
  sliceTitle: string;
  sliceEmpty: string;
  sliceCenter: string;
  sliceMoney?: boolean;
  funnel: { label: string; value: number; pct: number }[];
  funnelTitle: string;
  funnelFooterLabel: string;
  funnelFooterValue: string;
  list: { name: string; detail: string; bar: number }[];
  listTitle: string;
  listEmpty: string;
};

function inBounds(at: Date | null, start: Date | null, end: Date | null) {
  if (!at) return !start;
  if (start && at < start) return false;
  if (end && at > end) return false;
  return true;
}

function deltaPct(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function deltaPoints(current: number, previous: number) {
  return Math.round((current - previous) * 10) / 10;
}

function ownerOk(owner: string, filter: string) {
  return filter === "All" || owner === filter;
}

function monthKey(at: Date) {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleDateString("en-AU", { month: "short" });
}

function funnelOf(rows: { label: string; value: number }[]) {
  const top = rows[0]?.value || 1;
  return rows.map((row, i) => ({
    ...row,
    pct: i === 0 && row.value ? 100 : Math.round((row.value / top) * 1000) / 10,
  }));
}

function sparkFrom(
  trend: { primary: number; secondary?: number }[],
  pick: (row: { primary: number; secondary?: number }) => number | undefined,
) {
  return trend.map((row) => pick(row) ?? 0);
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = key(row) || "Other";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function sumBy<T>(rows: T[], key: (row: T) => string, amount: (row: T) => number) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = key(row) || "Other";
    map.set(name, (map.get(name) ?? 0) + amount(row));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function fillMonths(
  start: Date | null,
  end: Date,
  bump: (key: string, at: Date) => void,
) {
  const keys = new Set<string>();
  if (start) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= last) {
      keys.add(monthKey(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return keys;
}

function leadsCompute(filters: SectionPageFilters, now: Date): SectionPageModel {
  const bounds = dateRangeBounds(filters, now);
  const previous = previousDateRangeBounds(filters, now);
  const all = loadLeads(now).filter((lead) => ownerOk(lead.owner, filters.owner));
  const current = all.filter((lead) => inBounds(lead.createdAt, bounds.start, bounds.end));
  const prior = previous
    ? all.filter((lead) => inBounds(lead.createdAt, previous.start, previous.end))
    : [];
  const converted = current.filter((lead) => lead.converted);
  const priorConverted = prior.filter((lead) => lead.converted);
  const lost = current.filter((lead) => /lost|unqualified/i.test(lead.status) || lead.lostReason);
  const contacted = current.filter(
    (lead) =>
      lead.converted ||
      !["New", "New Lead", "Unqualified"].includes(lead.status),
  );
  const conversion = current.length ? Math.round((converted.length / current.length) * 1000) / 10 : 0;
  const priorConv = prior.length ? Math.round((priorConverted.length / prior.length) * 1000) / 10 : 0;
  const avgAge = current.length
    ? Math.round(current.reduce((n, lead) => n + lead.ageDays, 0) / current.length)
    : 0;
  const buckets = new Map<string, { primary: number; secondary: number }>();
  for (const key of fillMonths(bounds.start, bounds.end, () => undefined)) {
    buckets.set(key, { primary: 0, secondary: 0 });
  }
  for (const lead of current) {
    if (!lead.createdAt) continue;
    const key = monthKey(lead.createdAt);
    const row = buckets.get(key) ?? { primary: 0, secondary: 0 };
    row.primary += 1;
    if (lead.converted) row.secondary += 1;
    buckets.set(key, row);
  }
  const trend = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => ({ label: monthLabel(key), ...row }));
  const slices = countBy(current, (lead) => lead.source);
  const reasons = countBy(
    lost.filter((lead) => lead.lostReason),
    (lead) => lead.lostReason,
  );
  const maxReason = Math.max(1, ...reasons.map((row) => row.value));
  return {
    comparisonShort: previous ? "last period" : "",
    kpis: [
      {
        id: "new",
        label: "New leads",
        value: String(current.length),
        delta: deltaPct(current.length, prior.length),
        previous: String(prior.length),
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "converted",
        label: "Converted",
        value: String(converted.length),
        delta: deltaPct(converted.length, priorConverted.length),
        previous: String(priorConverted.length),
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "rate",
        label: "Conversion",
        value: `${conversion}%`,
        delta: deltaPoints(conversion, priorConv),
        previous: `${priorConv}%`,
        points: true,
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "age",
        label: "Avg age (days)",
        value: String(avgAge),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "lost",
        label: "Lost / unqualified",
        value: String(lost.length),
        delta: deltaPct(lost.length, prior.filter((l) => l.lostReason).length),
        previous: String(prior.filter((l) => l.lostReason).length),
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "sources",
        label: "Active sources",
        value: String(slices.length),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.primary),
      },
    ],
    trend,
    primaryLegend: "Leads",
    secondaryLegend: "Converted",
    trendTitle: "Lead volume & conversion",
    slices,
    sliceTotal: current.length,
    sliceTitle: "Leads by source",
    sliceEmpty: "No leads in this range.",
    sliceCenter: "Leads",
    funnel: funnelOf([
      { label: "New leads", value: current.length },
      { label: "Contacted", value: contacted.length },
      { label: "Qualified", value: contacted.filter((l) => l.converted || /qualif|proposal|doc/i.test(l.status)).length },
      { label: "Converted", value: converted.length },
    ]),
    funnelTitle: "Lead funnel",
    funnelFooterLabel: "Avg lead age",
    funnelFooterValue: `${avgAge} days`,
    list: reasons.map((row) => ({
      name: row.name,
      detail: `${row.value} lost`,
      bar: (row.value / maxReason) * 100,
    })),
    listTitle: "Lost reasons",
    listEmpty: "No lost reasons in this range.",
  };
}

function dealsCompute(filters: SectionPageFilters, now: Date): SectionPageModel {
  const bounds = dateRangeBounds(filters, now);
  const previous = previousDateRangeBounds(filters, now);
  const all = loadDeals(now).filter((deal) => ownerOk(deal.owner, filters.owner));
  const open = all.filter((deal) => !deal.won && !deal.lost);
  const won = all.filter((deal) => deal.won && inBounds(deal.closeAt, bounds.start, bounds.end));
  const lost = all.filter((deal) => deal.lost && inBounds(deal.closeAt, bounds.start, bounds.end));
  const priorWon = previous
    ? all.filter((deal) => deal.won && inBounds(deal.closeAt, previous.start, previous.end))
    : [];
  const priorLost = previous
    ? all.filter((deal) => deal.lost && inBounds(deal.closeAt, previous.start, previous.end))
    : [];
  const closed = won.length + lost.length;
  const priorClosed = priorWon.length + priorLost.length;
  const winRate = closed ? Math.round((won.length / closed) * 1000) / 10 : 0;
  const priorWin = priorClosed ? Math.round((priorWon.length / priorClosed) * 1000) / 10 : 0;
  const pipeline = open.reduce((n, deal) => n + deal.weighted, 0);
  const revenue = won.reduce((n, deal) => n + deal.value, 0);
  const avgCycle = won.length
    ? Math.round(won.reduce((n, deal) => n + deal.ageDays, 0) / won.length)
    : 0;
  const buckets = new Map<string, { primary: number; secondary: number }>();
  for (const key of fillMonths(bounds.start, bounds.end, () => undefined)) {
    buckets.set(key, { primary: 0, secondary: 0 });
  }
  for (const deal of won) {
    if (!deal.closeAt) continue;
    const key = monthKey(deal.closeAt);
    const row = buckets.get(key) ?? { primary: 0, secondary: 0 };
    row.primary += deal.value;
    row.secondary += 1;
    buckets.set(key, row);
  }
  const trend = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => ({ label: monthLabel(key), ...row }));
  const slices = countBy(open.length ? open : all, (deal) => deal.stage);
  const owners = sumBy(won, (deal) => deal.owner, (deal) => deal.value);
  const maxOwner = Math.max(1, ...owners.map((row) => row.value));
  return {
    comparisonShort: previous ? "last period" : "",
    kpis: [
      {
        id: "open",
        label: "Open deals",
        value: String(open.length),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "pipe",
        label: "Pipeline",
        value: formatCurrency(pipeline),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "won",
        label: "Won",
        value: String(won.length),
        delta: deltaPct(won.length, priorWon.length),
        previous: String(priorWon.length),
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "lost",
        label: "Lost",
        value: String(lost.length),
        delta: deltaPct(lost.length, priorLost.length),
        previous: String(priorLost.length),
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "win",
        label: "Win rate",
        value: `${winRate}%`,
        delta: deltaPoints(winRate, priorWin),
        previous: `${priorWin}%`,
        points: true,
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "cycle",
        label: "Avg cycle (days)",
        value: String(avgCycle),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.secondary),
      },
    ],
    trend,
    primaryLegend: "Won value",
    secondaryLegend: "Won deals",
    primaryMoney: true,
    trendTitle: "Pipeline wins over time",
    slices,
    sliceTotal: slices.reduce((n, row) => n + row.value, 0),
    sliceTitle: "Deals by stage",
    sliceEmpty: "No deals in this range.",
    sliceCenter: "Deals",
    funnel: funnelOf([
      { label: "Open", value: open.length },
      { label: "Closing", value: open.filter((d) => d.probability >= 50).length },
      { label: "Won", value: won.length },
      { label: "Lost", value: lost.length },
    ]),
    funnelTitle: "Deal funnel",
    funnelFooterLabel: "Won revenue",
    funnelFooterValue: formatCurrency(revenue),
    list: owners.map((row) => ({
      name: row.name,
      detail: formatCurrency(row.value),
      bar: (row.value / maxOwner) * 100,
    })),
    listTitle: "Wins by owner",
    listEmpty: "No won deals in this range.",
  };
}

function marketingCompute(filters: SectionPageFilters, now: Date): SectionPageModel {
  const bounds = dateRangeBounds(filters, now);
  const previous = previousDateRangeBounds(filters, now);
  const campaigns = loadCampaigns().filter((row) => inBounds(row.createdAt, bounds.start, bounds.end));
  const prior = previous
    ? loadCampaigns().filter((row) => inBounds(row.createdAt, previous.start, previous.end))
    : [];
  const leads = loadLeads(now).filter((lead) => inBounds(lead.createdAt, bounds.start, bounds.end));
  const sent = campaigns.reduce((n, row) => n + row.sent, 0);
  const engaged = campaigns.reduce((n, row) => n + row.engaged, 0);
  const priorSent = prior.reduce((n, row) => n + row.sent, 0);
  const priorEngaged = prior.reduce((n, row) => n + row.engaged, 0);
  const cpl = leads.length ? Math.round(sent / Math.max(leads.length, 1)) : 0;
  const conv = sent ? Math.round((leads.length / sent) * 1000) / 10 : 0;
  const settled = leads.filter((lead) => lead.converted).length;
  const buckets = new Map<string, { primary: number; secondary: number }>();
  for (const key of fillMonths(bounds.start, bounds.end, () => undefined)) {
    buckets.set(key, { primary: 0, secondary: 0 });
  }
  for (const row of campaigns) {
    if (!row.createdAt) continue;
    const key = monthKey(row.createdAt);
    const bucket = buckets.get(key) ?? { primary: 0, secondary: 0 };
    bucket.primary += row.sent;
    bucket.secondary += row.engaged;
    buckets.set(key, bucket);
  }
  const trend = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => ({ label: monthLabel(key), ...row }));
  const slices = countBy(campaigns, (row) => row.channel);
  const maxCamp = Math.max(1, ...campaigns.map((row) => row.engaged || row.sent || 1));
  return {
    comparisonShort: previous ? "last period" : "",
    kpis: [
      {
        id: "campaigns",
        label: "Campaigns",
        value: String(campaigns.length),
        delta: deltaPct(campaigns.length, prior.length),
        previous: String(prior.length),
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "sent",
        label: "Messages sent",
        value: String(sent),
        delta: deltaPct(sent, priorSent),
        previous: String(priorSent),
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "engaged",
        label: "Engaged",
        value: String(engaged),
        delta: deltaPct(engaged, priorEngaged),
        previous: String(priorEngaged),
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "leads",
        label: "Leads from period",
        value: String(leads.length),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "cpl",
        label: "Send per lead",
        value: String(cpl),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "conv",
        label: "Lead conversion",
        value: `${conv}%`,
        delta: 0,
        previous: "—",
        points: true,
        spark: sparkFrom(trend, (r) => r.secondary),
      },
    ],
    trend,
    primaryLegend: "Sent",
    secondaryLegend: "Engaged",
    trendTitle: "Campaign reach",
    slices,
    sliceTotal: campaigns.length,
    sliceTitle: "Campaigns by channel",
    sliceEmpty: "No campaigns in this range.",
    sliceCenter: "Campaigns",
    funnel: funnelOf([
      { label: "Sent", value: sent },
      { label: "Engaged", value: engaged },
      { label: "Leads", value: leads.length },
      { label: "Settled", value: settled },
    ]),
    funnelTitle: "Marketing funnel",
    funnelFooterLabel: "Settled from leads",
    funnelFooterValue: String(settled),
    list: campaigns.slice(0, 8).map((row) => ({
      name: row.name,
      detail: `${row.channel} · ${row.engaged} engaged`,
      bar: ((row.engaged || row.sent || 0) / maxCamp) * 100,
    })),
    listTitle: "Campaigns",
    listEmpty: "No campaigns in this range.",
  };
}

function revenueCompute(filters: SectionPageFilters, now: Date): SectionPageModel {
  const biz = computeBusinessAnalytics(filters, now);
  const max = Math.max(1, ...biz.owners.map((row) => row.revenue));
  return {
    comparisonShort: biz.comparisonShort.replace(/^vs\s+/i, ""),
    kpis: biz.kpis.map((kpi) => ({
      id: kpi.id,
      label: kpi.label,
      value: kpi.value,
      delta: kpi.delta,
      previous: kpi.previous,
      points: kpi.points,
      spark: kpi.spark,
    })),
    trend: biz.trend.map((row) => ({
      label: row.label,
      primary: row.revenue,
      secondary: row.settlements,
    })),
    primaryLegend: "Revenue",
    secondaryLegend: "Settlements",
    primaryMoney: true,
    trendTitle: "Revenue trend",
    slices: biz.sources.map((row) => ({ name: row.name, value: row.revenue })),
    sliceTotal: biz.sourceTotal,
    sliceTitle: "Revenue by source",
    sliceEmpty: "No settlements in this range.",
    sliceCenter: "Settled",
    sliceMoney: true,
    funnel: biz.funnel,
    funnelTitle: "Conversion funnel",
    funnelFooterLabel: "Avg settled deal",
    funnelFooterValue: biz.avgDeal,
    list: biz.owners.map((row) => ({
      name: row.name,
      detail: `${formatCurrency(row.revenue)} · ${row.settlements} settled`,
      bar: (row.revenue / max) * 100,
    })),
    listTitle: "Revenue by owner",
    listEmpty: "No settlements in this range.",
  };
}

function operationsCompute(filters: SectionPageFilters, now: Date): SectionPageModel {
  const bounds = dateRangeBounds(filters, now);
  const previous = previousDateRangeBounds(filters, now);
  const all = listDocumentRequests();
  const current = all.filter((row) => inBounds(parseDate(row.requestedDate), bounds.start, bounds.end));
  const prior = previous
    ? all.filter((row) => inBounds(parseDate(row.requestedDate), previous.start, previous.end))
    : [];
  const received = current.filter((row) => row.status === "Received" || row.status === "Approved");
  const approved = current.filter((row) => row.status === "Approved");
  const pending = current.filter((row) => row.status === "Pending" || row.status === "Requested");
  const overdue = current.filter((row) => {
    const due = parseDate(row.dueDate);
    return due && due < now && row.status !== "Approved";
  });
  const buckets = new Map<string, { primary: number; secondary: number }>();
  for (const key of fillMonths(bounds.start, bounds.end, () => undefined)) {
    buckets.set(key, { primary: 0, secondary: 0 });
  }
  for (const row of current) {
    const at = parseDate(row.requestedDate);
    if (!at) continue;
    const key = monthKey(at);
    const bucket = buckets.get(key) ?? { primary: 0, secondary: 0 };
    bucket.primary += 1;
    if (row.status === "Approved") bucket.secondary += 1;
    buckets.set(key, bucket);
  }
  const trend = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => ({ label: monthLabel(key), ...row }));
  const slices = countBy(current, (row) => row.status);
  const types = countBy(current, (row) => row.documentType);
  const maxType = Math.max(1, ...types.map((row) => row.value));
  return {
    comparisonShort: previous ? "last period" : "",
    kpis: [
      {
        id: "req",
        label: "Requests",
        value: String(current.length),
        delta: deltaPct(current.length, prior.length),
        previous: String(prior.length),
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "pending",
        label: "In progress",
        value: String(pending.length),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "received",
        label: "Received",
        value: String(received.length),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "approved",
        label: "Completed",
        value: String(approved.length),
        delta: deltaPct(approved.length, prior.filter((r) => r.status === "Approved").length),
        previous: String(prior.filter((r) => r.status === "Approved").length),
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "overdue",
        label: "Overdue",
        value: String(overdue.length),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "progress",
        label: "Avg progress",
        value: `${current.length ? Math.round(current.reduce((n, r) => n + r.progress, 0) / current.length) : 0}%`,
        delta: 0,
        previous: "—",
        points: true,
        spark: sparkFrom(trend, (r) => r.secondary),
      },
    ],
    trend,
    primaryLegend: "Requested",
    secondaryLegend: "Completed",
    trendTitle: "Document turnaround",
    slices,
    sliceTotal: current.length,
    sliceTitle: "Requests by status",
    sliceEmpty: "No document requests in this range.",
    sliceCenter: "Requests",
    funnel: funnelOf([
      { label: "Requested", value: current.length },
      { label: "In progress", value: pending.length },
      { label: "Received", value: received.length },
      { label: "Completed", value: approved.length },
    ]),
    funnelTitle: "Operations funnel",
    funnelFooterLabel: "Overdue packs",
    funnelFooterValue: String(overdue.length),
    list: types.map((row) => ({
      name: row.name,
      detail: `${row.value} requests`,
      bar: (row.value / maxType) * 100,
    })),
    listTitle: "By document type",
    listEmpty: "No document requests in this range.",
  };
}

function forecastCompute(filters: SectionPageFilters, now: Date): SectionPageModel {
  const bounds = dateRangeBounds(filters, now);
  const deals = loadDeals(now).filter((deal) => ownerOk(deal.owner, filters.owner));
  const open = deals.filter((deal) => !deal.won && !deal.lost);
  const weighted = open.reduce((n, deal) => n + deal.weighted, 0);
  const risky = open.filter((deal) => deal.ageDays > 45 || deal.probability < 40);
  const predicted = open.filter((deal) => deal.probability >= 70);
  const won = deals.filter((deal) => deal.won && inBounds(deal.closeAt, bounds.start, bounds.end));
  const activities = loadActivities();
  const overdueActs = activities.filter((row) => row.overdue).length;
  const buckets = new Map<string, { primary: number; secondary: number }>();
  for (const key of fillMonths(bounds.start ?? new Date(now.getFullYear(), now.getMonth() - 5, 1), bounds.end, () => undefined)) {
    buckets.set(key, { primary: 0, secondary: 0 });
  }
  for (const deal of open) {
    const at = deal.closeAt ?? now;
    const key = monthKey(at);
    const row = buckets.get(key) ?? { primary: 0, secondary: 0 };
    row.primary += deal.weighted;
    row.secondary += deal.probability;
    buckets.set(key, row);
  }
  const trend = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => ({
      label: monthLabel(key),
      primary: Math.round(row.primary),
      secondary: Math.round(row.secondary / Math.max(1, open.filter((d) => d.closeAt && monthKey(d.closeAt) === key).length || 1)),
    }));
  const slices = countBy(risky, (deal) => deal.stage);
  const maxRisk = Math.max(1, ...risky.map((deal) => deal.value));
  return {
    comparisonShort: "forecast",
    kpis: [
      {
        id: "weighted",
        label: "Weighted pipeline",
        value: formatCurrency(weighted),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "predicted",
        label: "Likely to win",
        value: String(predicted.length),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "risk",
        label: "At-risk deals",
        value: String(risky.length),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "won",
        label: "Settled (period)",
        value: String(won.length),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.primary),
      },
      {
        id: "overdue",
        label: "Activity bottlenecks",
        value: String(overdueActs),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.secondary),
      },
      {
        id: "open",
        label: "Open deals",
        value: String(open.length),
        delta: 0,
        previous: "—",
        spark: sparkFrom(trend, (r) => r.primary),
      },
    ],
    trend,
    primaryLegend: "Weighted $",
    secondaryLegend: "Avg probability",
    primaryMoney: true,
    trendTitle: "Forecasted pipeline",
    slices,
    sliceTotal: risky.length,
    sliceTitle: "Risk by stage",
    sliceEmpty: "No at-risk deals.",
    sliceCenter: "Risk",
    funnel: funnelOf([
      { label: "Open pipeline", value: open.length },
      { label: "Likely (≥70%)", value: predicted.length },
      { label: "At risk", value: risky.length },
      { label: "Settled", value: won.length },
    ]),
    funnelTitle: "Forecast funnel",
    funnelFooterLabel: "Weighted value",
    funnelFooterValue: formatCurrency(weighted),
    list: risky.slice(0, 8).map((deal) => ({
      name: deal.name,
      detail: `${deal.probability}% · ${formatCurrency(deal.value)}`,
      bar: (deal.value / maxRisk) * 100,
    })),
    listTitle: "At-risk deals",
    listEmpty: "No at-risk deals in the pipeline.",
  };
}

function fromBusiness(filters: SectionPageFilters, now: Date): SectionPageModel {
  return revenueCompute(filters, now);
}

function fromCustomers(filters: SectionPageFilters, now: Date): SectionPageModel {
  const data = computeCustomerAnalytics(
    { ...filters, source: "All" },
    now,
  );
  const max = Math.max(1, ...data.topCustomers.map((row) => row.lifetimeValue));
  return {
    comparisonShort: data.comparisonShort.replace(/^vs\s+/i, ""),
    kpis: data.kpis.map((kpi) => ({
      id: kpi.id,
      label: kpi.label,
      value: kpi.value,
      delta: kpi.delta,
      previous: kpi.previous,
      points: kpi.points,
      spark: data.acquisition.map((row) => row.newCustomers),
    })),
    trend: data.acquisition.map((row) => ({
      label: row.label,
      primary: row.newCustomers,
      secondary: row.cumulative,
    })),
    primaryLegend: "New",
    secondaryLegend: "Cumulative",
    trendTitle: "Customer acquisition",
    slices: data.sources,
    sliceTotal: data.sourceTotal,
    sliceTitle: "Customers by source",
    sliceEmpty: "No customers in this range.",
    sliceCenter: "New",
    funnel: data.funnel,
    funnelTitle: "Customer funnel",
    funnelFooterLabel: "Repeat rate",
    funnelFooterValue: `${data.repeatRate}%`,
    list: data.topCustomers.slice(0, 8).map((row) => ({
      name: row.name,
      detail: formatCurrency(row.lifetimeValue),
      bar: (row.lifetimeValue / max) * 100,
    })),
    listTitle: "Top customers",
    listEmpty: "No customer value in this range.",
  };
}

function fromActivity(filters: SectionPageFilters, now: Date): SectionPageModel {
  const data = computeActivityAnalytics(
    { ...defaultActivityAnalyticsFilters(), dateRange: filters.dateRange, dateFrom: filters.dateFrom, dateTo: filters.dateTo, user: filters.owner === "All" ? "All" : filters.owner },
    now,
  );
  const kpis = data.kpis.slice(0, 6).map((kpi) => ({
    id: kpi.id,
    label: kpi.label,
    value: kpi.value,
    delta: kpi.delta,
    previous: "—",
    spark: data.daily.map((row) => row.calls + row.emails),
  }));
  const maxMem = Math.max(1, ...data.memberRows.map((row) => row.activities));
  return {
    comparisonShort: "last period",
    kpis,
    trend: data.daily.map((row) => ({
      label: row.label,
      primary: row.calls,
      secondary: row.emails,
    })),
    primaryLegend: "Calls",
    secondaryLegend: "Emails",
    trendTitle: "Activity trend",
    slices: data.sources.map((row) => ({ name: row.source, value: row.activities })),
    sliceTotal: data.sources.reduce((n, row) => n + row.activities, 0),
    sliceTitle: "Activity by source",
    sliceEmpty: "No activities in this range.",
    sliceCenter: "Acts",
    funnel: funnelOf(
      data.conversions.slice(0, 4).map((row) => ({
        label: `${row.from} → ${row.to}`,
        value: Math.round(row.value),
      })),
    ),
    funnelTitle: "Activity outcomes",
    funnelFooterLabel: "Client-facing",
    funnelFooterValue: String(data.clientFacing),
    list: data.memberRows.slice(0, 8).map((row) => ({
      name: row.owner,
      detail: `${row.activities} activities`,
      bar: (row.activities / maxMem) * 100,
    })),
    listTitle: "Activity by owner",
    listEmpty: "No activity owners in this range.",
  };
}

function fromTeam(filters: SectionPageFilters, now: Date): SectionPageModel {
  const data = computeTeamAnalytics(
    {
      ...defaultTeamAnalyticsFilters(),
      dateRange: filters.dateRange,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      user: filters.owner === "All" ? "All" : filters.owner,
    },
    now,
  );
  const kpis = data.primaryKpis.map((kpi) => ({
    id: kpi.id,
    label: kpi.label,
    value: kpi.value,
    delta: kpi.delta,
    previous: "—",
    spark: data.productivity.map((row) => row.completed),
  }));
  const max = Math.max(1, ...data.memberRows.map((row) => row.revenue || row.activities));
  return {
    comparisonShort: "last period",
    kpis,
    trend: data.productivity.map((row) => ({
      label: row.type,
      primary: row.completed,
      secondary: row.planned,
    })),
    primaryLegend: "Completed",
    secondaryLegend: "Planned",
    trendTitle: "Team productivity",
    slices: data.timeByType.map((row) => ({ name: row.name, value: row.minutes })),
    sliceTotal: data.timeByType.reduce((n, row) => n + row.minutes, 0),
    sliceTitle: "Work by type",
    sliceEmpty: "No team activity in this range.",
    sliceCenter: "Work",
    funnel: funnelOf([
      { label: "Leads handled", value: data.totals.leads },
      { label: "Activities", value: data.memberRows.reduce((n, row) => n + row.activities, 0) },
      { label: "Tasks done", value: data.memberRows.reduce((n, row) => n + row.completed, 0) },
      { label: "Settlements", value: data.totals.settlements },
    ]),
    funnelTitle: "Team funnel",
    funnelFooterLabel: "Avg response",
    funnelFooterValue: formatDuration(data.avgResponse),
    list: data.memberRows.slice(0, 8).map((row) => ({
      name: row.owner,
      detail: `${row.settled} settled · ${row.activities} acts`,
      bar: ((row.revenue || row.activities) / max) * 100,
    })),
    listTitle: "Team members",
    listEmpty: "No team members in this range.",
  };
}

export function computeSectionPage(
  id: AnalyticsSectionId,
  filters: SectionPageFilters,
  now = new Date(),
): SectionPageModel {
  if (id === "business") return fromBusiness(filters, now);
  if (id === "leads") return leadsCompute(filters, now);
  if (id === "deals") return dealsCompute(filters, now);
  if (id === "marketing") return marketingCompute(filters, now);
  if (id === "activity") return fromActivity(filters, now);
  if (id === "team") return fromTeam(filters, now);
  if (id === "revenue") return revenueCompute(filters, now);
  if (id === "operations") return operationsCompute(filters, now);
  if (id === "customers") return fromCustomers(filters, now);
  return forecastCompute(filters, now);
}
