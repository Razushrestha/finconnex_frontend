/** Dashboard layout, filters, live stats, export (SRS §1). */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { listContactGroups } from "@/lib/contacts/store";
import { listCompanyGroups } from "@/lib/companies/store";
import { listDealPipelines } from "@/lib/deals/store";
import { downloadCsv, toCsv } from "@/lib/import/csv";
import { listLeadColumns } from "@/lib/leads/store";
import { readJsonStore, writeJsonStore } from "@/lib/rules/storage";
import { listTaskColumns } from "@/lib/tasks/store";

export const DASHBOARD_TEAMS = [
  "All teams",
  "Sales",
  "Operations",
  "Support",
] as const;

export const DASHBOARD_LOAN_TYPES = [
  "All Loan Types",
  "Purchase",
  "Refinance",
  "Investment",
] as const;

export type DashboardDateRange =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "last-quarter"
  | "this-year"
  | "last-year"
  | "ytd"
  | "all"
  | "custom"
  | "7d"
  | "30d"
  | "month"
  | "90d";
export type DashboardLoanType = (typeof DASHBOARD_LOAN_TYPES)[number];

export interface DashboardFilters {
  dateRange: DashboardDateRange;
  dateFrom?: string;
  dateTo?: string;
  owner: string; // "All" or ACTIVITY_OWNERS name
  team: (typeof DASHBOARD_TEAMS)[number];
  loanType: DashboardLoanType;
}

export const DASHBOARD_WIDGETS = [
  { id: "kpis", label: "Executive KPIs" },
  { id: "pipeline", label: "Pipeline at a Glance" },
  { id: "performance", label: "Performance Snapshot" },
  { id: "actions", label: "Today's Critical Actions" },
  { id: "trend", label: "Trend Overview" },
  { id: "ranking", label: "Top Performing" },
  { id: "alerts", label: "Alerts & Insights" },
  { id: "activity", label: "Workspace activity" },
  { id: "meetings", label: "Upcoming meetings" },
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number]["id"];

export interface DashboardLayout {
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
  filters: DashboardFilters;
  isDefault: boolean;
}

const LAYOUT_KEY = "dashboard:layout:v3";
const DEFAULT_LAYOUT_KEY = "dashboard:default-layout:v3";
const LEGACY_LAYOUT_KEY = "dashboard:layout:v2";

const WIDGET_ALIASES: Record<string, DashboardWidgetId> = {
  metrics: "kpis",
  charts: "trend",
  industry: "performance",
  taskUpdates: "actions",
};

export function defaultDashboardFilters(): DashboardFilters {
  return {
    dateRange: "90d",
    owner: "All",
    team: "All teams",
    loanType: "All Loan Types",
  };
}

export function defaultDashboardLayout(): DashboardLayout {
  return {
    order: DASHBOARD_WIDGETS.map((w) => w.id),
    hidden: ["activity", "meetings"],
    filters: defaultDashboardFilters(),
    isDefault: false,
  };
}

function migrateWidgetId(id: string): DashboardWidgetId | null {
  const aliased = WIDGET_ALIASES[id] ?? id;
  return DASHBOARD_WIDGETS.some((w) => w.id === aliased)
    ? (aliased as DashboardWidgetId)
    : null;
}

export function loadDashboardLayout(): DashboardLayout {
  const stored =
    readJsonStore<DashboardLayout | null>(LAYOUT_KEY, null) ??
    readJsonStore<DashboardLayout | null>(LEGACY_LAYOUT_KEY, null);
  if (!stored?.order?.length) return defaultDashboardLayout();
  const order: DashboardWidgetId[] = [];
  for (const id of stored.order) {
    const next = migrateWidgetId(String(id));
    if (next && !order.includes(next)) order.push(next);
  }
  for (const w of DASHBOARD_WIDGETS) {
    if (!order.includes(w.id)) order.push(w.id);
  }
  return {
    order,
    hidden: (stored.hidden ?? [])
      .map((id) => migrateWidgetId(String(id)))
      .filter((id): id is DashboardWidgetId => !!id),
    filters: { ...defaultDashboardFilters(), ...stored.filters },
    isDefault: !!stored.isDefault,
  };
}

export function saveDashboardLayout(layout: DashboardLayout) {
  writeJsonStore(LAYOUT_KEY, layout);
}

export function setDefaultDashboardLayout(layout: DashboardLayout) {
  const next = { ...layout, isDefault: true };
  writeJsonStore(DEFAULT_LAYOUT_KEY, next);
  saveDashboardLayout(next);
}

export function restoreDefaultDashboardLayout(): DashboardLayout {
  const saved = readJsonStore<DashboardLayout | null>(DEFAULT_LAYOUT_KEY, null);
  const next = saved?.order?.length
    ? { ...saved, isDefault: true }
    : defaultDashboardLayout();
  saveDashboardLayout(next);
  return next;
}

export function moveWidget(
  order: DashboardWidgetId[],
  id: DashboardWidgetId,
  dir: -1 | 1,
): DashboardWidgetId[] {
  const idx = order.indexOf(id);
  if (idx < 0) return order;
  const swap = idx + dir;
  if (swap < 0 || swap >= order.length) return order;
  const next = [...order];
  [next[idx], next[swap]] = [next[swap]!, next[idx]!];
  return next;
}

/** Move `fromId` so it sits in `toId`'s slot (grid drag). */
export function moveWidgetTo(
  order: DashboardWidgetId[],
  fromId: DashboardWidgetId,
  toId: DashboardWidgetId,
): DashboardWidgetId[] {
  const from = order.indexOf(fromId);
  const to = order.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return order;
  const next = [...order];
  const [item] = next.splice(from, 1);
  if (!item) return order;
  next.splice(to, 0, item);
  return next;
}

export function widgetGridSpan(id: DashboardWidgetId): "full" | "half" | "third" {
  if (id === "kpis") return "full";
  return "third";
}

export function parseMoney(value: string): number {
  const n = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Parse due dates like 22/07/2026, 22/07/2026 09:00 AM, or ISO. */
export function parseTaskDueDate(raw: string): Date | null {
  const trimmed = raw.trim();
  const m = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?)?/i,
  );
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const y = Number(m[3]);
    let hours = m[4] != null ? Number(m[4]) : 0;
    const minutes = m[5] != null ? Number(m[5]) : 0;
    const ap = m[7]?.toUpperCase();
    if (ap === "PM" && hours < 12) hours += 12;
    if (ap === "AM" && hours === 12) hours = 0;
    const dt = new Date(y, mo, d, hours, minutes, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) return new Date(iso);
  return null;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function endOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

function startOfWeek(now: Date) {
  const day = now.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
}

function parseDateInput(value?: string) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function dateRangeLabel(filters: DashboardFilters) {
  if (filters.dateRange === "custom" && filters.dateFrom && filters.dateTo) {
    return `${formatDateInput(filters.dateFrom)} – ${formatDateInput(filters.dateTo)}`;
  }
  const preset = DASHBOARD_DATE_RANGE_OPTIONS.find((item) => item.value === filters.dateRange)?.label;
  if (preset) return preset;
  if (filters.dateRange === "month") return "This Month";
  if (filters.dateRange === "7d") return "Last 7 days";
  if (filters.dateRange === "30d") return "Last 30 days";
  if (filters.dateRange === "90d") return "Last 90 days";
  return "Date Range";
}

export function formatDateInput(value: string) {
  const parsed = parseDateInput(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export function toDateInput(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const DASHBOARD_DATE_RANGE_OPTIONS: { value: DashboardDateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this-week", label: "This Week" },
  { value: "last-week", label: "Last Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "last-quarter", label: "Last Quarter" },
  { value: "this-year", label: "This Year" },
  { value: "last-year", label: "Last Year" },
  { value: "ytd", label: "Year to Date" },
  { value: "all", label: "All Time" },
];

export function dateRangeBounds(filters: DashboardFilters, now = new Date()) {
  const today = startOfDay(now);
  const endToday = endOfDay(now);
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);

  switch (filters.dateRange) {
    case "today":
      return { start: today, end: endToday };
    case "yesterday": {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      return { start, end: endOfDay(start) };
    }
    case "this-week":
      return { start: startOfWeek(now), end: endToday };
    case "last-week": {
      const start = startOfWeek(now);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case "this-month":
    case "month":
      return { start: new Date(year, month, 1), end: endToday };
    case "last-month":
      return {
        start: new Date(year, month - 1, 1),
        end: endOfDay(new Date(year, month, 0)),
      };
    case "this-quarter":
      return { start: new Date(year, quarter * 3, 1), end: endToday };
    case "last-quarter": {
      const start = new Date(year, (quarter - 1) * 3, 1);
      return { start, end: endOfDay(new Date(year, quarter * 3, 0)) };
    }
    case "this-year":
      return { start: new Date(year, 0, 1), end: endToday };
    case "last-year":
      return { start: new Date(year - 1, 0, 1), end: endOfDay(new Date(year - 1, 11, 31)) };
    case "ytd":
      return { start: new Date(year, 0, 1), end: endToday };
    case "custom": {
      const start = parseDateInput(filters.dateFrom);
      const end = parseDateInput(filters.dateTo);
      return {
        start,
        end: end ? endOfDay(end) : endToday,
      };
    }
    case "7d":
    case "30d":
    case "90d": {
      const days = filters.dateRange === "7d" ? 7 : filters.dateRange === "30d" ? 30 : 90;
      const start = new Date(today);
      start.setDate(start.getDate() - days);
      return { start, end: endToday };
    }
    case "all":
    default:
      return { start: null, end: endToday };
  }
}

export function previousDateRangeBounds(filters: DashboardFilters, now = new Date()) {
  if (filters.dateRange === "all") return null;
  const { start, end } = dateRangeBounds(filters, now);
  if (!start) return null;
  const length = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - length);
  return { start: prevStart, end: prevEnd };
}

export function dashboardPeriodLabel(filters: DashboardFilters) {
  return dateRangeLabel(filters);
}

export function rangeStart(range: DashboardDateRange, now = new Date()): Date | null {
  return dateRangeBounds({ ...defaultDashboardFilters(), dateRange: range }, now).start;
}

export interface DashboardLiveStats {
  totalLeads: number;
  totalContacts: number;
  totalCompanies: number;
  totalDeals: number;
  pipelineValue: number;
  wonDealsValue: number;
  openTasks: number;
  overdueTasks: number;
  activitiesToday: number;
  conversionRate: number;
  filteredOwner: string;
  filteredTeam: string;
  dateRange: DashboardDateRange;
}

export function computeDashboardStats(
  filters: DashboardFilters,
): DashboardLiveStats {
  const owner = filters.owner === "All" ? null : filters.owner;
  const start = dateRangeBounds(filters).start;

  const leads = listLeadColumns().flatMap((c) =>
    c.cards.map((card) => ({ ...card, status: c.leadStatus })),
  );
  const contacts = listContactGroups().flatMap((g) => g.contacts);
  const companies = listCompanyGroups().flatMap((g) => g.companies);
  const deals = Object.values(listDealPipelines()).flatMap((stages) =>
    stages.flatMap((s) =>
      s.deals.map((d) => ({ ...d, stage: s.title })),
    ),
  );
  const tasks = listTaskColumns().flatMap((c) => c.tasks);

  const leadCount = leads.filter((l) => !owner || l.owner === owner).length;
  const contactCount = contacts.filter(
    (c) => !owner || c.owner === owner,
  ).length;
  const companyCount = companies.filter(
    (c) => !owner || c.owner === owner,
  ).length;

  const dealRows = deals.filter((d) => !owner || d.owner === owner);
  const pipelineValue = dealRows
    .filter((d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost")
    .reduce((n, d) => n + parseMoney(d.value), 0);
  const wonDealsValue = dealRows
    .filter((d) => d.stage === "Closed Won")
    .reduce((n, d) => n + parseMoney(d.value), 0);

  const taskRows = tasks.filter((t) => {
    if (owner && t.assignedTo !== owner) return false;
    if (!start) return true;
    const due = parseTaskDueDate(t.dueDate);
    if (!due) return true;
    return due >= start;
  });

  const openTasks = taskRows.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled",
  ).length;
  const overdueTasks = taskRows.filter((t) => t.overdue).length;

  const converted = leads.filter(
    (l) => (!owner || l.owner === owner) && l.status === "Converted",
  ).length;
  const conversionRate =
    leadCount === 0 ? 0 : Math.round((converted / leadCount) * 1000) / 10;

  const today = new Date();
  const activitiesToday = taskRows.filter((t) => {
    const due = parseTaskDueDate(t.dueDate);
    if (!due) return false;
    return (
      due.getFullYear() === today.getFullYear() &&
      due.getMonth() === today.getMonth() &&
      due.getDate() === today.getDate()
    );
  }).length;

  return {
    totalLeads: leadCount,
    totalContacts: contactCount,
    totalCompanies: companyCount,
    totalDeals: dealRows.length,
    pipelineValue,
    wonDealsValue,
    openTasks,
    overdueTasks,
    activitiesToday,
    conversionRate,
    filteredOwner: filters.owner,
    filteredTeam: filters.team,
    dateRange: filters.dateRange,
  };
}

export function exportDashboardReport(stats: DashboardLiveStats) {
  downloadCsv(
    `dashboard-report-${Date.now()}.csv`,
    toCsv(
      ["Metric", "Value", "Owner filter", "Team filter", "Date range"],
      [
        ["Total Leads", stats.totalLeads, stats.filteredOwner, stats.filteredTeam, stats.dateRange],
        ["Total Contacts", stats.totalContacts, stats.filteredOwner, stats.filteredTeam, stats.dateRange],
        ["Total Companies", stats.totalCompanies, stats.filteredOwner, stats.filteredTeam, stats.dateRange],
        ["Total Deals", stats.totalDeals, stats.filteredOwner, stats.filteredTeam, stats.dateRange],
        ["Pipeline Value", stats.pipelineValue, stats.filteredOwner, stats.filteredTeam, stats.dateRange],
        ["Won Deals Value", stats.wonDealsValue, stats.filteredOwner, stats.filteredTeam, stats.dateRange],
        ["Open Tasks", stats.openTasks, stats.filteredOwner, stats.filteredTeam, stats.dateRange],
        ["Overdue Tasks", stats.overdueTasks, stats.filteredOwner, stats.filteredTeam, stats.dateRange],
        ["Activities Today", stats.activitiesToday, stats.filteredOwner, stats.filteredTeam, stats.dateRange],
        ["Conversion Rate %", stats.conversionRate, stats.filteredOwner, stats.filteredTeam, stats.dateRange],
      ],
    ),
  );
}

export const DASHBOARD_OWNERS = ["All", ...ACTIVITY_OWNERS] as const;

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}
