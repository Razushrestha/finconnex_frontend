import { formatRelativeTime } from "@/lib/leads/activity-dates";

import {
  ACTION_CATALOG,
  FLOW_CONTROL_CATALOG,
  type AutomationActionType,
  type AutomationRunLogEntry,
  type AutomationRunLogStep,
  type AutomationStepTestNote,
} from "./types";

/** States a run never leaves on its own. */
const FINISHED_RUN_STATUSES = new Set([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "ROLLED_BACK",
  "PARTIALLY_RECOVERED",
  "MANUAL_INTERVENTION_REQUIRED",
]);

const FAILED_RUN_STATUSES = new Set(["FAILED", "MANUAL_INTERVENTION_REQUIRED"]);

export function isRunFinished(status: string): boolean {
  return FINISHED_RUN_STATUSES.has(status);
}

/** Whether the log still has something changing that is worth polling for. */
export function runLogIsLive(runs: AutomationRunLogEntry[]): boolean {
  return runs.some(
    (run) => !isRunFinished(run.status) || (run.isTest && !run.testDataPurgedAt)
  );
}

/**
 * When a run stopped. The backend stamps `completedAt` only on success and
 * cancellation, so a failed run falls back to its last update — the moment
 * the failure was recorded.
 */
export function runFinishedAt(run: AutomationRunLogEntry): string | null {
  if (!isRunFinished(run.status)) return null;
  return run.completedAt ?? run.updatedAt ?? null;
}

export function runFailed(run: AutomationRunLogEntry): boolean {
  return FAILED_RUN_STATUSES.has(run.status);
}

export function statusLabel(status: string): string {
  const text = status.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function stepLabel(step: Pick<AutomationRunLogStep, "actionType" | "stepType">): string {
  if (step.actionType && step.actionType in ACTION_CATALOG) {
    return ACTION_CATALOG[step.actionType as AutomationActionType].label;
  }
  if (step.stepType in FLOW_CONTROL_CATALOG) {
    return FLOW_CONTROL_CATALOG[step.stepType as keyof typeof FLOW_CONTROL_CATALOG].label;
  }
  return statusLabel(step.actionType ?? step.stepType);
}

/** "3 Oct, 2:41:07 pm" — to the second, since the log is about exact timing. */
export function formatLogTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  return at.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatLogRelative(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "" : formatRelativeTime(at, now);
}

/** How long a step took, when it has both ends. */
export function formatStepDuration(step: Pick<AutomationRunLogStep, "startedAt" | "completedAt">): string | null {
  if (!step.startedAt || !step.completedAt) return null;
  const ms = new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1_000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

export function formatWaitDuration(ms: number): string {
  const units: Array<[number, string]> = [
    [86_400_000, "day"],
    [3_600_000, "hour"],
    [60_000, "minute"],
    [1_000, "second"],
  ];
  for (const [size, unit] of units) {
    if (ms >= size) {
      const count = Math.round(ms / size);
      return `${count} ${unit}${count === 1 ? "" : "s"}`;
    }
  }
  return "a moment";
}

/**
 * The line under a test step saying what it did instead of the real thing.
 * `nameOf` turns a member id into a name when the caller knows one.
 */
export function stepTestNote(
  step: Pick<AutomationRunLogStep, "test" | "branch">,
  nameOf: (id: string) => string | undefined = () => undefined
): string | null {
  const note: AutomationStepTestNote | null = step.test;
  const person = (id?: string | null) => (id ? nameOf(id) ?? id : null);
  if (!note) {
    if (step.branch === "then") return "Conditions matched — took the Yes branch";
    if (step.branch === "else") return "Conditions did not match — took the No branch";
    return null;
  }
  switch (note.skipped) {
    case "WAIT":
      return `Skipped in test — would have waited ${
        note.until ? `until ${formatLogTime(note.until)}` : formatWaitDuration(note.wouldWaitMs ?? 0)
      }`;
    case "WEBHOOK":
      return `Skipped in test — would have called ${note.host ?? "the webhook"}`;
    case "TRIGGER_AUTOMATION":
      return "Skipped in test — would have started another workflow";
    case "REAL_RECORD":
      return "Skipped in test — it targets a real record, which a test never changes";
    case "NO_TESTER_PHONE":
      return "Skipped — add a phone number to your profile to receive test texts";
    case undefined:
      break;
    default:
      return `Skipped in test (${statusLabel(note.skipped)})`;
  }
  if (note.redirectedTo) {
    const original = note.wouldHaveSentTo ? person(note.wouldHaveSentTo) : null;
    const target = person(note.redirectedTo) ?? note.redirectedTo;
    return original && original !== target
      ? `Sent to you (${target}) instead of ${original}`
      : `Sent to you (${target})`;
  }
  if (note.assignedTo) {
    // Nothing to say when the step would have picked the tester anyway.
    const others = (
      Array.isArray(note.wouldHaveAssigned) ? note.wouldHaveAssigned : [note.wouldHaveAssigned]
    ).filter((id): id is string => Boolean(id) && id !== note.assignedTo);
    return others.length
      ? `Assigned to you instead of ${others.map((id) => person(id)).join(", ")}`
      : "Assigned to you";
  }
  if (note.ownerSetTo) {
    const would = note.wouldHaveOwned !== note.ownerSetTo ? person(note.wouldHaveOwned) : null;
    return would ? `Owned by you instead of ${would}` : "Owned by you";
  }
  if (note.requestedBy) return "Requested on your behalf";
  if (note.attendeesLeftOut) {
    return `Booked without its ${note.attendeesLeftOut} attendee${note.attendeesLeftOut === 1 ? "" : "s"}`;
  }
  return null;
}

/** Fields worth showing from a test's dummy record, in a readable order. */
export function testDataRows(testData: Record<string, unknown> | null): Array<{ label: string; value: string }> {
  if (!testData) return [];
  const hidden = new Set(["id", "createdAt", "updatedAt", "version"]);
  return Object.entries(testData)
    .filter(([key, value]) => !hidden.has(key) && value !== null && value !== undefined)
    .filter(([, value]) => !(Array.isArray(value) && value.length === 0))
    .map(([key, value]) => ({
      // `ownerId` reads as "Owner"; the value is resolved to a name on screen.
      label: statusLabel(key.replace(/Id$/, "").replace(/([a-z])([A-Z])/g, "$1_$2")),
      value: Array.isArray(value)
        ? value.map(String).join(", ")
        : typeof value === "boolean"
          ? value
            ? "Yes"
            : "No"
          : /^\d{4}-\d{2}-\d{2}T/.test(String(value))
            ? formatLogTime(String(value))
            : String(value),
    }));
}

/** "Test data deletes in 1:42", then "Deleting test data…", then "Test data deleted". */
export function testDataCountdown(
  run: Pick<AutomationRunLogEntry, "isTest" | "testDataExpiresAt" | "testDataPurgedAt">,
  now = new Date()
): string | null {
  if (!run.isTest) return null;
  if (run.testDataPurgedAt) return `Test data deleted ${formatLogTime(run.testDataPurgedAt)}`;
  if (!run.testDataExpiresAt) return null;
  const left = new Date(run.testDataExpiresAt).getTime() - now.getTime();
  if (left <= 0) return "Deleting test data…";
  const seconds = Math.ceil(left / 1_000);
  return `Test data deletes in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * A run as the older `GET /automations/:id/runs` returns it — the raw row
 * with its steps — shaped like a run-log entry.
 */
export function fromLegacyRun(raw: Record<string, unknown>): AutomationRunLogEntry {
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  const record = (value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const steps = Array.isArray(raw.steps) ? raw.steps.map(record) : [];
  return {
    id: String(raw.id),
    status: String(raw.status),
    triggerKey: text(raw.triggerKey),
    triggerEntityType: String(raw.triggerEntityType ?? ""),
    triggerEntityId: String(raw.triggerEntityId ?? ""),
    errorCategory: text(raw.errorCategory),
    isTest: raw.isTest === true,
    testDataExpiresAt: text(raw.testDataExpiresAt),
    testDataPurgedAt: text(raw.testDataPurgedAt),
    startedAt: text(raw.startedAt),
    completedAt: text(raw.completedAt),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ""),
    testData: null,
    steps: steps
      .map((step) => {
        const result = record(step.safeResult);
        return {
          id: String(step.id),
          stepKey: String(step.stepKey ?? ""),
          stepIndex: typeof step.stepIndex === "number" ? step.stepIndex : 0,
          stepType: String(step.stepType ?? ""),
          actionType: text(step.actionType),
          status: String(step.status ?? ""),
          errorCategory: text(step.errorCategory),
          startedAt: text(step.startedAt),
          completedAt: text(step.completedAt),
          test: (result.test as AutomationRunLogStep["test"]) ?? null,
          branch: text(result.branch),
        };
      })
      .sort((a, b) => a.stepIndex - b.stepIndex),
  };
}

/** Replace the first page of a log with fresh rows, keeping later pages. */
export function mergeFirstPage(
  current: AutomationRunLogEntry[],
  fresh: AutomationRunLogEntry[]
): AutomationRunLogEntry[] {
  const seen = new Set(fresh.map((run) => run.id));
  return [...fresh, ...current.filter((run) => !seen.has(run.id))];
}
