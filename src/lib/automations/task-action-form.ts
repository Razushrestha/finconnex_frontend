/**
 * The Create Task step's form, shaped like the task page's own form
 * (CreateTaskForm), and its conversion to and from the step config the
 * automation executor reads.
 *
 * The config uses the same API values the task page sends — apiTaskType,
 * apiTaskPriority, apiTaskStatus, action items encoded into the description
 * — so a task an automation creates looks exactly like one made by hand.
 */

import {
  encodeActionItemsInDescription,
  parseActionItemsBlock,
  stripActionItemsBlock,
} from "@/lib/tasks/action-items";
import {
  apiTaskPriority,
  apiTaskStatus,
  apiTaskType,
  mapTaskPriority,
  mapTaskStatus,
  mapTaskType,
} from "@/lib/tasks/api";
import type { TaskRelatedEntityKind } from "@/lib/activities/related-records";
import {
  defaultReminderRepeatRule,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import {
  TASK_STATUSES,
  type Priority,
  type TaskActionItem,
  type TaskStatus,
  type TaskType,
} from "@/lib/tasks/types";

/**
 * The task page's statuses the CRM can hold. "Review" has no TaskStatus on
 * the API, so a task can never actually be in it; it is left out rather than
 * offered and silently turned into something else.
 */
export const TASK_ACTION_STATUSES = TASK_STATUSES.filter(
  (status): status is Exclude<TaskStatus, "Review"> => status !== "Review",
);

/** Repeat presets the API's TaskRepeat can store. */
const STORED_REPEATS = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
  yearly: "YEARLY",
} as const;

/** The task page's fixed recurrence settings (toCreateTaskBody). */
const RECURRENCE_LIMIT = 12;

export type TaskActionAttachment = { key: string; name: string };

/** Units for a relative due date or reminder, largest first. */
export const TASK_OFFSET_UNITS = [
  { label: "Weeks", value: "weeks", ms: 7 * 86_400_000 },
  { label: "Days", value: "days", ms: 86_400_000 },
  { label: "Hours", value: "hours", ms: 3_600_000 },
  { label: "Minutes", value: "minutes", ms: 60_000 },
] as const;
export type TaskOffsetUnit = (typeof TASK_OFFSET_UNITS)[number]["value"];

export type TaskOffset = { amount: number; unit: TaskOffsetUnit };

export function offsetMs(offset: TaskOffset): number {
  const unit = TASK_OFFSET_UNITS.find((row) => row.value === offset.unit)!;
  return Math.max(0, Math.round(offset.amount)) * unit.ms;
}

/** The largest unit that expresses `ms` exactly: 172800000 → 2 days. */
export function offsetFromMs(ms: number): TaskOffset {
  const unit =
    TASK_OFFSET_UNITS.find((row) => ms > 0 && ms % row.ms === 0) ??
    TASK_OFFSET_UNITS[TASK_OFFSET_UNITS.length - 1];
  return { amount: Math.round(ms / unit.ms), unit: unit.value };
}

export interface TaskActionFormState {
  title: string;
  taskType: TaskType;
  priority: Priority;
  status: TaskStatus;
  contactName: string;
  contactId: string;
  relatedKind: TaskRelatedEntityKind | "";
  relatedName: string;
  relatedId: string;
  description: string;
  actionItems: TaskActionItem[];
  assignedTo: string;
  collaborators: string[];
  /**
   * "relative": due a while after the workflow runs, which keeps working for
   * as long as the workflow does. "date": a fixed moment, as on the task
   * page, which the step can no longer meet once it has passed.
   */
  dueMode: "relative" | "date";
  dueIn: TaskOffset;
  reminderBefore: TaskOffset;
  /** `datetime-local` value, as on the task page. */
  dueDate: string;
  repeatOn: boolean;
  taskRepeat: ReminderRepeatRule;
  reminderOn: boolean;
  reminderDate: string;
  attachments: TaskActionAttachment[];
}

/** The task page's defaults (CreateTaskForm initialState). */
export function emptyTaskActionForm(): TaskActionFormState {
  return {
    title: "",
    taskType: "Follow-up",
    priority: "Medium",
    status: "Not Started",
    contactName: "",
    contactId: "",
    relatedKind: "",
    relatedName: "",
    relatedId: "",
    description: "",
    actionItems: [],
    assignedTo: "",
    collaborators: [],
    dueMode: "relative",
    dueIn: { amount: 1, unit: "days" },
    reminderBefore: { amount: 1, unit: "hours" },
    dueDate: "",
    repeatOn: false,
    taskRepeat: { ...defaultReminderRepeatRule },
    reminderOn: false,
    reminderDate: "",
    attachments: [],
  };
}

/** True when the chosen repeat is one the CRM stores; others stay local on the task page too. */
export function isStoredRepeat(rule: ReminderRepeatRule): boolean {
  return rule.preset in STORED_REPEATS;
}

function toIso(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const parsed = new Date(local);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function toLocal(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

const RELATION_KEY: Record<TaskRelatedEntityKind, "leadId" | "dealId" | "companyId"> = {
  Lead: "leadId",
  Deal: "dealId",
  Company: "companyId",
};

/**
 * Step config for the executor. Empty values are left out so the executor's
 * own defaults apply — most importantly, no related record means the task
 * relates to the record that started the workflow.
 */
export function taskActionConfigFromForm(
  form: TaskActionFormState,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    subject: form.title.trim(),
    taskType: apiTaskType(form.taskType),
    priority: apiTaskPriority(form.priority),
  };
  const status = apiTaskStatus(form.status);
  if (status !== "NOT_STARTED") config.status = status;

  const description = encodeActionItemsInDescription(
    form.description.trim(),
    form.actionItems.filter((item) => item.text.trim()),
  );
  if (description) config.description = description;

  if (form.assignedTo) config.assigneeIds = [form.assignedTo];
  const collaborators = form.collaborators.filter((id) => id && id !== form.assignedTo);
  if (collaborators.length) config.collaboratorIds = collaborators;

  const relative = form.dueMode === "relative";
  const dueInMs = offsetMs(form.dueIn);
  const dueAt = relative ? undefined : toIso(form.dueDate);
  if (relative) {
    config.dueInMs = dueInMs;
    if (form.reminderOn) config.reminderBeforeDueMs = offsetMs(form.reminderBefore);
  } else if (dueAt) {
    config.dueAt = dueAt;
    const reminderAt = form.reminderOn ? toIso(form.reminderDate) : undefined;
    if (reminderAt) config.reminderAt = reminderAt;
  }
  const hasDue = relative ? dueInMs > 0 : Boolean(dueAt);

  const repeat =
    form.repeatOn && hasDue
      ? STORED_REPEATS[form.taskRepeat.preset as keyof typeof STORED_REPEATS]
      : undefined;
  if (repeat) {
    config.repeatEvery = repeat;
    config.recurrenceTimezone = timeZone;
    config.recurrenceLimit = RECURRENCE_LIMIT;
  }

  // As on the task page: a related record wins over the contact.
  if (form.relatedKind && form.relatedId) {
    config.relatedType = form.relatedKind.toUpperCase();
    config[RELATION_KEY[form.relatedKind]] = form.relatedId;
  } else if (form.contactId) {
    config.relatedType = "CONTACT";
    config.contactId = form.contactId;
  }

  const keys = form.attachments.map((file) => file.key).filter(Boolean);
  if (keys.length) config.attachmentKeys = keys;
  return config;
}

/**
 * The form for a saved step. Record names are not stored in the config, so
 * relatedName/contactName come back empty and the form resolves them from
 * the ids; attachment names fall back to the storage key's file name.
 */
export function taskActionFormFromConfig(
  config: Record<string, unknown>,
): TaskActionFormState {
  const form = emptyTaskActionForm();
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const ids = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

  form.title = str(config.subject);
  if (str(config.taskType)) form.taskType = mapTaskType(str(config.taskType));
  if (str(config.priority)) form.priority = mapTaskPriority(str(config.priority));
  if (str(config.status)) form.status = mapTaskStatus(str(config.status));

  const description = str(config.description);
  form.description = stripActionItemsBlock(description);
  form.actionItems = parseActionItemsBlock(description) ?? [];

  form.assignedTo = ids(config.assigneeIds)[0] ?? "";
  form.collaborators = ids(config.collaboratorIds);

  if (typeof config.dueInMs === "number") {
    form.dueMode = "relative";
    form.dueIn = offsetFromMs(config.dueInMs);
    if (typeof config.reminderBeforeDueMs === "number") {
      form.reminderOn = true;
      form.reminderBefore = offsetFromMs(config.reminderBeforeDueMs);
    }
  } else if (config.dueAt !== undefined) {
    // A step saved with a fixed date keeps it until someone changes it.
    form.dueMode = "date";
    form.dueDate = toLocal(config.dueAt);
    form.reminderDate = toLocal(config.reminderAt);
    form.reminderOn = Boolean(form.reminderDate);
  }

  const repeat = Object.entries(STORED_REPEATS).find(
    ([, value]) => value === config.repeatEvery,
  )?.[0] as ReminderRepeatRule["preset"] | undefined;
  if (repeat) {
    form.repeatOn = true;
    form.taskRepeat = { ...defaultReminderRepeatRule, preset: repeat };
  }

  const relatedType = str(config.relatedType);
  const kind = (["Lead", "Deal", "Company"] as const).find(
    (item) => item.toUpperCase() === relatedType,
  );
  if (kind && str(config[RELATION_KEY[kind]])) {
    form.relatedKind = kind;
    form.relatedId = str(config[RELATION_KEY[kind]]);
  } else if (str(config.contactId)) {
    form.contactId = str(config.contactId);
  }

  form.attachments = ids(config.attachmentKeys).map((key) => ({
    key,
    name: key.split("/").pop() || key,
  }));
  return form;
}
