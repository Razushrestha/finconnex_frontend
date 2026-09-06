import { readJsonStore, writeJsonStore } from "@/lib/rules/storage";
import type { DashboardViewId } from "@/lib/dashboard/views";

export type ViewWidget = { id: string; label: string; span?: "full" | "third" };

export const SALES_WIDGETS: ViewWidget[] = [
  { id: "kpis", label: "Sales KPIs", span: "full" },
  { id: "pipeline-stage", label: "Pipeline Value by Stage" },
  { id: "pipeline-loan", label: "Pipeline Value by Loan Type" },
  { id: "deals-stage", label: "Deals by Stage" },
  { id: "leads-source", label: "Leads by Source" },
  { id: "lead-deal-conv", label: "Lead → Deal Conversion" },
  { id: "deal-settle-conv", label: "Deal → Settlement Conversion" },
  { id: "top-sources", label: "Top Performing Sources" },
  { id: "top-brokers", label: "Top Performing Brokers" },
  { id: "lost-deals", label: "Lost Deals Overview" },
];

export const PERFORMANCE_WIDGETS: ViewWidget[] = [
  { id: "kpis", label: "Performance KPIs", span: "full" },
  { id: "conversion-funnel", label: "Conversion Funnel" },
  { id: "trend", label: "Performance Trend" },
  { id: "pipeline-stage", label: "Pipeline Value by Stage" },
  { id: "stage-times", label: "Average Time in Stage" },
  { id: "vs-target", label: "Performance vs Target" },
  { id: "bottleneck", label: "Biggest Bottleneck" },
  { id: "team", label: "Team Performance" },
  { id: "loan-type", label: "Loan Type Performance" },
  { id: "mom-growth", label: "Month on Month Growth" },
];

export const WORK_QUEUE_WIDGETS: ViewWidget[] = [
  { id: "kpis", label: "Work Queue KPIs", span: "full" },
  { id: "tasks-today", label: "Tasks Due Today" },
  { id: "follow-ups", label: "Follow-ups Due" },
  { id: "documents", label: "Documents Pending" },
  { id: "appointments", label: "Appointments Today" },
  { id: "missed", label: "Missed Appointments" },
  { id: "stale", label: "Stale Deals" },
  { id: "approvals", label: "Approvals Pending" },
  { id: "lenders", label: "Lender Pending Actions" },
  { id: "urgent", label: "Urgent / High Priority" },
];

const HIDDEN_KEY = "dashboard:view-hidden:v1";
const DEFAULT_HIDDEN_KEY = "dashboard:view-hidden-default:v1";
const ORDER_KEY = "dashboard:view-order:v1";

type HiddenMap = Partial<Record<DashboardViewId, string[]>>;
type OrderMap = Partial<Record<DashboardViewId, string[]>>;

export function widgetsForView(view: DashboardViewId): ViewWidget[] {
  if (view === "sales") return SALES_WIDGETS;
  if (view === "performance") return PERFORMANCE_WIDGETS;
  if (view === "work-queue") return WORK_QUEUE_WIDGETS;
  return [];
}

export function loadViewHidden(view: DashboardViewId): string[] {
  return readJsonStore<HiddenMap>(HIDDEN_KEY, {})[view] ?? [];
}

export function saveViewHidden(view: DashboardViewId, hidden: string[]) {
  const all = readJsonStore<HiddenMap>(HIDDEN_KEY, {});
  writeJsonStore(HIDDEN_KEY, { ...all, [view]: hidden });
}

export function setDefaultViewHidden(view: DashboardViewId, hidden: string[]) {
  const all = readJsonStore<HiddenMap>(DEFAULT_HIDDEN_KEY, {});
  writeJsonStore(DEFAULT_HIDDEN_KEY, { ...all, [view]: hidden });
}

export function restoreDefaultViewHidden(view: DashboardViewId): string[] {
  const hidden = readJsonStore<HiddenMap>(DEFAULT_HIDDEN_KEY, {})[view] ?? [];
  saveViewHidden(view, hidden);
  return hidden;
}

export function mergeViewOrder(view: DashboardViewId, stored?: string[]) {
  const catalog = widgetsForView(view).map((widget) => widget.id);
  const next = (stored ?? []).filter((id) => catalog.includes(id));
  for (const id of catalog) {
    if (!next.includes(id)) next.push(id);
  }
  return next;
}

export function loadViewOrder(view: DashboardViewId): string[] {
  return mergeViewOrder(view, readJsonStore<OrderMap>(ORDER_KEY, {})[view]);
}

export function saveViewOrder(view: DashboardViewId, order: string[]) {
  const all = readJsonStore<OrderMap>(ORDER_KEY, {});
  writeJsonStore(ORDER_KEY, { ...all, [view]: mergeViewOrder(view, order) });
}

export function moveViewWidget(order: string[], fromId: string, toId: string) {
  const from = order.indexOf(fromId);
  const to = order.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return order;
  const next = [...order];
  const [item] = next.splice(from, 1);
  if (!item) return order;
  next.splice(to, 0, item);
  return next;
}

export function resetViewOrder(view: DashboardViewId): string[] {
  const next = mergeViewOrder(view, []);
  saveViewOrder(view, next);
  return next;
}
