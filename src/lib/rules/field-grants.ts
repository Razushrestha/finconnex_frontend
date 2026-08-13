/**
 * Editable field-level grants (Phase E5) — seeds from PERMISSION_GRANTS.
 */

import {
  PERMISSION_GRANTS,
  can,
  roleLevel,
  type PermissionGrant,
} from "@/lib/rules/permissions";
import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";
import { appendAuditEvent } from "@/lib/rules/audit";
import { getRulesActor } from "@/lib/rules/actor";
import { fail, ok, type RuleResult } from "@/lib/rules/types";

const KEY = "rules:field-grants:v1";

function seedFieldGrants(): PermissionGrant[] {
  return PERMISSION_GRANTS.filter((g) => g.scope === "field").map((g) => ({
    ...g,
  }));
}

export function listFieldGrants(): PermissionGrant[] {
  return readPersistedJson(KEY, seedFieldGrants());
}

export function saveFieldGrants(grants: PermissionGrant[]) {
  writePersistedJson(KEY, grants);
  return grants;
}

export function upsertFieldGrant(grant: PermissionGrant) {
  const list = listFieldGrants();
  const i = list.findIndex((g) => g.id === grant.id);
  if (i >= 0) list[i] = grant;
  else list.unshift(grant);
  return saveFieldGrants(list);
}

export function canField(resource: string): boolean {
  const actor = getRulesActor();
  const role = actor.role ?? "User";
  if (roleLevel(role) >= 80) return true;
  const grants = listFieldGrants().filter((g) => g.role === role);
  const match = grants.find(
    (g) => g.resource === resource || resource.startsWith(g.resource + "."),
  );
  if (match) return match.allowed;
  return can({ role, resource, scope: "field" });
}

export function requireField(resource: string): RuleResult {
  if (canField(resource)) return ok();
  const actor = getRulesActor();
  appendAuditEvent({
    action: "permission_denied",
    module: "permissions",
    actor: actor.name,
    summary: `Denied field ${resource} for role ${actor.role ?? "unknown"}`,
    meta: { resource, role: String(actor.role ?? ""), scope: "field" },
  });
  return fail(
    "PERMISSION_DENIED",
    `Your role (${actor.role}) cannot access field ${resource}`,
  );
}

export const SENSITIVE_LEAD_FIELDS = [
  {
    id: "fg-est",
    resource: "sales.leads.estimatedValue",
    label: "Lead estimated value",
  },
  {
    id: "fg-email",
    resource: "sales.leads.email",
    label: "Lead email",
  },
  {
    id: "fg-phone",
    resource: "sales.leads.phone",
    label: "Lead phone",
  },
] as const;
