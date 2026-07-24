/** Shared create/edit helpers for §28.1 / §28.4 / §28.5 */

import { fieldDiff, logEdit } from "@/lib/rules/audit";
import { getRulesActor, requireAction } from "@/lib/rules/actor";
import {
  assertNoSystemFieldEdits,
  stripSystemFields,
} from "@/lib/rules/integrity";
import { humanizeFieldKey } from "@/lib/rules/storage";
import { fail, ok, type RuleResult } from "@/lib/rules/types";

/** Build per-field required errors (§28.1) without duplicating form logic. */
export function requiredFieldErrors(
  fields: Record<string, unknown>,
  requiredKeys: string[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of requiredKeys) {
    const v = fields[key];
    if (v === undefined || v === null || String(v).trim() === "") {
      errors[key] = `${humanizeFieldKey(key)} is required`;
    }
  }
  return errors;
}

/**
 * Apply an edit patch safely: permission → system-field strip → field audit.
 * Returns the merged record (caller persists).
 */
export function prepareRecordEdit<T extends Record<string, unknown>>(input: {
  action: string;
  module: string;
  recordId: string;
  recordLabel: string;
  before: T;
  patch: Record<string, unknown>;
  trackFields?: string[];
  actor?: string;
}): RuleResult & { next?: T; changes?: ReturnType<typeof fieldDiff> } {
  const gate = requireAction(input.action);
  if (!gate.ok) return gate;

  const systemGate = assertNoSystemFieldEdits(input.patch);
  if (!systemGate.ok) return systemGate;

  const clean = stripSystemFields(input.patch);
  const next = { ...input.before, ...clean } as T;
  const changes = fieldDiff(
    input.before,
    next,
    input.trackFields,
  );

  if (changes.length > 0) {
    logEdit(
      input.module,
      input.actor ?? getRulesActor().name,
      input.recordId,
      input.recordLabel,
      changes,
    );
  }

  return { ...ok(), next, changes };
}

export function gateOrFail(result: RuleResult): asserts result is { ok: true } {
  if (!result.ok) {
    throw new Error(result.message);
  }
}
