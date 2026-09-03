/** Named dashboard layouts keyed by workspace role. */

import { readJsonStore, writeJsonStore } from "@/lib/rules/storage";
import { ROLES, type HierarchyLevel } from "@/lib/rules/permissions";
import {
  defaultDashboardLayout,
  type DashboardLayout,
} from "@/lib/dashboard/layout";

const STORE_KEY = "dashboard:layouts-by-role:v1";
const ROLE_KEY = "dashboard:active-role:v1";

export type NamedDashboardLayout = {
  name: string;
  layout: DashboardLayout;
};

export type RoleLayoutStore = Partial<
  Record<HierarchyLevel, { saved: NamedDashboardLayout[]; activeName?: string }>
>;

export const DASHBOARD_ROLES = ROLES.map((r) => r.name);

export function loadActiveDashboardRole(): HierarchyLevel {
  const raw = readJsonStore<string>(ROLE_KEY, "Manager");
  return DASHBOARD_ROLES.includes(raw as HierarchyLevel)
    ? (raw as HierarchyLevel)
    : "Manager";
}

export function saveActiveDashboardRole(role: HierarchyLevel) {
  writeJsonStore(ROLE_KEY, role);
}

function loadStore(): RoleLayoutStore {
  return readJsonStore<RoleLayoutStore>(STORE_KEY, {});
}

export function listRoleLayouts(role: HierarchyLevel): NamedDashboardLayout[] {
  return loadStore()[role]?.saved ?? [];
}

export function activeRoleLayoutName(role: HierarchyLevel): string | undefined {
  return loadStore()[role]?.activeName;
}

export function saveRoleLayout(
  role: HierarchyLevel,
  name: string,
  layout: DashboardLayout,
): NamedDashboardLayout[] {
  const label = name.trim() || "Untitled";
  const store = loadStore();
  const bucket = store[role] ?? { saved: [] };
  const saved = bucket.saved.filter((row) => row.name !== label);
  saved.unshift({ name: label, layout });
  store[role] = { saved: saved.slice(0, 12), activeName: label };
  writeJsonStore(STORE_KEY, store);
  return store[role]!.saved;
}

export function loadRoleLayout(
  role: HierarchyLevel,
  name: string,
): DashboardLayout | null {
  const row = listRoleLayouts(role).find((item) => item.name === name);
  if (!row) return null;
  const store = loadStore();
  store[role] = {
    saved: store[role]?.saved ?? [],
    activeName: name,
  };
  writeJsonStore(STORE_KEY, store);
  const base = defaultDashboardLayout();
  return {
    ...base,
    ...row.layout,
    filters: { ...base.filters, ...row.layout.filters },
    order: row.layout.order?.length ? row.layout.order : base.order,
    hidden: row.layout.hidden ?? base.hidden,
  };
}
