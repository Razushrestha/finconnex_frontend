import type { TenantContext } from "@/lib/persistence/types";

const DEFAULT_TENANT = "demo";

/** Same key as `fc.crm.workspaceId` in the CRM browser token helper. */
export const CRM_WORKSPACE_STORAGE_KEY = "fc.crm.workspaceId";

let override: TenantContext | null = null;

function readBrowserWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored =
      window.sessionStorage.getItem(CRM_WORKSPACE_STORAGE_KEY) ||
      window.localStorage.getItem(CRM_WORKSPACE_STORAGE_KEY);
    return stored?.trim() || null;
  } catch {
    return null;
  }
}

/** Resolve active tenant (workspace id when a CRM session is present). */
export function getTenantContext(): TenantContext {
  if (override) return override;
  const fromBrowser = readBrowserWorkspaceId();
  if (fromBrowser) return { tenantId: fromBrowser };
  if (typeof process !== "undefined") {
    const fromEnv =
      process.env.NEXT_PUBLIC_TENANT_ID || process.env.FINCONNEX_TENANT_ID;
    if (fromEnv?.trim()) return { tenantId: fromEnv.trim() };
  }
  return { tenantId: DEFAULT_TENANT };
}

/** Test / host hook — swap tenant without remounting stores. */
export function setTenantContext(ctx: TenantContext | null) {
  override = ctx;
}

/** Prefix storage keys so tenants never collide in shared browsers. */
export function tenantScopedKey(key: string, tenantId?: string): string {
  const id = tenantId ?? getTenantContext().tenantId;
  return `fc:${id}:${key}`;
}

/** localStorage overlays that used to be global across workspaces. */
export function tenantOverlayKey(base: string, tenantId?: string): string {
  return `${base}:${tenantId ?? getTenantContext().tenantId}`;
}
