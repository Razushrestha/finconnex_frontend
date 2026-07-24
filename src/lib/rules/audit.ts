/** SRS §28.4 Audit Trail: central log + field-level diffs */

import {
  emitRulesChange,
  formatRulesAt,
  newRulesId,
  readJsonStore,
  writeJsonStore,
} from "@/lib/rules/storage";

export type AuditAction =
  | "create"
  | "edit"
  | "delete"
  | "restore"
  | "status_change"
  | "login"
  | "logout"
  | "login_failed"
  | "permission_denied"
  | "purge";

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface AuditEvent {
  id: string;
  at: string;
  action: AuditAction;
  module: string;
  recordId?: string;
  recordLabel?: string;
  actor: string;
  summary: string;
  changes?: FieldChange[];
  meta?: Record<string, string>;
}

const STORE_KEY = "rules:audit:v1";
const MAX_EVENTS = 500;

function readStore(): AuditEvent[] {
  return readJsonStore<AuditEvent[]>(STORE_KEY, []);
}

function writeStore(list: AuditEvent[]) {
  writeJsonStore(STORE_KEY, list.slice(0, MAX_EVENTS));
  emitRulesChange("audit");
}

export function listAuditEvents(): AuditEvent[] {
  return readStore();
}

export function appendAuditEvent(
  partial: Omit<AuditEvent, "id" | "at"> & { at?: string },
): AuditEvent {
  const event: AuditEvent = {
    id: newRulesId("aud"),
    at: partial.at ?? formatRulesAt(new Date(), true),
    ...partial,
  };
  const list = listAuditEvents();
  list.unshift(event);
  writeStore(list);
  return event;
}

/** Field-level change history helper for detail views. */
export function fieldDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields?: string[],
): FieldChange[] {
  const keys = fields ?? [
    ...new Set([...Object.keys(before), ...Object.keys(after)]),
  ];
  const changes: FieldChange[] = [];
  for (const field of keys) {
    const from = before[field];
    const to = after[field];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field, from, to });
    }
  }
  return changes;
}

export function logCreate(
  module: string,
  actor: string,
  recordId: string,
  recordLabel: string,
) {
  return appendAuditEvent({
    action: "create",
    module,
    recordId,
    recordLabel,
    actor,
    summary: `Created ${recordLabel}`,
  });
}

export function logEdit(
  module: string,
  actor: string,
  recordId: string,
  recordLabel: string,
  changes: FieldChange[],
) {
  return appendAuditEvent({
    action: "edit",
    module,
    recordId,
    recordLabel,
    actor,
    summary:
      changes.length > 0
        ? `Updated ${changes.map((c) => c.field).join(", ")}`
        : `Edited ${recordLabel}`,
    changes,
  });
}

export function logDelete(
  module: string,
  actor: string,
  recordId: string,
  recordLabel: string,
) {
  return appendAuditEvent({
    action: "delete",
    module,
    recordId,
    recordLabel,
    actor,
    summary: `Moved ${recordLabel} to Recycle Bin`,
  });
}

export function logStatusChange(
  module: string,
  actor: string,
  recordId: string,
  recordLabel: string,
  from: string,
  to: string,
) {
  return appendAuditEvent({
    action: "status_change",
    module,
    recordId,
    recordLabel,
    actor,
    summary: `${recordLabel}: ${from} → ${to}`,
    changes: [{ field: "status", from, to }],
  });
}

export function logAuth(
  action: "login" | "logout" | "login_failed",
  actor: string,
  meta?: Record<string, string>,
) {
  return appendAuditEvent({
    action,
    module: "auth",
    actor,
    summary:
      action === "login"
        ? "Login successful"
        : action === "logout"
          ? "Logout"
          : "Failed login attempt",
    meta,
  });
}
