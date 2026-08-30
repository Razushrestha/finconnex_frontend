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

export type DashboardDateRange = "7d" | "30d" | "90d" | "ytd" | "all";

export interface DashboardFilters {
  dateRange: DashboardDateRange;
  owner: string; // "All" or ACTIVITY_OWNERS name
  team: (typeof DASHBOARD_TEAMS)[number];
}

export const DASHBOARD_WIDGETS = [
  { id: "kpis", label: "Core KPIs" },
  { id: "charts", label: "KPI charts" },
  { id: "industry", label: "Industry widgets" },
  { id: "activity", label: "Workspace activity" },
  { id: "meetings", label: "Upcoming meetings" },
  { id: "taskUpdates", label: "Open task updates" },
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number]["id"];

export interface DashboardLayout {
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
  filters: DashboardFilters;
  isDefault: boolean;
}

const LAYOUT_KEY = "dashboard:layout:v2";
const DEFAULT_LAYOUT_KEY = "dashboard:default-layout:v2";
const LEGACY_LAYOUT_KEY = "dashboard:layout:v1";

const WIDGET_ALIASES: Record<string, DashboardWidgetId> = {
  metrics: "kpis",
};

export function defaultDashboardFilters(): DashboardFilters {
  return {
    dateRange: "30d",
    owner: "All",
    team: "All teams",
  };
}

export function defaultDashboardLayout(): DashboardLayout {
  return {
    order: DASHBOARD_WIDGETS.map((w) => w.id),
    hidden: [],
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

export function widgetGridSpan(id: DashboardWidgetId): "full" | "third" {
  if (id === "activity" || id === "meetings" || id === "taskUpdates") {
    return "third";
  }
  return "full";
}

export function parseMoney(value: string): number {
  const n = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Parse due dates like 22/07/2026 or ISO. */
export function parseTaskDueDate(raw: string): Date | null {
  const iso = Date.parse(raw);
  if (!Number.isNaN(iso)) return new Date(iso);
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const y = Number(m[3]);
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function rangeStart(range: DashboardDateRange): Date | null {
  const now = new Date();
  if (range === "all") return null;
  if (range === "ytd") return new Date(now.getFullYear(), 0, 1);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
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
  const start = rangeStart(filters.dateRange);

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
