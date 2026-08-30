import {
  ensureCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type { ManageColumn } from "@/components/work-queue/ManageColumnsModal";
import type { ListViewConfig } from "@/components/common/ListViewSettingsModal";

export type CrmTableColumnPref = {
  id: string;
  visible: boolean;
  pinned?: boolean;
  width?: number;
};

export type CrmTablePreference = {
  tableKey: string;
  visibleColumnIds: string[];
  columnOrder: string[];
  pinnedColumnIds: string[];
  sortBy: string;
  sortDirection: "asc" | "desc" | "";
  pageSize: number;
  columns: CrmTableColumnPref[];
};

export const TABLE_PREFERENCE_KEYS = [
  "leads",
  "contacts",
  "companies",
  "deals",
  "tasks",
  "work-queue",
] as const;

export type TablePreferenceKey = (typeof TABLE_PREFERENCE_KEYS)[number] | string;

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  for (const key of ["data", "preference", "preferences", "value", "config"]) {
    const nested = rec[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested) && nested !== raw) {
      return nested as Record<string, unknown>;
    }
  }
  return rec;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return pickStr(
          (item as Record<string, unknown>).id,
          (item as Record<string, unknown>).key,
          (item as Record<string, unknown>).field,
        );
      }
      return "";
    })
    .filter(Boolean);
}

function asSortDirection(value: unknown): "asc" | "desc" | "" {
  const raw = pickStr(value).toLowerCase();
  if (raw === "asc" || raw === "ascending") return "asc";
  if (raw === "desc" || raw === "descending") return "desc";
  return "";
}

export function workspaceTablePreferencePath(
  workspaceId: string,
  tableKey: string,
): string {
  return `/v1/workspaces/${workspaceId}/preferences/tables/${encodeURIComponent(tableKey)}`;
}

export function isEmptyTablePreference(pref: CrmTablePreference): boolean {
  return (
    pref.visibleColumnIds.length === 0 &&
    pref.columnOrder.length === 0 &&
    pref.columns.length === 0 &&
    !pref.sortBy &&
    pref.pageSize <= 0
  );
}

export function normalizeCrmTablePreference(
  raw: unknown,
  fallbackKey = "",
): CrmTablePreference {
  const rec = asRecord(raw) ?? {};
  const sort =
    rec.sort && typeof rec.sort === "object" && !Array.isArray(rec.sort)
      ? (rec.sort as Record<string, unknown>)
      : {};
  const rawColumns = Array.isArray(rec.columns) ? rec.columns : [];
  const columns: CrmTableColumnPref[] = rawColumns.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const col = item as Record<string, unknown>;
    const id = pickStr(col.id, col.key, col.field, col.name);
    if (!id) return [];
    const hidden =
      col.hidden === true || col.visible === false || col.checked === false;
    return [
      {
        id,
        visible: !hidden,
        pinned: col.pinned === true,
        width: pickNum(col.width) || undefined,
      },
    ];
  });

  const visibleFromColumns = columns.filter((c) => c.visible).map((c) => c.id);
  const orderFromColumns = columns.map((c) => c.id);
  const pinnedFromColumns = columns.filter((c) => c.pinned).map((c) => c.id);

  const visibleColumnIds =
    asStringList(
      rec.visibleColumnIds ??
        rec.selectedColumnIds ??
        rec.visibleColumns ??
        rec.columnsVisible,
    ) || visibleFromColumns;
  const columnOrder =
    asStringList(rec.columnOrder ?? rec.order ?? rec.orderedColumnIds) ||
    orderFromColumns;
  const pinnedColumnIds =
    asStringList(rec.pinnedColumnIds ?? rec.pinnedColumns) || pinnedFromColumns;

  return {
    tableKey: pickStr(rec.tableKey, rec.key, fallbackKey),
    visibleColumnIds: visibleColumnIds.length ? visibleColumnIds : visibleFromColumns,
    columnOrder: columnOrder.length ? columnOrder : orderFromColumns,
    pinnedColumnIds,
    sortBy: pickStr(rec.sortBy, rec.sortField, sort.field, sort.by),
    sortDirection: asSortDirection(
      rec.sortDirection ?? rec.sortDir ?? sort.direction ?? sort.order,
    ),
    pageSize: pickNum(rec.pageSize ?? rec.limit ?? rec.perPage),
    columns,
  };
}

export function toTablePreferenceBody(
  pref: CrmTablePreference,
): Record<string, unknown> {
  return {
    tableKey: pref.tableKey,
    visibleColumnIds: pref.visibleColumnIds,
    selectedColumnIds: pref.visibleColumnIds,
    visibleColumns: pref.visibleColumnIds,
    columnOrder: pref.columnOrder,
    pinnedColumnIds: pref.pinnedColumnIds,
    sortBy: pref.sortBy || undefined,
    sortDirection: pref.sortDirection || undefined,
    pageSize: pref.pageSize || undefined,
    columns: pref.columns.map((col, index) => ({
      id: col.id,
      key: col.id,
      visible: col.visible,
      pinned: col.pinned ?? false,
      width: col.width,
      order: index,
    })),
  };
}

export function tablePreferenceFromColumns(
  tableKey: string,
  columns: ManageColumn[],
  extras?: { sortBy?: string; sortDirection?: "asc" | "desc" | ""; pageSize?: number },
): CrmTablePreference {
  return {
    tableKey,
    visibleColumnIds: columns.filter((c) => c.checked).map((c) => c.id),
    columnOrder: columns.map((c) => c.id),
    pinnedColumnIds: columns.filter((c) => c.pinned).map((c) => c.id),
    sortBy: extras?.sortBy ?? "",
    sortDirection: extras?.sortDirection ?? "",
    pageSize: extras?.pageSize ?? 0,
    columns: columns.map((c) => ({
      id: c.id,
      visible: c.checked,
      pinned: c.pinned,
    })),
  };
}

export function applyTablePreferenceToColumns(
  defaults: ManageColumn[],
  pref: CrmTablePreference,
): ManageColumn[] {
  if (isEmptyTablePreference(pref)) {
    return defaults.map((c) => ({ ...c }));
  }
  const defaultById = new Map(defaults.map((c) => [c.id, c] as const));
  const visible = new Set(
    pref.visibleColumnIds.length
      ? pref.visibleColumnIds
      : pref.columns.filter((c) => c.visible).map((c) => c.id),
  );
  const pinned = new Set(pref.pinnedColumnIds);
  const order = pref.columnOrder.length
    ? pref.columnOrder
    : pref.columns.map((c) => c.id);
  const used = new Set<string>();
  const merged: ManageColumn[] = [];

  for (const id of order) {
    const def = defaultById.get(id);
    if (!def || used.has(id)) continue;
    used.add(id);
    merged.push({
      ...def,
      checked: def.required ? true : visible.has(id),
      pinned: pinned.has(id) || def.pinned,
    });
  }

  for (const def of defaults) {
    if (used.has(def.id)) continue;
    merged.push({
      ...def,
      checked: def.required ? true : visible.has(def.id) || def.checked,
      pinned: pinned.has(def.id) || def.pinned,
    });
  }
  return merged;
}

export function tablePreferenceFromListView(
  tableKey: string,
  view: ListViewConfig,
): CrmTablePreference {
  return {
    tableKey,
    visibleColumnIds: [...view.selectedColumnIds],
    columnOrder: [...view.selectedColumnIds],
    pinnedColumnIds: [],
    sortBy: view.sortBy,
    sortDirection: view.sortDirection,
    pageSize: view.pageSize,
    columns: view.selectedColumnIds.map((id) => ({ id, visible: true })),
  };
}

export function applyTablePreferenceToListView(
  fallback: ListViewConfig,
  pref: CrmTablePreference,
): ListViewConfig {
  if (isEmptyTablePreference(pref)) return { ...fallback };
  return {
    ...fallback,
    selectedColumnIds: pref.visibleColumnIds.length
      ? pref.visibleColumnIds
      : fallback.selectedColumnIds,
    sortBy: pref.sortBy || fallback.sortBy,
    sortDirection:
      pref.sortDirection === "asc" || pref.sortDirection === "desc"
        ? pref.sortDirection
        : fallback.sortDirection,
    pageSize: pref.pageSize > 0 ? pref.pageSize : fallback.pageSize,
  };
}

async function withWorkspace<T>(
  run: (session: CrmSession) => Promise<T>,
): Promise<T> {
  const scoped = await ensureCrmSession();
  if (!scoped) throw new Error("Sign in to manage table preferences");
  return run(scoped);
}

export async function getCrmTablePreference(
  tableKey: string,
): Promise<CrmTablePreference> {
  return withWorkspace(async (session) =>
    normalizeCrmTablePreference(
      await crmFetch(session, workspaceTablePreferencePath(session.workspaceId, tableKey)),
      tableKey,
    ),
  );
}

export async function putCrmTablePreference(
  tableKey: string,
  preference: CrmTablePreference,
): Promise<CrmTablePreference> {
  return withWorkspace(async (session) =>
    normalizeCrmTablePreference(
      await crmFetch(
        session,
        workspaceTablePreferencePath(session.workspaceId, tableKey),
        {
          method: "PUT",
          body: JSON.stringify(toTablePreferenceBody({ ...preference, tableKey })),
        },
      ),
      tableKey,
    ),
  );
}

export async function deleteCrmTablePreference(
  tableKey: string,
): Promise<void> {
  await withWorkspace(async (session) => {
    await crmFetch(
      session,
      workspaceTablePreferencePath(session.workspaceId, tableKey),
      { method: "DELETE" },
    );
  });
}

export async function tryCrmTablePreference<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistCrmTablePreference(
  tableKey: string,
  preference: CrmTablePreference,
) {
  void tryCrmTablePreference(() => putCrmTablePreference(tableKey, preference));
}

export function resetCrmTablePreference(tableKey: string) {
  void tryCrmTablePreference(() => deleteCrmTablePreference(tableKey));
}
