export const AUTOMATION_TRIGGER_TYPES = [
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "LEAD_STATUS_CHANGED",
  "LEAD_OWNER_CHANGED",
  "CONTACT_CREATED",
  "CONTACT_UPDATED",
  "COMPANY_CREATED",
  "COMPANY_UPDATED",
  "DEAL_CREATED",
  "DEAL_UPDATED",
  "DEAL_STAGE_CHANGED",
  "DEAL_OWNER_CHANGED",
  "DEAL_WON",
  "DEAL_LOST",
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_COMPLETED",
  "TASK_OVERDUE",
  "CALL_CREATED",
  "CALL_COMPLETED",
  "MESSAGE_RECEIVED",
  "MESSAGE_UNREAD_FOR",
  "MESSAGE_FAILED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "MEETING_BOOKED",
  "MEETING_RESCHEDULED",
  "MEETING_CANCELLED",
  "MEETING_COMPLETED",
  "MEETING_NO_SHOW",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_REQUEST_SUBMITTED",
  "DOCUMENT_REQUEST_COMPLETED",
  "SIGNATURE_REQUEST_COMPLETED",
  "DATE_REACHED",
  "TIME_ELAPSED",
  "SCHEDULED",
  "RECORD_INACTIVE_FOR",
  "MANUAL",
] as const;
export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];

export const AUTOMATION_ENTITY_TYPES = [
  "LEAD",
  "CONTACT",
  "COMPANY",
  "DEAL",
  "TASK",
  "CALL",
  "MESSAGE",
  "EMAIL",
  "MEETING",
  "DOCUMENT",
  "DOCUMENT_REQUEST",
  "SIGNATURE_REQUEST",
  "REMINDER",
  "NOTE",
  "NOTIFICATION",
] as const;
export type AutomationEntityType = (typeof AUTOMATION_ENTITY_TYPES)[number];

export const AUTOMATION_ACTION_TYPES = [
  "UPDATE_RECORD",
  "CHANGE_STATUS",
  "ASSIGN_OWNER",
  "CREATE_TASK",
  "CREATE_REMINDER",
  "CREATE_NOTE",
  "ADD_TAG",
  "REMOVE_TAG",
  "SEND_NOTIFICATION",
  "SEND_EMAIL",
  "SEND_MESSAGE",
  "ADD_TO_WORK_QUEUE",
  "CREATE_FOLLOW_UP",
  "TRIGGER_AUTOMATION",
  "LINK_RECORD",
  "CANCEL_REMINDERS",
  "WEBHOOK",
] as const;
export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

/** Mirrors AUTOMATION_ACTION_REGISTRY in the backend, for building the step config editor. */
export const AUTOMATION_ACTION_KEYS: Record<
  string,
  { allowed: string[]; required: string[] }
> = {
  UPDATE_RECORD: { allowed: ["fields"], required: ["fields"] },
  CHANGE_STATUS: { allowed: ["field", "value"], required: ["value"] },
  ASSIGN_OWNER: { allowed: ["ownerId"], required: ["ownerId"] },
  CREATE_TASK: {
    allowed: [
      "subject",
      "description",
      "taskType",
      "priority",
      "startAt",
      "startInMs",
      "dueAt",
      "dueInMs",
      "assigneeIds",
      "tags",
    ],
    required: ["subject", "assigneeIds"],
  },
  ADD_TO_WORK_QUEUE: {
    allowed: [
      "subject",
      "description",
      "priority",
      "startAt",
      "startInMs",
      "dueAt",
      "dueInMs",
      "assigneeIds",
      "tags",
    ],
    required: ["subject", "assigneeIds"],
  },
  CREATE_FOLLOW_UP: {
    allowed: [
      "subject",
      "description",
      "priority",
      "startAt",
      "startInMs",
      "dueAt",
      "dueInMs",
      "assigneeIds",
      "tags",
    ],
    required: ["subject", "assigneeIds"],
  },
  CREATE_REMINDER: {
    allowed: ["title", "remindAt", "remindInMs", "targetUserId"],
    required: ["title", "targetUserId"],
  },
  CREATE_NOTE: { allowed: ["title", "body"], required: ["body"] },
  ADD_TAG: { allowed: ["tag"], required: ["tag"] },
  REMOVE_TAG: { allowed: ["tag"], required: ["tag"] },
  SEND_NOTIFICATION: {
    allowed: ["recipientId", "notificationType", "title", "message"],
    required: ["recipientId", "title", "message"],
  },
  SEND_EMAIL: {
    allowed: ["subject", "body", "toEmail"],
    required: ["subject", "body", "toEmail"],
  },
  SEND_MESSAGE: {
    allowed: [
      "messageType",
      "channel",
      "subject",
      "body",
      "toUserId",
      "toContactId",
    ],
    required: ["messageType", "subject", "body"],
  },
  WEBHOOK: {
    allowed: ["url", "method", "headers", "body", "timeoutMs"],
    required: ["url"],
  },
  TRIGGER_AUTOMATION: { allowed: ["automationId"], required: ["automationId"] },
  LINK_RECORD: { allowed: ["entityType", "entityId"], required: ["entityType", "entityId"] },
  CANCEL_REMINDERS: { allowed: [], required: [] },
};

export const AUTOMATION_FAILURE_POLICIES = [
  "STOP_ON_FAILURE",
  "ROLLBACK_ON_FAILURE",
  "CONTINUE_ON_FAILURE",
  "MANUAL_RECOVERY",
] as const;
export type AutomationFailurePolicy = (typeof AUTOMATION_FAILURE_POLICIES)[number];

export type AutomationStatus = "DRAFT" | "ENABLED" | "DISABLED" | "PAUSED";
export type AutomationVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AutomationRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "WAITING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLING"
  | "CANCELLED"
  | "RECOVERING"
  | "ROLLED_BACK"
  | "PARTIALLY_RECOVERED"
  | "MANUAL_INTERVENTION_REQUIRED";

/**
 * Only the ACTION step shape is exposed in the builder UI (WAIT_FOR_DURATION /
 * WAIT_UNTIL_DATE / IF_ELSE steps exist in the backend's AutomationStepDefinition
 * but aren't editable here yet). `key` must be unique within the automation and
 * match ^[a-zA-Z0-9_-]{1,80}$.
 */
export type AutomationStep = {
  key: string;
  type: "ACTION";
  action: AutomationActionType | string;
  config: Record<string, unknown>;
};

export type AutomationVersion = {
  id: string;
  version: number;
  status: AutomationVersionStatus | string;
  triggerType: AutomationTriggerType | string;
  definition: {
    entityType?: string;
    triggerConfig?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
    steps?: AutomationStep[];
    failurePolicy?: string;
  } | null;
  createdAt?: string;
  publishedAt?: string | null;
};

export type Automation = {
  id: string;
  name: string;
  description?: string | null;
  status: AutomationStatus | string;
  activeVersion?: AutomationVersion | null;
  versions?: AutomationVersion[];
  createdAt?: string;
  updatedAt?: string;
  enabledAt?: string | null;
  pausedAt?: string | null;
};

export type AutomationRun = {
  id: string;
  automationId: string;
  triggerType: string;
  triggerEntityType: string;
  triggerEntityId: string;
  status: AutomationRunStatus | string;
  currentStepIndex?: number;
  errorCategory?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
};

export type CreateAutomationInput = {
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  entityType: AutomationEntityType;
  triggerConfig?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  steps: AutomationStep[];
  failurePolicy?: AutomationFailurePolicy;
};

export function automationStatusColor(status: string): string {
  switch (status) {
    case "ENABLED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "PAUSED":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "DISABLED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "DRAFT":
    default:
      return "bg-violet-50 text-violet-700 border-violet-200";
  }
}

export function runStatusColor(status: string): string {
  switch (status) {
    case "SUCCEEDED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FAILED":
    case "MANUAL_INTERVENTION_REQUIRED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "RUNNING":
    case "RECOVERING":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "CANCELLED":
    case "CANCELLING":
    case "ROLLED_BACK":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}
