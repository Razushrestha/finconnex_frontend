import {
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch, crmWorkspaceFetch } from "@/lib/crm/request";
import {
  DASHBOARD_WIDGETS,
  dateRangeBounds,
  defaultDashboardFilters,
  defaultDashboardLayout,
  migrateWidgetId,
  type DashboardFilters,
  type DashboardLayout,
  type DashboardWidgetId,
} from "@/lib/dashboard/layout";

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return extractRecords(data[0]);
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  const rec = asRecord(data);
  if (!rec) return [];
  for (const key of [
    "items",
    "layouts",
    "widgets",
    "catalog",
    "records",
    "rows",
    "result",
    "results",
  ]) {
    if (Array.isArray(rec[key])) return extractRecords(rec[key]);
  }
  if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  if (pickStr(rec.id, rec.layoutId, rec.key, rec.widgetKey)) return [rec];
  return [];
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function dashboardMetricsPath(suffix = ""): string {
  return `/v1/dashboard${suffix}`;
}

export function workspaceDashboardPath(
  workspaceId: string,
  suffix = "",
): string {
  return `/v1/workspaces/${workspaceId}/dashboard${suffix}`;
}

export function workspaceDashboardLayoutsPath(
  workspaceId: string,
  suffix = "",
): string {
  return workspaceDashboardPath(workspaceId, `/layouts${suffix}`);
}

export function workspaceDashboardWidgetsPath(
  workspaceId: string,
  suffix = "",
): string {
  return workspaceDashboardPath(workspaceId, `/widgets${suffix}`);
}

async function requireSession(): Promise<CrmSession> {
  const session = await ensureCrmSession();
  if (!session) {
    throw new Error("Sign in with a workspace to load the dashboard");
  }
  return session;
}

async function dashboardCrm<T>(path: string, init?: RequestInit): Promise<T> {
  if (isBoundCrmSession()) {
    return crmFetch(await requireSession(), path, init);
  }
  return crmWorkspaceFetch<T>(path, init);
}

/** Query keys allowed on GET /v1/dashboard and widget data (DashboardFiltersDto). */
export function dashboardFilterQuery(
  filters?: DashboardFilters,
  ownerId?: string,
): Record<string, string | undefined> {
  if (!filters) {
    return ownerId && isUuid(ownerId) ? { ownerId } : {};
  }
  const bounds = dateRangeBounds(filters);
  let start = bounds.start ?? new Date(Date.now() - 365 * 86_400_000);
  const end = bounds.end ?? new Date();
  if (end.getTime() - start.getTime() > 365 * 86_400_000) {
    start = new Date(end.getTime() - 365 * 86_400_000);
  }
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    ownerId: ownerId && isUuid(ownerId) ? ownerId : undefined,
    timezone:
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        : "UTC",
    compareTo: "previous_period",
  };
}

export function dashboardWidgetQuery(
  filters?: DashboardFilters,
  ownerId?: string,
): Record<string, string | undefined> {
  const q = dashboardFilterQuery(filters, ownerId);
  return {
    startDate: q.startDate,
    endDate: q.endDate,
    ownerId: q.ownerId,
    comparePeriod: "previous_period",
  };
}

export type CrmDashboardLayout = {
  id: string;
  name: string;
  isDefault: boolean;
  layout: DashboardLayout;
};

export type CrmDashboardWidget = {
  key: string;
  label: string;
  widgetId: DashboardWidgetId | null;
};

function layoutWidgetsPayload(layout: DashboardLayout) {
  return layout.order.map((id, index) => ({
    instanceId: id,
    widgetKey: id,
    x: (index % 6) * 2,
    y: Math.floor(index / 6) * 4,
    width: 2,
    height: 4,
    visible: !layout.hidden.includes(id),
  }));
}

export function layoutWriteBody(layout: DashboardLayout, name?: string) {
  return {
    name: name?.trim() || "Executive",
    scope: "USER",
    widgets: layoutWidgetsPayload(layout),
  };
}

export function mapCrmDashboardLayout(raw: unknown): CrmDashboardLayout | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const id = pickStr(rec.id, rec.layoutId);
  if (!id) return null;
  const config = asRecord(rec.config) ?? asRecord(rec.layout) ?? rec;
  const order: DashboardWidgetId[] = [];
  const hidden: DashboardWidgetId[] = [];

  const listed = Array.isArray(config.order)
    ? config.order
    : Array.isArray(rec.widgets)
      ? rec.widgets
      : [];
  for (const item of listed) {
    const key =
      typeof item === "string"
        ? item
        : pickStr(
            asRecord(item)?.key,
            asRecord(item)?.widgetKey,
            asRecord(item)?.id,
          );
    const idMapped = migrateWidgetId(key);
    if (idMapped && !order.includes(idMapped)) order.push(idMapped);
    const row = asRecord(item);
    if (idMapped && (row?.hidden === true || row?.visible === false)) {
      hidden.push(idMapped);
    }
  }
  for (const w of DASHBOARD_WIDGETS) {
    if (!order.includes(w.id)) order.push(w.id);
  }

  const hiddenListed = Array.isArray(config.hidden) ? config.hidden : rec.hidden;
  if (Array.isArray(hiddenListed)) {
    for (const item of hiddenListed) {
      const idMapped = migrateWidgetId(String(item));
      if (idMapped && !hidden.includes(idMapped)) hidden.push(idMapped);
    }
  }

  const filtersRaw = asRecord(config.filters) ?? asRecord(rec.filters);
  const base = defaultDashboardLayout();
  return {
    id,
    name: pickStr(rec.name, rec.title, rec.label) || "Dashboard",
    isDefault: rec.isDefault === true || rec.default === true,
    layout: {
      order: order.length ? order : base.order,
      hidden: hidden.length ? hidden : base.hidden,
      filters: {
        ...defaultDashboardFilters(),
        ...(filtersRaw
          ? {
              dateRange:
                typeof filtersRaw.dateRange === "string"
                  ? (filtersRaw.dateRange as DashboardLayout["filters"]["dateRange"])
                  : defaultDashboardFilters().dateRange,
              owner:
                typeof filtersRaw.owner === "string"
                  ? filtersRaw.owner
                  : defaultDashboardFilters().owner,
              team:
                typeof filtersRaw.team === "string"
                  ? (filtersRaw.team as DashboardLayout["filters"]["team"])
                  : defaultDashboardFilters().team,
              loanType:
                typeof filtersRaw.loanType === "string"
                  ? (filtersRaw.loanType as DashboardLayout["filters"]["loanType"])
                  : defaultDashboardFilters().loanType,
              dateFrom:
                typeof filtersRaw.dateFrom === "string"
                  ? filtersRaw.dateFrom
                  : undefined,
              dateTo:
                typeof filtersRaw.dateTo === "string"
                  ? filtersRaw.dateTo
                  : undefined,
            }
          : {}),
      },
      isDefault: rec.isDefault === true || rec.default === true,
      remoteId: id,
    },
  };
}

export function mapCrmDashboardWidget(raw: unknown): CrmDashboardWidget | null {
  if (typeof raw === "string" && raw.trim()) {
    return {
      key: raw.trim(),
      label: raw.trim(),
      widgetId: migrateWidgetId(raw),
    };
  }
  const rec = asRecord(raw);
  if (!rec) return null;
  const key = pickStr(rec.key, rec.widgetKey, rec.id, rec.slug);
  if (!key) return null;
  return {
    key,
    label: pickStr(rec.label, rec.name, rec.title) || key,
    widgetId: migrateWidgetId(key),
  };
}

async function workspaceId(): Promise<string | null> {
  const session = await ensureCrmSession();
  if (!session?.workspaceId || !isUuid(session.workspaceId)) return null;
  return session.workspaceId;
}

export async function getCrmDashboardMetrics(
  filters?: DashboardFilters,
  ownerId?: string,
): Promise<unknown> {
  return dashboardCrm(
    `${dashboardMetricsPath()}${toQuery(dashboardFilterQuery(filters, ownerId))}`,
  );
}

export async function listCrmDashboardLayouts(): Promise<CrmDashboardLayout[]> {
  const id = await workspaceId();
  if (!id) return [];
  const raw = await dashboardCrm(workspaceDashboardLayoutsPath(id));
  return extractRecords(raw)
    .map(mapCrmDashboardLayout)
    .filter((row): row is CrmDashboardLayout => !!row);
}

export async function getCrmDashboardLayout(
  layoutId: string,
): Promise<CrmDashboardLayout | null> {
  const id = await workspaceId();
  if (!id || !layoutId) return null;
  const raw = await dashboardCrm(
    workspaceDashboardLayoutsPath(id, `/${layoutId}`),
  );
  return mapCrmDashboardLayout(raw);
}

export async function createCrmDashboardLayout(
  layout: DashboardLayout,
  name?: string,
): Promise<CrmDashboardLayout | null> {
  const id = await workspaceId();
  if (!id) return null;
  const raw = await dashboardCrm(workspaceDashboardLayoutsPath(id), {
    method: "POST",
    body: JSON.stringify(layoutWriteBody(layout, name)),
  });
  return mapCrmDashboardLayout(raw);
}

export async function updateCrmDashboardLayout(
  layoutId: string,
  layout: DashboardLayout,
  name?: string,
): Promise<CrmDashboardLayout | null> {
  const id = await workspaceId();
  if (!id || !layoutId) return null;
  const raw = await dashboardCrm(
    workspaceDashboardLayoutsPath(id, `/${layoutId}`),
    {
      method: "PATCH",
      body: JSON.stringify(layoutWriteBody(layout, name)),
    },
  );
  return mapCrmDashboardLayout(raw);
}

export async function deleteCrmDashboardLayout(layoutId: string): Promise<void> {
  const id = await workspaceId();
  if (!id || !layoutId) return;
  await dashboardCrm(workspaceDashboardLayoutsPath(id, `/${layoutId}`), {
    method: "DELETE",
  });
}

export async function duplicateCrmDashboardLayout(
  layoutId: string,
): Promise<CrmDashboardLayout | null> {
  const id = await workspaceId();
  if (!id || !layoutId) return null;
  const raw = await dashboardCrm(
    workspaceDashboardLayoutsPath(id, `/${layoutId}/duplicate`),
    { method: "POST", body: "{}" },
  );
  return mapCrmDashboardLayout(raw);
}

export async function setDefaultCrmDashboardLayout(
  layoutId: string,
): Promise<CrmDashboardLayout | null> {
  const id = await workspaceId();
  if (!id || !layoutId) return null;
  const raw = await dashboardCrm(
    workspaceDashboardLayoutsPath(id, `/${layoutId}/set-default`),
    { method: "POST", body: "{}" },
  );
  return mapCrmDashboardLayout(raw);
}

export async function upsertCrmDashboardLayout(
  layout: DashboardLayout,
  name?: string,
): Promise<CrmDashboardLayout | null> {
  if (layout.remoteId) {
    return updateCrmDashboardLayout(layout.remoteId, layout, name);
  }
  return createCrmDashboardLayout(layout, name);
}

export async function loadPreferredCrmDashboardLayout(): Promise<DashboardLayout | null> {
  const rows = await listCrmDashboardLayouts();
  if (!rows.length) return null;
  const preferred = rows.find((row) => row.isDefault) ?? rows[0];
  return preferred.layout;
}

export async function listCrmDashboardWidgetCatalog(): Promise<
  CrmDashboardWidget[]
> {
  const id = await workspaceId();
  if (!id) return [];
  const raw = await dashboardCrm(
    workspaceDashboardWidgetsPath(id, "/catalog"),
  );
  const rows = extractRecords(raw);
  if (rows.length) {
    return rows
      .map(mapCrmDashboardWidget)
      .filter((row): row is CrmDashboardWidget => !!row);
  }
  if (Array.isArray(raw)) {
    return raw
      .map(mapCrmDashboardWidget)
      .filter((row): row is CrmDashboardWidget => !!row);
  }
  return [];
}

export async function getCrmDashboardWidget(
  widgetKey: string,
): Promise<unknown> {
  const id = await workspaceId();
  if (!id || !widgetKey) return null;
  return dashboardCrm(
    workspaceDashboardWidgetsPath(id, `/${encodeURIComponent(widgetKey)}`),
  );
}

export async function getCrmDashboardWidgetData(
  widgetKey: string,
  filters?: DashboardFilters,
  ownerId?: string,
): Promise<unknown> {
  const id = await workspaceId();
  if (!id || !widgetKey) return null;
  return dashboardCrm(
    `${workspaceDashboardWidgetsPath(id, `/${encodeURIComponent(widgetKey)}/data`)}${toQuery(dashboardWidgetQuery(filters, ownerId))}`,
  );
}

export const DASHBOARD_ANALYTICS_WIDGETS = [
  "TOTAL_LEADS",
  "TOTAL_DEALS",
  "LEAD_CONVERSION_RATE",
  "DEAL_STAGE_FUNNEL",
  "DEAL_WIN_LOSS_RATIO",
  "OPEN_TASKS",
  "OVERDUE_TASKS",
  "ACTIVITY_COUNT",
  "UPCOMING_MEETINGS",
  "TASK_STATUS_BREAKDOWN",
  "ACTIVITY_BY_TYPE",
  "MEETING_STATUS_BREAKDOWN",
] as const;

export async function batchCrmDashboardWidgets(
  keys: string[],
  filters?: DashboardFilters,
  ownerId?: string,
): Promise<unknown> {
  const id = await workspaceId();
  if (!id) return null;
  const widgets = keys.slice(0, 20).map((key) => ({
    key,
    instanceId: key,
  }));
  return dashboardCrm(
    `${workspaceDashboardWidgetsPath(id, "/batch")}${toQuery(dashboardWidgetQuery(filters, ownerId))}`,
    {
      method: "POST",
      body: JSON.stringify({ widgets }),
    },
  );
}
