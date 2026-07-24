import type { TenantContext } from "@/lib/persistence/types";

const DEFAULT_TENANT = "demo";

let override: TenantContext | null = null;

/** Resolve active tenant (demo until auth/org context is wired). */
export function getTenantContext(): TenantContext {
  if (override) return override;
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
