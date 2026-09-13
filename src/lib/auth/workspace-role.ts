/**
 * Nest `WorkspaceMember.role` — the role a user holds *inside one workspace*.
 *
 * Distinct from `User.globalRole` (see `./platform`), which is the platform
 * staff tier and is `USER` for everyone who signs up. Owning an organisation
 * is a workspace role, not a global one: whoever creates a workspace becomes
 * its OWNER. Reading `globalRole` to decide what someone may do inside a
 * workspace is what made a freshly signed-up owner look like a plain user.
 */
export const WORKSPACE_ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "TEAM_LEAD",
  "MEMBER",
  "VIEWER",
  "GUEST",
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

function normalize(role: string | null | undefined): string {
  return (role ?? "").trim().toUpperCase();
}

export function asWorkspaceRole(
  role: string | null | undefined,
): WorkspaceRole | null {
  const normalized = normalize(role);
  return (WORKSPACE_ROLES as readonly string[]).includes(normalized)
    ? (normalized as WorkspaceRole)
    : null;
}

export function isWorkspaceOwner(role: string | null | undefined): boolean {
  return normalize(role) === "OWNER";
}

/**
 * Mirrors `OwnerAdminOnly` on the Nest WorkspaceMemberController: only these
 * two roles may invite or remove members. Gating the invite UI on the same
 * pair keeps the button from offering a call the API will reject with 403.
 */
export function canManageMembers(role: string | null | undefined): boolean {
  const normalized = normalize(role);
  return normalized === "OWNER" || normalized === "ADMIN";
}

/**
 * Mirrors Nest `@WriteProtected()` — VIEWER and GUEST are rejected on every
 * write endpoint (contacts, leads, deals...).
 */
export function canWriteRecords(role: string | null | undefined): boolean {
  const normalized = normalize(role);
  return (
    normalized === "OWNER" ||
    normalized === "ADMIN" ||
    normalized === "MANAGER" ||
    normalized === "TEAM_LEAD" ||
    normalized === "MEMBER"
  );
}

const LABELS: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  TEAM_LEAD: "Team lead",
  MEMBER: "Member",
  VIEWER: "Viewer",
  GUEST: "Guest",
};

export function workspaceRoleLabel(role: string | null | undefined): string {
  const known = asWorkspaceRole(role);
  return known ? LABELS[known] : (role?.trim() || "Member");
}
