/** Business Analytics from live CRM stores. */

import {
  dateRangeBounds,
  dateRangeLabel,
  defaultDashboardFilters,
  formatCurrency,
  previousDateRangeBounds,
  type DashboardDateRange,
} from "@/lib/dashboard/layout";
import { loadDeals, loadLeads } from "@/lib/reports/library/records";

export type BusinessAnalyticsFilters = {
  dateRange: DashboardDateRange;
  dateFrom?: string;
  dateTo?: string;
  owner: string;
};

function inBounds(at: Date | null, start: Date | null, end: Date | null) {
  if (!at) return !start;
  if (start && at < start) return false;
  if (start && end && at > end) return false;
  return true;
}

function deltaPct(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function deltaPoints(current: number, previous: number) {
  return Math.round((current - previous) * 10) / 10;
}

function matchesOwner(owner: string, filter: string) {
  return filter === "All" || owner === filter;
}

function snapshotFor(
  leads: ReturnType<typeof loadLeads>,
  deals: ReturnType<typeof loadDeals>,
  start: Date | null,
  end: Date | null,
  owner: string,
) {
  const visibleLeads = leads.filter((lead) => matchesOwner(lead.owner, owner));
  const visibleDeals = deals.filter((deal) => matchesOwner(deal.owner, owner));
  const newLeads = visibleLeads.filter((lead) => inBounds(lead.createdAt, start, end));
  const converted = newLeads.filter((lead) => lead.converted);
  const qualified = newLeads.filter(
    (lead) =>
      lead.converted ||
      ["Qualified", "Contacted"].includes(lead.status) ||
      !["New", "Unqualified"].includes(lead.status),
  );
  const createdDeals = visibleDeals.filter((deal) =>
    deal.won || deal.lost ? inBounds(deal.closeAt, start, end) : true,
  );
  const settledDeals = visibleDeals.filter((deal) => deal.won && inBounds(deal.closeAt, start, end));
  const lost = visibleDeals.filter((deal) => deal.lost && inBounds(deal.closeAt, start, end));
  const open = visibleDeals.filter((deal) => !deal.won && !deal.lost);
  const settledLeads = visibleLeads.filter(
    (lead) => lead.converted && inBounds(lead.convertedAt ?? lead.createdAt, start, end),
  );
  const settledRows = settledDeals.map((deal) => ({
    owner: deal.owner,
    value: deal.value,
    name: deal.name,
    source: deal.loanType,
    account: deal.account,
    contact: deal.contact,
  }));
  if (!settledRows.length) {
    for (const lead of settledLeads) {
      settledRows.push({
        owner: lead.owner,
        value: lead.value,
        name: lead.name,
        source: lead.source,
        account: lead.company,
        contact: lead.name,
      });
    }
  }
  const revenue = settledRows.reduce((n, row) => n + row.value, 0);
  const pipeline = open.reduce((n, deal) => n + deal.weighted, 0);
  const conversion = newLeads.length
    ? Math.round((converted.length / newLeads.length) * 1000) / 10
    : 0;
  const closed = settledRows.length + lost.length;
  const winRate = closed ? Math.round((settledRows.length / closed) * 1000) / 10 : 0;
  const avgDeal = settledRows.length ? Math.round(revenue / settledRows.length) : 0;
  return {
    newLeads: newLeads.length,
    converted: converted.length,
    qualified: qualified.length,
    deals: createdDeals.length,
    settled: settledRows.length,
    lost: lost.length,
    revenue,
    pipeline,
    conversion,
    winRate,
    avgDeal,
    newLeadRows: newLeads,
    settledRows,
  };
}

function monthTrend(
  start: Date | null,
  end: Date,
  settled: ReturnType<typeof loadDeals>,
  leads: ReturnType<typeof loadLeads>,
) {
  const buckets = new Map<
    string,
    { order: number; revenue: number; leads: number; settlements: number }
  >();
  const ensure = (at: Date) => {
    const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
    const current =
      buckets.get(key) ?? {
        order: at.getFullYear() * 100 + at.getMonth(),
        revenue: 0,
        leads: 0,
        settlements: 0,
      };
    buckets.set(key, current);
    return current;
  };
  for (const deal of settled) {
    if (!deal.closeAt || !inBounds(deal.closeAt, start, end)) continue;
    const bucket = ensure(deal.closeAt);
    bucket.revenue += deal.value;
    bucket.settlements += 1;
  }
  for (const lead of leads) {
    if (lead.converted) {
      const at = lead.convertedAt ?? lead.createdAt;
      if (at && inBounds(at, start, end)) {
        const bucket = ensure(at);
        if (!settled.some((deal) => deal.won && inBounds(deal.closeAt, start, end))) {
          bucket.revenue += lead.value;
          bucket.settlements += 1;
        }
      }
    }
    if (!lead.createdAt || !inBounds(lead.createdAt, start, end)) continue;
    ensure(lead.createdAt).leads += 1;
  }
  if (!buckets.size && start) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= last) {
      ensure(cursor);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, bucket]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        label: new Date(year, (month ?? 1) - 1, 1).toLocaleDateString("en-AU", {
          month: "short",
        }),
        revenue: bucket.revenue,
        leads: bucket.leads,
        settlements: bucket.settlements,
      };
    });
}

export const BUSINESS_SOURCE_CHANNELS = [
  "Direct",
  "Organic Search",
  "Social Media",
  "Referral",
  "Other",
] as const;

export type BusinessSourceChannel = (typeof BUSINESS_SOURCE_CHANNELS)[number];

export type BusinessTrendSpan = "7d" | "30d" | "3m" | "1y";

export function filtersForTrendSpan(
  span: BusinessTrendSpan,
  owner: string,
  now = new Date(),
): BusinessAnalyticsFilters {
  if (span === "7d") return { dateRange: "7d", owner };
  if (span === "30d") return { dateRange: "30d", owner };
  if (span === "3m") return { dateRange: "90d", owner };
  const from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    dateRange: "custom",
    dateFrom: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
    dateTo: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    owner,
  };
}

function startOfLocalDay(at: Date) {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate());
}

function dayKey(at: Date) {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
}

function classifySource(name: string): BusinessSourceChannel {
  const n = name.trim().toLowerCase();
  if (!n) return "Other";
  if (
    n.includes("refer") ||
    n.includes("existing client") ||
    n.includes("employee") ||
    n.includes("partner")
  ) {
    return "Referral";
  }
  if (
    n.includes("facebook") ||
    n.includes("instagram") ||
    n.includes("tiktok") ||
    n.includes("social") ||
    n.includes("linkedin")
  ) {
    return "Social Media";
  }
  if (
    n.includes("google") ||
    n.includes("organic") ||
    n.includes("seo") ||
    n.includes("website") ||
    n.includes("ads")
  ) {
    return "Organic Search";
  }
  if (n.includes("direct") || n.includes("walk") || n.includes("imported") || n.includes("manual")) {
    return "Direct";
  }
  if (n === "other" || n.includes("phone") || n.includes("event")) return "Other";
  return "Direct";
}

function addToBucket(
  buckets: Map<string, { order: number; revenue: number; leads: number; settlements: number }>,
  key: string,
  order: number,
  patch: Partial<{ revenue: number; leads: number; settlements: number }>,
) {
  const current =
    buckets.get(key) ?? { order, revenue: 0, leads: 0, settlements: 0 };
  current.revenue += patch.revenue ?? 0;
  current.leads += patch.leads ?? 0;
  current.settlements += patch.settlements ?? 0;
  buckets.set(key, current);
}

function fillTrendFromRecords(
  buckets: Map<string, { order: number; revenue: number; leads: number; settlements: number }>,
  start: Date | null,
  end: Date,
  settled: ReturnType<typeof loadDeals>,
  leads: ReturnType<typeof loadLeads>,
  keyFor: (at: Date) => { key: string; order: number },
) {
  for (const deal of settled) {
    if (!deal.closeAt || !inBounds(deal.closeAt, start, end)) continue;
    const { key, order } = keyFor(deal.closeAt);
    addToBucket(buckets, key, order, { revenue: deal.value, settlements: 1 });
  }
  const usedDealSettlements = settled.some(
    (deal) => deal.won && inBounds(deal.closeAt, start, end),
  );
  for (const lead of leads) {
    if (lead.converted && !usedDealSettlements) {
      const at = lead.convertedAt ?? lead.createdAt;
      if (at && inBounds(at, start, end)) {
        const { key, order } = keyFor(at);
        addToBucket(buckets, key, order, { revenue: lead.value, settlements: 1 });
      }
    }
    if (!lead.createdAt || !inBounds(lead.createdAt, start, end)) continue;
    const { key, order } = keyFor(lead.createdAt);
    addToBucket(buckets, key, order, { leads: 1 });
  }
}

function dailyTrend(
  start: Date,
  end: Date,
  settled: ReturnType<typeof loadDeals>,
  leads: ReturnType<typeof loadLeads>,
) {
  const buckets = new Map<
    string,
    { order: number; revenue: number; leads: number; settlements: number }
  >();
  const cursor = startOfLocalDay(start);
  const last = startOfLocalDay(end);
  while (cursor <= last) {
    addToBucket(buckets, dayKey(cursor), cursor.getTime(), {});
    cursor.setDate(cursor.getDate() + 1);
  }
  fillTrendFromRecords(buckets, start, end, settled, leads, (at) => ({
    key: dayKey(at),
    order: startOfLocalDay(at).getTime(),
  }));
  return [...buckets.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, bucket]) => {
      const [year, month, day] = key.split("-").map(Number);
      return {
        label: new Date(year, (month ?? 1) - 1, day ?? 1).toLocaleDateString("en-AU", {
          month: "short",
          day: "numeric",
        }),
        revenue: bucket.revenue,
        leads: bucket.leads,
        settlements: bucket.settlements,
      };
    });
}

function weeklyTrend(
  start: Date,
  end: Date,
  settled: ReturnType<typeof loadDeals>,
  leads: ReturnType<typeof loadLeads>,
) {
  const buckets = new Map<
    string,
    { order: number; revenue: number; leads: number; settlements: number }
  >();
  const weekStart = (at: Date) => {
    const day = startOfLocalDay(at);
    const offset = (day.getDay() + 6) % 7;
    day.setDate(day.getDate() - offset);
    return day;
  };
  const cursor = weekStart(start);
  const last = weekStart(end);
  while (cursor <= last) {
    addToBucket(buckets, dayKey(cursor), cursor.getTime(), {});
    cursor.setDate(cursor.getDate() + 7);
  }
  fillTrendFromRecords(buckets, start, end, settled, leads, (at) => {
    const ws = weekStart(at);
    return { key: dayKey(ws), order: ws.getTime() };
  });
  return [...buckets.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, bucket]) => {
      const [year, month, day] = key.split("-").map(Number);
      return {
        label: new Date(year, (month ?? 1) - 1, day ?? 1).toLocaleDateString("en-AU", {
          month: "short",
          day: "numeric",
        }),
        revenue: bucket.revenue,
        leads: bucket.leads,
        settlements: bucket.settlements,
      };
    });
}

export function computeBusinessAnalytics(
  filters: BusinessAnalyticsFilters,
  now = new Date(),
) {
  const bounds = dateRangeBounds(filters, now);
  const previous = previousDateRangeBounds(filters, now);
  const leads = loadLeads();
  const deals = loadDeals(now);
  const current = snapshotFor(leads, deals, bounds.start, bounds.end, filters.owner);
  const prior = previous
    ? snapshotFor(leads, deals, previous.start, previous.end, filters.owner)
    : null;

  const sources = new Map<BusinessSourceChannel, { revenue: number; deals: number }>();
  for (const name of BUSINESS_SOURCE_CHANNELS) {
    sources.set(name, { revenue: 0, deals: 0 });
  }
  for (const deal of current.settledRows) {
    const lead = leads.find(
      (row) =>
        row.name.toLowerCase() === deal.contact.toLowerCase() ||
        row.company.toLowerCase() === deal.account.toLowerCase(),
    );
    const name = classifySource(deal.source || lead?.source || "Other");
    const bucket = sources.get(name) ?? { revenue: 0, deals: 0 };
    bucket.revenue += deal.value;
    bucket.deals += 1;
    sources.set(name, bucket);
  }
  const sourceSlices = BUSINESS_SOURCE_CHANNELS.map((name) => {
    const row = sources.get(name) ?? { revenue: 0, deals: 0 };
    return { name, revenue: row.revenue, deals: row.deals };
  });
  const sourceTotal = sourceSlices.reduce((n, row) => n + row.revenue, 0);

  const owners = new Map<string, { revenue: number; settlements: number }>();
  for (const deal of current.settledRows) {
    const bucket = owners.get(deal.owner) ?? { revenue: 0, settlements: 0 };
    bucket.revenue += deal.value;
    bucket.settlements += 1;
    owners.set(deal.owner, bucket);
  }
  const ownerRows = [...owners.entries()]
    .map(([name, row]) => ({ name, ...row }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const funnelTop = current.newLeads || 1;
  const funnel = [
    { label: "New leads", value: current.newLeads, pct: current.newLeads ? 100 : 0 },
    {
      label: "Qualified",
      value: current.qualified,
      pct: Math.round((current.qualified / funnelTop) * 1000) / 10,
    },
    {
      label: "Deals",
      value: current.deals,
      pct: Math.round((current.deals / funnelTop) * 1000) / 10,
    },
    {
      label: "Settled",
      value: current.settled,
      pct: Math.round((current.settled / funnelTop) * 1000) / 10,
    },
  ];

  const growth =
    current.revenue && prior?.revenue
      ? deltaPct(current.revenue, prior.revenue)
      : deltaPct(current.newLeads, prior?.newLeads ?? 0);

  const ownedLeads = leads.filter((lead) => matchesOwner(lead.owner, filters.owner));
  const ownedDeals = deals.filter((deal) => matchesOwner(deal.owner, filters.owner));
  const dayCount =
    bounds.start != null
      ? Math.round(
          (startOfLocalDay(bounds.end).getTime() - startOfLocalDay(bounds.start).getTime()) /
            86400000,
        ) + 1
      : 400;
  const trend =
    bounds.start && dayCount <= 45
      ? dailyTrend(bounds.start, bounds.end, ownedDeals, ownedLeads)
      : bounds.start && dayCount <= 120
        ? weeklyTrend(bounds.start, bounds.end, ownedDeals, ownedLeads)
        : monthTrend(bounds.start, bounds.end, ownedDeals, ownedLeads);
  const sparkSource =
    bounds.start && dayCount > 45
      ? dailyTrend(
          new Date(bounds.end.getTime() - 29 * 86400000),
          bounds.end,
          ownedDeals,
          ownedLeads,
        )
      : trend;

  return {
    periodLabel: dateRangeLabel({
      ...defaultDashboardFilters(),
      dateRange: filters.dateRange,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }),
    comparisonShort: previous ? "last period" : "",
    asOf: now,
    growth,
    kpis: [
      {
        id: "leads",
        label: "New leads",
        value: String(current.newLeads),
        delta: deltaPct(current.newLeads, prior?.newLeads ?? 0),
        previous: String(prior?.newLeads ?? 0),
        spark: sparkSource.map((row) => row.leads),
      },
      {
        id: "conversion",
        label: "Lead conversion",
        value: `${current.conversion}%`,
        delta: deltaPoints(current.conversion, prior?.conversion ?? 0),
        previous: `${prior?.conversion ?? 0}%`,
        points: true,
        spark: sparkSource.map((row) => row.leads),
      },
      {
        id: "revenue",
        label: "Revenue",
        value: formatCurrency(current.revenue),
        delta: deltaPct(current.revenue, prior?.revenue ?? 0),
        previous: formatCurrency(prior?.revenue ?? 0),
        spark: sparkSource.map((row) => row.revenue),
      },
      {
        id: "settlements",
        label: "Settlements",
        value: String(current.settled),
        delta: deltaPct(current.settled, prior?.settled ?? 0),
        previous: String(prior?.settled ?? 0),
        spark: sparkSource.map((row) => row.settlements),
      },
      {
        id: "win",
        label: "Win rate",
        value: `${current.winRate}%`,
        delta: deltaPoints(current.winRate, prior?.winRate ?? 0),
        previous: `${prior?.winRate ?? 0}%`,
        points: true,
        spark: sparkSource.map((row) => row.settlements),
      },
      {
        id: "pipeline",
        label: "Open pipeline",
        value: formatCurrency(current.pipeline),
        delta: deltaPct(current.pipeline, prior?.pipeline ?? 0),
        previous: formatCurrency(prior?.pipeline ?? 0),
        spark: sparkSource.map((row) => row.revenue),
      },
    ],
    trend,
    sources: sourceSlices,
    sourceTotal,
    funnel,
    owners: ownerRows,
    avgDeal: formatCurrency(current.avgDeal),
    avgDealDelta: deltaPct(current.avgDeal, prior?.avgDeal ?? 0),
  };
}

export type BusinessAnalyticsData = ReturnType<typeof computeBusinessAnalytics>;
