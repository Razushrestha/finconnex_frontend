/**
 * Bridges the local `LifecycleJourney` UI model (src/lib/journeys/types.ts) to
 * real backend Automations (`/v1/automations`, from the M1 engine). A "journey"
 * IS an Automation underneath — there is no separate Journey model in the
 * backend (per Finconnex_CRM_Automation_Status.md §14: journeys are meant to be
 * built on the automation engine's WAIT_-step and TRIGGER_AUTOMATION chaining,
 * not a new first-class entity).
 *
 * Known fidelity gaps (the mock UI doesn't collect enough structured data to
 * fully populate real action configs), confirmed by exercising the real
 * validation endpoint directly rather than assumed from the DTO shape:
 *  - Send Email/SMS/WhatsApp steps have no real recipient/template field in
 *    the UI yet, so `toEmail`/recipient config is a placeholder token.
 *  - Create Task has no assignee picker. `CREATE_TASK.assigneeIds` is a
 *    *required* key server-side, and an empty array fails that requirement
 *    (confirmed: `automation.error.actionConfigRequired`) — so until the
 *    inspector collects a real assignee, "Create Task" steps degrade to a
 *    `CREATE_NOTE` recording the intended task (tagged `[TASK]` in the body
 *    so the reverse mapping still shows it as a Create Task step in the UI).
 *  - Branch Condition has no condition builder. `IF_ELSE` requires a
 *    non-empty `condition.items` array — an empty one fails validation too
 *    (confirmed: `automation.error.conditionCountExceeded`, despite the
 *    name) — so "Branch Condition" steps also degrade to a tagged
 *    `CREATE_NOTE` (`[BRANCH]`) rather than a real conditional split.
 * These make every automation valid and runnable end-to-end (so persistence,
 * lifecycle, and run history are real), but Create Task and Branch Condition
 * steps don't yet do what their label says — they log a note instead. Fully
 * fixing this needs the step inspector extended with an assignee picker and
 * a condition builder, not just a mapping change.
 */
import type {
  Automation,
  AutomationRun,
  AutomationStep as BackendActionStep,
} from "@/lib/automations/types";
import {
  type JourneyStep,
  type JourneyStepType,
  type JourneyTrigger,
  type LifecycleJourney,
  createStep,
  formatJourneyAt,
} from "./types";

type BackendStepType = "ACTION" | "WAIT_FOR_DURATION" | "WAIT_UNTIL_DATE" | "IF_ELSE";

export type BackendJourneyStep =
  | ({ key: string; type: "ACTION" } & BackendActionStep)
  | { key: string; type: "WAIT_FOR_DURATION"; durationMs: number }
  | { key: string; type: "WAIT_UNTIL_DATE"; until: string }
  | {
      key: string;
      type: "IF_ELSE";
      condition: { mode: "ALL" | "ANY"; items: unknown[] };
      then: BackendJourneyStep[];
      else: BackendJourneyStep[];
    };

const TRIGGER_TO_BACKEND: Record<JourneyTrigger, { triggerType: string; entityType: string }> = {
  "Lead Created": { triggerType: "LEAD_CREATED", entityType: "LEAD" },
  "Deal Stage Change": { triggerType: "DEAL_STAGE_CHANGED", entityType: "DEAL" },
  "Form Submitted": { triggerType: "MANUAL", entityType: "LEAD" }, // no FORM_SUBMITTED trigger exists backend-side (forms module is M8, not built) — falls back to manual enrollment
  "Date-Based": { triggerType: "DATE_REACHED", entityType: "LEAD" },
  Manual: { triggerType: "MANUAL", entityType: "LEAD" },
};

const BACKEND_TO_TRIGGER: Record<string, JourneyTrigger> = {
  LEAD_CREATED: "Lead Created",
  LEAD_UPDATED: "Lead Created",
  DEAL_STAGE_CHANGED: "Deal Stage Change",
  DEAL_CREATED: "Deal Stage Change",
  DATE_REACHED: "Date-Based",
  TIME_ELAPSED: "Date-Based",
  MANUAL: "Manual",
};

export function journeyTriggerToBackend(trigger: JourneyTrigger) {
  return TRIGGER_TO_BACKEND[trigger] ?? TRIGGER_TO_BACKEND.Manual;
}

export function backendTriggerToJourney(triggerType: string): JourneyTrigger {
  return BACKEND_TO_TRIGGER[triggerType] ?? "Manual";
}

const WAIT_UNIT_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
};

/** Parses free-form "Wait N days" style detail text into a duration; defaults to 1 day. */
function parseWaitDurationMs(detail: string): number {
  const match = detail.match(/(\d+)\s*(minute|hour|day|week)/i);
  if (!match) return WAIT_UNIT_MS.day;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  return (Number.isFinite(n) ? n : 1) * (WAIT_UNIT_MS[unit] ?? WAIT_UNIT_MS.day);
}

function formatWaitDetail(ms: number): string {
  if (ms % WAIT_UNIT_MS.week === 0) return `Wait ${ms / WAIT_UNIT_MS.week} week(s)`;
  if (ms % WAIT_UNIT_MS.day === 0) return `Wait ${ms / WAIT_UNIT_MS.day} day(s)`;
  if (ms % WAIT_UNIT_MS.hour === 0) return `Wait ${ms / WAIT_UNIT_MS.hour} hour(s)`;
  return `Wait ${Math.round(ms / WAIT_UNIT_MS.minute)} minute(s)`;
}

export function journeyStepToBackend(step: JourneyStep, index: number): BackendJourneyStep {
  const key = `step-${index + 1}-${step.id}`.slice(0, 80);
  switch (step.type) {
    case "Wait":
      return { key, type: "WAIT_FOR_DURATION", durationMs: parseWaitDurationMs(step.detail) };
    case "Send Email":
      return {
        key,
        type: "ACTION",
        action: "SEND_EMAIL",
        config: {
          subject: step.label || "Journey email",
          body: step.detail || "",
          toEmail: "{{contact.email}}", // placeholder — no template/recipient field in the UI yet
        },
      };
    case "Send SMS":
    case "Send WhatsApp":
      return {
        key,
        type: "ACTION",
        action: "SEND_MESSAGE",
        config: {
          messageType: step.type === "Send SMS" ? "SMS" : "WHATSAPP",
          subject: step.label || step.type,
          body: step.detail || "",
        },
      };
    case "Create Task":
      // CREATE_TASK.assigneeIds is required and non-empty server-side; no
      // assignee picker exists in the UI yet, so this degrades to a tagged
      // note rather than emitting an automation that fails validation.
      return {
        key,
        type: "ACTION",
        action: "CREATE_NOTE",
        config: { body: `[TASK] ${step.label || "Journey task"} — ${step.detail || ""}` },
      };
    case "Update Field":
      return {
        key,
        type: "ACTION",
        action: "UPDATE_RECORD",
        config: { fields: { note: step.detail || step.label } },
      };
    case "Branch Condition":
      // IF_ELSE.condition.items must be non-empty server-side; no condition
      // builder exists in the UI yet, so this degrades to a tagged note
      // rather than emitting an automation that fails validation.
      return {
        key,
        type: "ACTION",
        action: "CREATE_NOTE",
        config: { body: `[BRANCH] ${step.label || "Branch condition"} — ${step.detail || ""}` },
      };
    default:
      return {
        key,
        type: "ACTION",
        action: "CREATE_NOTE",
        config: { body: step.detail || step.label },
      };
  }
}

function noteBody(step: BackendJourneyStep): string | null {
  const config = (step as { action?: string; config?: Record<string, unknown> });
  if (config.action !== "CREATE_NOTE") return null;
  const body = config.config?.body;
  return typeof body === "string" ? body : null;
}

function journeyStepTypeFromBackend(step: BackendJourneyStep): JourneyStepType {
  if (step.type === "WAIT_FOR_DURATION" || step.type === "WAIT_UNTIL_DATE") return "Wait";
  if (step.type === "IF_ELSE") return "Branch Condition";
  const body = noteBody(step);
  if (body?.startsWith("[TASK]")) return "Create Task";
  if (body?.startsWith("[BRANCH]")) return "Branch Condition";
  const action = (step as { action?: string }).action;
  switch (action) {
    case "SEND_EMAIL":
      return "Send Email";
    case "SEND_MESSAGE": {
      const messageType = (step as { config?: { messageType?: string } }).config?.messageType;
      return messageType === "WHATSAPP" ? "Send WhatsApp" : "Send SMS";
    }
    case "CREATE_TASK":
    case "ADD_TO_WORK_QUEUE":
    case "CREATE_FOLLOW_UP":
      return "Create Task";
    case "UPDATE_RECORD":
    case "CHANGE_STATUS":
    case "ASSIGN_OWNER":
      return "Update Field";
    default:
      return "Update Field";
  }
}

/** Strips a leading "[TASK] " / "[BRANCH] " tag used to recover step type from a degraded CREATE_NOTE. */
function stripTag(text: string): string {
  return text.replace(/^\[(TASK|BRANCH)\]\s*/, "");
}

function backendStepDetail(step: BackendJourneyStep): string {
  if (step.type === "WAIT_FOR_DURATION") return formatWaitDetail(step.durationMs);
  if (step.type === "WAIT_UNTIL_DATE") return `Wait until ${step.until}`;
  const tagged = noteBody(step);
  if (tagged) return stripTag(tagged);
  const config = (step as { config?: Record<string, unknown> }).config ?? {};
  const text = [config.subject, config.body, config.fields ? JSON.stringify(config.fields) : null]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" — ");
  return text || (step as { action?: string }).action || "Step";
}

function backendStepLabel(step: BackendJourneyStep): string {
  const tagged = noteBody(step);
  if (tagged) {
    const stripped = stripTag(tagged);
    const [label] = stripped.split(" — ");
    return label || stripped;
  }
  const config = (step as { config?: Record<string, unknown> }).config ?? {};
  if (typeof config.subject === "string" && config.subject) return config.subject;
  if (step.type === "WAIT_FOR_DURATION" || step.type === "WAIT_UNTIL_DATE") return "Wait";
  if (step.type === "IF_ELSE") return "Branch";
  return (step as { action?: string }).action ?? "Step";
}

export function journeyStepsToBackend(steps: JourneyStep[]): BackendJourneyStep[] {
  return steps.map((s, i) => journeyStepToBackend(s, i));
}

export function backendStepsToJourneySteps(
  raw: unknown,
  runsByStepIndex: Map<number, { enrolled: number; converted: number }>,
): JourneyStep[] {
  const list = Array.isArray(raw) ? (raw as BackendJourneyStep[]) : [];
  return list.map((step, i) => {
    const counts = runsByStepIndex.get(i) ?? { enrolled: 0, converted: 0 };
    return createStep(journeyStepTypeFromBackend(step), {
      id: step.key ?? `step-${i}`,
      label: backendStepLabel(step),
      detail: backendStepDetail(step),
      enrolledCount: counts.enrolled,
      convertedCount: counts.converted,
    });
  });
}

/** entityType a journey's automation acts on, for dry-run test calls. */
export function journeyEntityType(automation: Automation): string {
  return (
    (automation.activeVersion?.definition?.entityType as string | undefined) ??
    (automation.versions?.[0]?.definition?.entityType as string | undefined) ??
    "LEAD"
  );
}

function journeySteps(automation: Automation): unknown[] {
  const def = automation.activeVersion?.definition ?? automation.versions?.[0]?.definition;
  return def?.steps ?? [];
}

function automationStatusToJourneyStatus(status: string): LifecycleJourney["status"] {
  if (status === "ENABLED") return "Active";
  if (status === "PAUSED") return "Paused";
  return "Draft";
}

export function automationRunsToEnrollments(
  runs: AutomationRun[],
  stepIds: string[],
): LifecycleJourney["enrollments"] {
  return runs.map((run) => {
    const stepId = stepIds[run.currentStepIndex ?? 0] ?? stepIds[0] ?? "";
    const status: "Active" | "Completed" | "Exited" =
      run.status === "SUCCEEDED"
        ? "Completed"
        : run.status === "QUEUED" || run.status === "RUNNING" || run.status === "WAITING"
          ? "Active"
          : "Exited";
    return {
      id: run.id,
      contactName: `${run.triggerEntityType} · ${run.triggerEntityId.slice(0, 8)}`,
      email: "",
      currentStepId: stepId,
      enteredAt: run.createdAt ? new Date(run.createdAt).toLocaleString("en-AU") : "",
      status,
    };
  });
}

export function automationToJourney(automation: Automation, runs: AutomationRun[]): LifecycleJourney {
  const rawSteps = journeySteps(automation);
  const runsByStepIndex = new Map<number, { enrolled: number; converted: number }>();
  for (let i = 0; i < rawSteps.length; i++) {
    const enrolled = runs.filter((r) => (r.currentStepIndex ?? 0) >= i).length;
    const converted = runs.filter(
      (r) => (r.currentStepIndex ?? 0) > i || (r.status === "SUCCEEDED" && i === rawSteps.length - 1),
    ).length;
    runsByStepIndex.set(i, { enrolled, converted });
  }
  const steps = backendStepsToJourneySteps(rawSteps, runsByStepIndex);
  const triggerType =
    automation.activeVersion?.triggerType ?? automation.versions?.[0]?.triggerType ?? "MANUAL";

  return {
    id: automation.id,
    journeyId: `JRN-${automation.id.slice(0, 8).toUpperCase()}`,
    name: automation.name,
    trigger: backendTriggerToJourney(String(triggerType)),
    status: automationStatusToJourneyStatus(String(automation.status)),
    exitConditions: [],
    steps,
    enrollments: automationRunsToEnrollments(
      runs,
      steps.map((s) => s.id),
    ),
    createdBy: "CRM",
    updatedAt: automation.updatedAt ? formatJourneyAt(new Date(automation.updatedAt)) : formatJourneyAt(),
  };
}
