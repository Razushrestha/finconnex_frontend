/** Nest `User.globalRole` platform staff tiers. */
export const PLATFORM_ADMIN_ROLES = [
  "ADMIN",
  "DEVELOPER",
  "SUPER_ADMIN",
] as const;

export type PlatformAdminRole = (typeof PLATFORM_ADMIN_ROLES)[number];

export function isPlatformAdminRole(
  role: string | null | undefined,
): boolean {
  const normalized = (role ?? "").trim().toUpperCase();
  return (
    normalized === "ADMIN" ||
    normalized === "DEVELOPER" ||
    normalized === "SUPER_ADMIN"
  );
}

/** Nest `/v1/platform/*` requires SUPER_ADMIN specifically. */
export function isSuperAdminRole(role: string | null | undefined): boolean {
  return (role ?? "").trim().toUpperCase() === "SUPER_ADMIN";
}

export function platformRoleLabel(role: string | null | undefined): string {
  const normalized = (role ?? "").trim().toUpperCase();
  if (normalized === "DEVELOPER") return "Developer";
  if (normalized === "SUPER_ADMIN") return "Super admin";
  if (normalized === "ADMIN") return "Platform admin";
  return role?.trim() || "User";
}
