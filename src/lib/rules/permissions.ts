/** SRS §28.5 Permissions: RBAC with hierarchy + module/field/record/action */

export type HierarchyLevel =
  | "System Admin"
  | "Org Admin"
  | "Manager"
  | "Team Lead"
  | "User"
  | "Read Only";

export type PermissionScope =
  | "module"
  | "field"
  | "record"
  | "action";

export type RecordAccess = "Owner" | "Team" | "Public";

export interface RoleDefinition {
  id: string;
  name: HierarchyLevel;
  level: number;
  description: string;
}

export interface PermissionGrant {
  id: string;
  role: HierarchyLevel;
  scope: PermissionScope;
  resource: string;
  allowed: boolean;
  recordAccess?: RecordAccess[];
}

export const ROLES: RoleDefinition[] = [
  {
    id: "sys",
    name: "System Admin",
    level: 100,
    description: "Full platform control including System settings",
  },
  {
    id: "org",
    name: "Org Admin",
    level: 80,
    description: "Tenant configuration, users, and all modules",
  },
  {
    id: "mgr",
    name: "Manager",
    level: 60,
    description: "Team + module access; deal close notifications",
  },
  {
    id: "lead",
    name: "Team Lead",
    level: 40,
    description: "Team records and assignment",
  },
  {
    id: "user",
    name: "User",
    level: 20,
    description: "Own records; standard create/edit",
  },
  {
    id: "ro",
    name: "Read Only",
    level: 10,
    description: "View only: no create/edit/delete",
  },
];

/**
 * Explicit grants: denies win when matched.
 * Unmatched actions use role-aware defaults in `can()` (not fail-open for delete).
 */
export const PERMISSION_GRANTS: PermissionGrant[] = [
  {
    id: "g1",
    role: "User",
    scope: "module",
    resource: "sales.leads",
    allowed: true,
    recordAccess: ["Owner", "Team"],
  },
  {
    id: "g2",
    role: "User",
    scope: "action",
    resource: "sales.leads.delete",
    allowed: false,
  },
  {
    id: "g3",
    role: "Manager",
    scope: "action",
    resource: "sales.leads.delete",
    allowed: true,
    recordAccess: ["Owner", "Team", "Public"],
  },
  {
    id: "g4",
    role: "User",
    scope: "field",
    resource: "sales.leads.estimatedValue",
    allowed: true,
  },
  {
    id: "g5",
    role: "Read Only",
    scope: "action",
    resource: "*.create",
    allowed: false,
  },
  {
    id: "g5b",
    role: "Read Only",
    scope: "action",
    resource: "*.delete",
    allowed: false,
  },
  {
    id: "g5c",
    role: "Read Only",
    scope: "action",
    resource: "*.edit",
    allowed: false,
  },
  {
    id: "g6",
    role: "Org Admin",
    scope: "module",
    resource: "settings.*",
    allowed: true,
    recordAccess: ["Public"],
  },
  {
    id: "g7",
    role: "Manager",
    scope: "module",
    resource: "support.tickets",
    allowed: true,
    recordAccess: ["Owner", "Team", "Public"],
  },
  {
    id: "g8",
    role: "User",
    scope: "record",
    resource: "finance.invoices",
    allowed: true,
    recordAccess: ["Owner"],
  },
  {
    id: "g9",
    role: "User",
    scope: "action",
    resource: "finance.invoices.delete",
    allowed: false,
  },
  {
    id: "g10",
    role: "Manager",
    scope: "action",
    resource: "finance.invoices.delete",
    allowed: true,
    recordAccess: ["Owner", "Team", "Public"],
  },
  {
    id: "g11",
    role: "Manager",
    scope: "action",
    resource: "support.tickets.delete",
    allowed: true,
  },
  {
    id: "g12",
    role: "Manager",
    scope: "action",
    resource: "resources.delete",
    allowed: true,
  },
  {
    id: "g13",
    role: "Manager",
    scope: "action",
    resource: "recycle-bin.restore",
    allowed: true,
  },
  {
    id: "g14",
    role: "Org Admin",
    scope: "action",
    resource: "recycle-bin.purge",
    allowed: true,
  },
  {
    id: "g15",
    role: "User",
    scope: "action",
    resource: "recycle-bin.purge",
    allowed: false,
  },
];

export function roleLevel(role: string): number {
  return ROLES.find((r) => r.name === role)?.level ?? 0;
}

function grantMatches(grantResource: string, resource: string) {
  if (grantResource === resource) return true;
  if (grantResource.endsWith(".*")) {
    const prefix = grantResource.slice(0, -1);
    return resource.startsWith(prefix);
  }
  if (grantResource.startsWith("*.")) {
    return resource.endsWith(grantResource.slice(1));
  }
  return false;
}

/**
 * Permission check with production-safe defaults:
 * - Org Admin+ → allow all
 * - Read Only → deny create/edit/delete
 * - Explicit grant match → grant.allowed
 * - `.delete` / `.purge` → Manager+ (level ≥ 60)
 * - `.create` / `.edit` → User+ (level ≥ 20)
 * - module/field/record → role floor
 */
export function can(input: {
  role: string;
  resource: string;
  scope?: PermissionScope;
  recordAccess?: RecordAccess;
}): boolean {
  const level = roleLevel(input.role);
  if (level >= 80) return true;

  const scope = input.scope ?? "action";
  const isMutatingAction =
    /\.(create|edit|delete|purge|restore)$/.test(input.resource);

  if (input.role === "Read Only" && isMutatingAction) {
    return false;
  }

  const grants = PERMISSION_GRANTS.filter(
    (g) => g.role === input.role && g.scope === scope,
  );

  const match = grants.find((g) => grantMatches(g.resource, input.resource));
  if (match) {
    if (!match.allowed) return false;
    if (
      input.recordAccess &&
      match.recordAccess &&
      !match.recordAccess.includes(input.recordAccess)
    ) {
      return false;
    }
    return true;
  }

  if (scope === "action") {
    if (
      input.resource.endsWith(".delete") ||
      input.resource.endsWith(".purge")
    ) {
      return level >= 60;
    }
    if (input.resource.endsWith(".restore")) {
      return level >= 40;
    }
    if (
      input.resource.endsWith(".create") ||
      input.resource.endsWith(".edit")
    ) {
      return level >= 20;
    }
    return level >= 40;
  }

  if (scope === "module") return level >= 10;
  if (scope === "field" || scope === "record") return level >= 20;
  return false;
}

export function describePermissionMatrix() {
  return {
    roles: ROLES,
    grants: PERMISSION_GRANTS,
    scopes: ["module", "field", "record", "action"] as PermissionScope[],
    recordAccess: ["Owner", "Team", "Public"] as RecordAccess[],
  };
}
