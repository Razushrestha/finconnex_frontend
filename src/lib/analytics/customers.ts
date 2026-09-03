/** Customer Analytics from live CRM stores. */

import { listCalls } from "@/lib/calls/store";
import { listEmails } from "@/lib/emails/store";
import { listMeetings } from "@/lib/meetings/store";
import {
  dateRangeBounds,
  dateRangeLabel,
  defaultDashboardFilters,
  formatCurrency,
  formatDateInput,
  previousDateRangeBounds,
  toDateInput,
  type DashboardDateRange,
} from "@/lib/dashboard/layout";
import { downloadCsv, toCsv } from "@/lib/import/csv";
import { parseDate } from "@/lib/reports/library/format";
import { campaignNameFor, loadActivities, loadContacts, loadDeals } from "@/lib/reports/library/records";

export type CustomerAnalyticsFilters = {
  dateRange: DashboardDateRange;
  dateFrom?: string;
  dateTo?: string;
  owner: string;
  source: string;
};

export const CUSTOMER_VALUE_BUCKETS = [
  { id: "0-5", label: "$0–$5K", min: 0, max: 5_000 },
  { id: "5-10", label: "$5K–$10K", min: 5_000, max: 10_000 },
  { id: "10-20", label: "$10K–$20K", min: 10_000, max: 20_000 },
  { id: "20-50", label: "$20K–$50K", min: 20_000, max: 50_000 },
  { id: "50+", label: "$50K+", min: 50_000, max: Infinity },
] as const;

const SOURCE_ALIASES: Record<string, string> = {
  Website: "Website",
  Referral: "Referral",
  "Social Media": "Facebook Ads",
  "Email Campaign": "Email Campaign",
  "Cold Call": "Cold Call",
  Other: "Other",
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

function matchesOwner(owner: string, filter: string) {
  return filter === "All" || owner === filter;
}

function contactSourceLabel(source: string, tags: string[] = []) {
  const mapped = SOURCE_ALIASES[source] ?? campaignNameFor(source, tags);
  return mapped || "Other";
}

function dealsForContact(
  contact: { id: string; name: string; dealIds?: string[] },
  deals: ReturnType<typeof loadDeals>,
) {
  const ids = new Set(contact.dealIds ?? []);
  const name = contact.name.toLowerCase();
  return deals.filter(
    (deal) => ids.has(deal.id) || deal.contact.toLowerCase() === name,
  );
}

function activitiesForContact(
  contact: { name: string; email: string },
  activities: ReturnType<typeof loadActivities>,
) {
  const name = contact.name.toLowerCase();
  const email = contact.email.toLowerCase();
  return activities.filter((activity) => {
    const related = activity.related.toLowerCase();
    return related.includes(name) || (email && related.includes(email));
  });
}

function periodCaption(range: DashboardDateRange, start: Date | null, end: Date, now: Date) {
  const label = dateRangeLabel({ ...defaultDashboardFilters(), dateRange: range });
  if (range === "all" || !start) return label;
  if (range === "this-month" || range === "month") {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${label} (${formatDateInput(toDateInput(start))} – ${formatDateInput(toDateInput(monthEnd))})`;
  }
  if (range === "last-month") {
    return `${label} (${formatDateInput(toDateInput(start))} – ${formatDateInput(toDateInput(end))})`;
  }
  return `${label} (${formatDateInput(toDateInput(start))} – ${formatDateInput(toDateInput(end))})`;
}

function snapshotFor(
  contacts: ReturnType<typeof loadContacts>,
  deals: ReturnType<typeof loadDeals>,
  activities: ReturnType<typeof loadActivities>,
  emails: ReturnType<typeof listEmails>,
  calls: ReturnType<typeof listCalls>,
  meetings: ReturnType<typeof listMeetings>,
  start: Date | null,
  end: Date | null,
  filters: CustomerAnalyticsFilters,
) {
  const visible = contacts.filter(
    (contact) =>
      matchesOwner(contact.owner, filters.owner) &&
      (filters.source === "All" || contactSourceLabel(contact.source, contact.tags) === filters.source),
  );
  const newCustomers = visible.filter((contact) => inBounds(contact.createdAt, start, end));
  const engaged = newCustomers.filter((contact) => activitiesForContact(contact, activities).length > 0);
  const withDeals = newCustomers.filter((contact) => dealsForContact(contact, deals).length > 0);
  const settled = newCustomers.filter((contact) => dealsForContact(contact, deals).some((deal) => deal.won));
  const qualified = newCustomers.filter((contact) => {
    const linked = dealsForContact(contact, deals);
    return linked.length > 0 || ["Active"].includes(contact.status);
  });

  const active = visible.filter((contact) => {
    if (contact.status !== "Active") return false;
    const linked = dealsForContact(contact, deals);
    const acts = activitiesForContact(contact, activities);
    return (
      inBounds(contact.createdAt, start, end) ||
      linked.some((deal) => inBounds(deal.closeAt, start, end)) ||
      acts.some((activity) => inBounds(activity.at, start, end))
    );
  });

  const lifetime = visible.map((contact) => {
    const linked = dealsForContact(contact, deals);
    const won = linked.filter((deal) => deal.won);
    const revenue = won.reduce((n, deal) => n + deal.value, 0);
    return { contact, linked, won, revenue };
  });
  const customersWithValue = lifetime.filter((row) => row.won.length > 0);
  const repeatCustomers = lifetime.filter((row) => row.won.length > 1 || row.linked.length > 1);
  const clv =
    customersWithValue.length
      ? Math.round(customersWithValue.reduce((n, row) => n + row.revenue, 0) / customersWithValue.length)
      : 0;
  const conversion = newCustomers.length
    ? Math.round((withDeals.length / newCustomers.length) * 1000) / 10
    : 0;
  const retained = visible.filter((contact) => {
    if (contact.status !== "Active") return false;
    const acts = activitiesForContact(contact, activities);
    return acts.some((activity) => inBounds(activity.at, start, end)) || contact.status === "Active";
  });
  const retentionBase = visible.filter((contact) => contact.createdAt && (!start || contact.createdAt < (end ?? new Date()))).length;
  const retention = retentionBase
    ? Math.round((retained.length / retentionBase) * 1000) / 10
    : 0;

  const emailsSent = emails.filter((email) => {
    const at = parseDate(email.sentDate);
    return inBounds(at, start, end) && email.status !== "Draft";
  });
  const emailsOpened = emailsSent.filter((email) => email.status === "Opened");
  const callsMade = calls.filter((call) => inBounds(parseDate(call.date), start, end));
  const meetingsHeld = meetings.filter((meeting) => inBounds(parseDate(meeting.startDateTime), start, end));

  return {
    newCustomers: newCustomers.length,
    conversion,
    activeCustomers: active.length || visible.filter((c) => c.status === "Active").length,
    repeatCustomers: repeatCustomers.length,
    retention,
    clv,
    engaged: engaged.length,
    qualified: Math.max(qualified.length, withDeals.length),
    dealsCreated: withDeals.length,
    settled: settled.length,
    emailsSent: emailsSent.length,
    emailsOpened: emailsOpened.length,
    callsMade: callsMade.length,
    meetingsHeld: meetingsHeld.length,
    repeatDeals: lifetime.reduce((n, row) => n + Math.max(0, row.won.length - 1), 0),
    newRows: newCustomers,
    lifetime,
    customersWithValue,
  };
}

function trendPoints(
  range: DashboardDateRange,
  start: Date | null,
  end: Date,
  rows: { createdAt: Date | null }[],
) {
  const daily =
    range === "today" ||
    range === "yesterday" ||
    range === "this-week" ||
    range === "last-week" ||
    range === "this-month" ||
    range === "last-month" ||
    range === "month" ||
    range === "7d" ||
    range === "30d";
  if (daily && start) {
    const points: { label: string; newCustomers: number; cumulative: number }[] = [];
    let cursor = new Date(start);
    let cumulative = 0;
    while (cursor <= end) {
      const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59, 999);
      const count = rows.filter((row) => inBounds(row.createdAt, dayStart, dayEnd)).length;
      cumulative += count;
      points.push({
        label: String(cursor.getDate()),
        newCustomers: count,
        cumulative,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
    return points;
  }

  const buckets = new Map<string, { order: number; count: number }>();
  for (const row of rows) {
    const at = row.createdAt;
    if (!at || !inBounds(at, start, end)) continue;
    const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
    const current = buckets.get(key) ?? { order: at.getFullYear() * 100 + at.getMonth(), count: 0 };
    current.count += 1;
    buckets.set(key, current);
  }
  let cumulative = 0;
  return [...buckets.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, bucket]) => {
      cumulative += bucket.count;
      const [year, month] = key.split("-").map(Number);
      const label = new Date(year, (month ?? 1) - 1, 1).toLocaleDateString("en-AU", { month: "short" });
      return { label, newCustomers: bucket.count, cumulative };
    });
}

function retentionTrend(contacts: ReturnType<typeof loadContacts>, activities: ReturnType<typeof loadActivities>, now: Date) {
  const points: { label: string; retention: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = month;
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    const existing = contacts.filter((contact) => contact.createdAt && contact.createdAt <= end);
    const active = existing.filter((contact) => {
      if (contact.status === "Active") return true;
      return activitiesForContact(contact, activities).some((activity) => inBounds(activity.at, start, end));
    });
    points.push({
      label: month.toLocaleDateString("en-AU", { month: "short" }),
      retention: existing.length ? Math.round((active.length / existing.length) * 1000) / 10 : 0,
    });
  }
  return points;
}

export function computeCustomerAnalytics(
  filters: CustomerAnalyticsFilters,
  now = new Date(),
) {
  const bounds = dateRangeBounds(filters, now);
  const previous = previousDateRangeBounds(filters, now);
  const contacts = loadContacts();
  const deals = loadDeals(now);
  const activities = loadActivities();
  const emails = listEmails();
  const calls = listCalls();
  const meetings = listMeetings();

  const current = snapshotFor(
    contacts,
    deals,
    activities,
    emails,
    calls,
    meetings,
    bounds.start,
    bounds.end,
    filters,
  );
  const prior = previous
    ? snapshotFor(contacts, deals, activities, emails, calls, meetings, previous.start, previous.end, filters)
    : null;

  const sources = new Map<string, number>();
  for (const contact of current.newRows) {
    const label = contactSourceLabel(contact.source, contact.tags);
    sources.set(label, (sources.get(label) ?? 0) + 1);
  }
  const sourceSlices = [...sources.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const funnelTop = current.newCustomers || 1;
  const funnel = [
    { label: "New Customers", value: current.newCustomers, pct: current.newCustomers ? 100 : 0 },
    { label: "Engaged Customers", value: current.engaged, pct: Math.round((current.engaged / funnelTop) * 1000) / 10 },
    { label: "Qualified Customers", value: current.qualified, pct: Math.round((current.qualified / funnelTop) * 1000) / 10 },
    { label: "Deals Created", value: current.dealsCreated, pct: Math.round((current.dealsCreated / funnelTop) * 1000) / 10 },
    { label: "Settled", value: current.settled, pct: Math.round((current.settled / funnelTop) * 1000) / 10 },
  ];

  const maxValue = Math.max(...current.lifetime.map((row) => row.revenue), 1);
  const topCustomers = [...current.lifetime]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
    .map((row) => ({
      id: row.contact.id,
      name: row.contact.name,
      initials: row.contact.initials,
      avatar: row.contact.avatarBgClass,
      deals: row.linked.length,
      settlements: row.won.length,
      revenue: row.revenue,
      avgRevenue: row.won.length ? Math.round(row.revenue / row.won.length) : 0,
      since: row.contact.createdDate,
      lifetimeValue: row.revenue,
      bar: Math.round((row.revenue / maxValue) * 100),
    }));

  const distribution = CUSTOMER_VALUE_BUCKETS.map((bucket) => ({
    label: bucket.label,
    customers: current.lifetime.filter((row) => row.revenue >= bucket.min && row.revenue < bucket.max).length,
  }));

  const repeatRate = current.activeCustomers
    ? Math.round((current.repeatCustomers / current.activeCustomers) * 1000) / 10
    : 0;

  return {
    periodLabel: periodCaption(filters.dateRange, bounds.start, bounds.end, now),
    comparisonLabel: previous
      ? periodCaption(
          filters.dateRange === "this-month" || filters.dateRange === "month" ? "last-month" : filters.dateRange,
          previous.start,
          previous.end,
          now,
        ).replace("This ", "Previous ").replace("Year to Date", "Previous period")
      : "No previous period",
    comparisonShort: previous ? "vs last period" : "",
    asOf: now,
    kpis: [
      {
        id: "new",
        label: "New Customers",
        value: String(current.newCustomers),
        delta: deltaPct(current.newCustomers, prior?.newCustomers ?? 0),
        previous: String(prior?.newCustomers ?? 0),
      },
      {
        id: "conversion",
        label: "Conversion Rate",
        value: `${current.conversion}%`,
        delta: deltaPoints(current.conversion, prior?.conversion ?? 0),
        previous: `${prior?.conversion ?? 0}%`,
        points: true,
      },
      {
        id: "active",
        label: "Active Customers",
        value: String(current.activeCustomers),
        delta: deltaPct(current.activeCustomers, prior?.activeCustomers ?? 0),
        previous: String(prior?.activeCustomers ?? 0),
      },
      {
        id: "repeat",
        label: "Repeat Customers",
        value: String(current.repeatCustomers),
        delta: deltaPct(current.repeatCustomers, prior?.repeatCustomers ?? 0),
        previous: String(prior?.repeatCustomers ?? 0),
      },
      {
        id: "retention",
        label: "Customer Retention Rate",
        value: `${current.retention}%`,
        delta: deltaPoints(current.retention, prior?.retention ?? 0),
        previous: `${prior?.retention ?? 0}%`,
        points: true,
      },
      {
        id: "clv",
        label: "Customer Lifetime Value",
        value: formatCurrency(current.clv),
        delta: deltaPct(current.clv, prior?.clv ?? 0),
        previous: formatCurrency(prior?.clv ?? 0),
      },
    ],
    acquisition: trendPoints(filters.dateRange, bounds.start, bounds.end, current.newRows),
    sources: sourceSlices,
    sourceTotal: current.newCustomers,
    funnel,
    engagement: [
      {
        id: "sent",
        label: "Emails Sent",
        value: current.emailsSent,
        delta: deltaPct(current.emailsSent, prior?.emailsSent ?? 0),
      },
      {
        id: "opened",
        label: "Emails Opened",
        value: current.emailsOpened,
        delta: deltaPct(current.emailsOpened, prior?.emailsOpened ?? 0),
      },
      {
        id: "calls",
        label: "Calls Made",
        value: current.callsMade,
        delta: deltaPct(current.callsMade, prior?.callsMade ?? 0),
      },
      {
        id: "meetings",
        label: "Meetings Held",
        value: current.meetingsHeld,
        delta: deltaPct(current.meetingsHeld, prior?.meetingsHeld ?? 0),
      },
    ],
    retentionTrend: retentionTrend(
      contacts.filter((contact) => matchesOwner(contact.owner, filters.owner)),
      activities,
      now,
    ),
    repeatRate,
    repeatCustomers: current.repeatCustomers,
    repeatDeals: current.repeatDeals,
    topCustomers,
    distribution,
  };
}

export type CustomerAnalyticsData = ReturnType<typeof computeCustomerAnalytics>;

export function exportCustomerAnalytics(data: CustomerAnalyticsData, filters: CustomerAnalyticsFilters) {
  downloadCsv(
    `customer-analytics-${Date.now()}.csv`,
    toCsv(
      ["Metric", "Value", "Change", "Previous", "Range", "Owner", "Source"],
      [
        ...data.kpis.map((kpi) => [
          kpi.label,
          kpi.value,
          kpi.delta,
          kpi.previous,
          filters.dateRange,
          filters.owner,
          filters.source,
        ]),
        ...data.topCustomers.map((row) => [
          row.name,
          row.lifetimeValue,
          row.deals,
          row.settlements,
          filters.dateRange,
          filters.owner,
          filters.source,
        ]),
      ],
    ),
  );
}

export function customerFilterSources(now = new Date()) {
  const names = new Set(loadContacts().map((contact) => contactSourceLabel(contact.source, contact.tags)));
  return ["All", ...[...names].sort()];
}
