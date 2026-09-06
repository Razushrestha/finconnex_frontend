export const DASHBOARD_VIEWS = [
  { id: "executive", label: "Executive Overview" },
  { id: "sales", label: "Sales Dashboard" },
  { id: "performance", label: "Performance Dashboard" },
  { id: "work-queue", label: "Work Queue Dashboard" },
] as const;

export type DashboardViewId = (typeof DASHBOARD_VIEWS)[number]["id"];

const VIEW_KEY = "dashboard:active-view";

export function isDashboardViewId(value: string | null | undefined): value is DashboardViewId {
  return DASHBOARD_VIEWS.some((view) => view.id === value);
}

export function dashboardViewLabel(id: DashboardViewId) {
  return DASHBOARD_VIEWS.find((view) => view.id === id)?.label ?? "Executive Overview";
}

export function loadDashboardView(): DashboardViewId {
  if (typeof window === "undefined") return "executive";
  const stored = window.localStorage.getItem(VIEW_KEY);
  return isDashboardViewId(stored) ? stored : "executive";
}

export function saveDashboardView(id: DashboardViewId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VIEW_KEY, id);
}
