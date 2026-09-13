/** Nest `User.globalRole` — there is no SUPER_ADMIN enum. */
export const PLATFORM_ADMIN_ROLES = ["ADMIN", "DEVELOPER"] as const;

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

export function platformRoleLabel(role: string | null | undefined): string {
  const normalized = (role ?? "").trim().toUpperCase();
  if (normalized === "DEVELOPER") return "Developer";
  if (normalized === "ADMIN" || normalized === "SUPER_ADMIN") {
    return "Platform admin";
  }
  return role?.trim() || "User";
}
