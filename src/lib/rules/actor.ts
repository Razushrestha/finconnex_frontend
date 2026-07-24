/** Client-side actor + action gate for §28.4 / §28.5 */

import { appendAuditEvent } from "@/lib/rules/audit";
import { can } from "@/lib/rules/permissions";
import { moveToRecycleBin } from "@/lib/rules/soft-delete";
import {
  emitRulesChange,
  readJsonStore,
  writeJsonStore,
} from "@/lib/rules/storage";
import { fail, ok, type RuleResult, type RulesActor } from "@/lib/rules/types";

const ACTOR_KEY = "rules:actor:v1";

const FALLBACK_ACTOR: RulesActor = {
  name: "John Smith",
  role: "Manager",
};

/** Persist session actor for client-side rules (called from DashboardShell). */
export function setRulesActor(actor: RulesActor) {
  writeJsonStore(ACTOR_KEY, {
    name: actor.name,
    role: actor.role,
    id: actor.id,
  });
  emitRulesChange("actor");
}

/** Current actor — session-backed when DashboardShell hydrated, else demo seed. */
export function getRulesActor(): RulesActor {
  const stored = readJsonStore<RulesActor | null>(ACTOR_KEY, null);
  if (stored?.name && stored?.role) return stored;
  return { ...FALLBACK_ACTOR };
}

/** Demo org manager for §28.3 deal-close fan-out. */
export function getOrgManager() {
  return "Tejas Gokhe";
}

/** §28.5 — gate an action; logs permission_denied when blocked. */
export function requireAction(resource: string): RuleResult {
  const actor = getRulesActor();
  if (
    !can({
      role: actor.role ?? "User",
      resource,
      scope: "action",
    })
  ) {
    appendAuditEvent({
      action: "permission_denied",
      module: "permissions",
      actor: actor.name,
      summary: `Denied ${resource} for role ${actor.role ?? "unknown"}`,
      meta: { resource, role: String(actor.role ?? "") },
    });
    return fail(
      "PERMISSION_DENIED",
      `Your role (${actor.role}) cannot perform ${resource}`,
    );
  }
  return ok();
}

/**
 * §28.1 + §28.5 — permission check then soft-delete into Recycle Bin.
 * Caller still removes the live record from its module store.
 */
export function softDeleteRecord(input: {
  action: string;
  module: string;
  recordId: string;
  recordLabel: string;
  recordType: string;
  snapshot: unknown;
}): RuleResult {
  const gate = requireAction(input.action);
  if (!gate.ok) return gate;
  moveToRecycleBin({
    module: input.module,
    recordId: input.recordId,
    recordLabel: input.recordLabel,
    recordType: input.recordType,
    deletedBy: getRulesActor().name,
    snapshot: input.snapshot,
  });
  return ok();
}
