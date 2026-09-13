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

/**
 * Workspace role → the `HierarchyLevel` vocabulary the permission engine in
 * `@/lib/rules/permissions` speaks.
 *
 * That engine predates workspace roles and only knows "System Admin",
 * "Org Admin", "Manager", "Team Lead", "User" and "Read Only". It was being
 * handed `User.globalRole`, which is `USER` for everyone who signs up — so a
 * workspace OWNER was gated as a plain user and `requireAction` refused
 * things like `sales.contacts.create`, even though the Nest guards allow an
 * OWNER to do them.
 *
 * OWNER and ADMIN both map to "Org Admin": they are the top of a tenant, and
 * "System Admin" is reserved for platform staff (`User.globalRole`), who are
 * not workspace members at all.
 */
const RULES_ROLE: Record<WorkspaceRole, string> = {
  OWNER: "Org Admin",
  ADMIN: "Org Admin",
  MANAGER: "Manager",
  TEAM_LEAD: "Team Lead",
  MEMBER: "User",
  VIEWER: "Read Only",
  GUEST: "Read Only",
};

export function rulesRoleForWorkspaceRole(
  role: string | null | undefined,
): string | null {
  const known = asWorkspaceRole(role);
  return known ? RULES_ROLE[known] : null;
}
