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
  "LEAD_ASSIGNED",
  "LEAD_CONVERTED",
  "LEAD_LOST",
  "LEAD_SOURCE_CHANGED",
  "LEAD_FIELD_CHANGED",
  "DEAL_ASSIGNED",
  "DEAL_FIELD_CHANGED",
  "CONTACT_OWNER_CHANGED",
  "CONTACT_FIELD_CHANGED",
  "CONTACT_DELETED",
  "CONTACT_ASSOCIATED_WITH_ORGANIZATION",
  "CONTACT_REMOVED_FROM_ORGANIZATION",
  "ORGANIZATION_DELETED",
  "ORGANIZATION_OWNER_CHANGED",
  "ORGANIZATION_FIELD_CHANGED",
  "TASK_CANCELLED",
  "FOLLOW_UP_CREATED",
  "CALL_MISSED",
  "EMAIL_REPLIED",
  "EMAIL_BOUNCED",
  "SMS_REPLIED",
  "WHATSAPP_REPLIED",
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
  "CREATE_LEAD",
  "DELETE_LEAD",
  "CREATE_CONTACT",
  "DELETE_CONTACT",
  "CREATE_COMPANY",
  "DELETE_COMPANY",
  "CREATE_DEAL",
  "DELETE_DEAL",
  "ADD_FOLLOWER",
  "REMOVE_FOLLOWER",
  "ROUND_ROBIN_ASSIGN",
  "ASSOCIATE_CONTACT",
  "REMOVE_ASSOCIATION",
  "SCHEDULE_CALL",
  "CREATE_MEETING",
  "SEND_SMS",
  "SEND_WHATSAPP",
  "REQUEST_DOCUMENTS",
  "UPDATE_DOCUMENT_STATUS",
  "SEND_DOCUMENT_REMINDER",
  "END_AUTOMATION",
] as const;
export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

/**
 * Groups + labels every real trigger for the canvas's trigger picker.
 * `entityType` is fixed per trigger (the backend rejects any other pairing),
 * so picking a trigger also fixes the automation's entityType — mirrors
 * TRIGGER_ENTITIES in automation-definition.service.ts.
 */
export const TRIGGER_CATALOG: Record<
  AutomationTriggerType,
  { label: string; category: string; entityType: AutomationEntityType; icon: string }
> = {
  LEAD_CREATED: { label: "Lead Created", category: "Leads", entityType: "LEAD", icon: "user-plus" },
  LEAD_UPDATED: { label: "Lead Updated", category: "Leads", entityType: "LEAD", icon: "pencil" },
  LEAD_STATUS_CHANGED: { label: "Lead Status Changed", category: "Leads", entityType: "LEAD", icon: "refresh-cw" },
  LEAD_OWNER_CHANGED: { label: "Lead Owner Changed", category: "Leads", entityType: "LEAD", icon: "user-cog" },
  LEAD_ASSIGNED: { label: "Lead Assigned", category: "Leads", entityType: "LEAD", icon: "user-check" },
  LEAD_CONVERTED: { label: "Lead Converted", category: "Leads", entityType: "LEAD", icon: "trophy" },
  LEAD_LOST: { label: "Lead Lost", category: "Leads", entityType: "LEAD", icon: "x-circle" },
  LEAD_FIELD_CHANGED: { label: "Lead Field Changed", category: "Leads", entityType: "LEAD", icon: "pencil" },
  LEAD_SOURCE_CHANGED: { label: "Lead Source Changed", category: "Leads", entityType: "LEAD", icon: "git-branch" },
  CONTACT_CREATED: { label: "Contact Created", category: "Contacts", entityType: "CONTACT", icon: "user-plus" },
  CONTACT_UPDATED: { label: "Contact Updated", category: "Contacts", entityType: "CONTACT", icon: "pencil" },
  CONTACT_DELETED: { label: "Contact Deleted", category: "Contacts", entityType: "CONTACT", icon: "x-circle" },
  CONTACT_OWNER_CHANGED: { label: "Contact Owner Changed", category: "Contacts", entityType: "CONTACT", icon: "user-cog" },
  CONTACT_FIELD_CHANGED: { label: "Contact Field Changed", category: "Contacts", entityType: "CONTACT", icon: "pencil" },
  CONTACT_ASSOCIATED_WITH_ORGANIZATION: { label: "Contact Associated with Organization", category: "Relationships", entityType: "CONTACT", icon: "link" },
  CONTACT_REMOVED_FROM_ORGANIZATION: { label: "Contact Removed from Organization", category: "Relationships", entityType: "CONTACT", icon: "link" },
  COMPANY_CREATED: { label: "Organization Created", category: "Organizations", entityType: "COMPANY", icon: "building-2" },
  COMPANY_UPDATED: { label: "Organization Updated", category: "Organizations", entityType: "COMPANY", icon: "pencil" },
  ORGANIZATION_DELETED: { label: "Organization Deleted", category: "Organizations", entityType: "COMPANY", icon: "x-circle" },
  ORGANIZATION_OWNER_CHANGED: { label: "Organization Owner Changed", category: "Organizations", entityType: "COMPANY", icon: "user-cog" },
  ORGANIZATION_FIELD_CHANGED: { label: "Organization Field Changed", category: "Organizations", entityType: "COMPANY", icon: "pencil" },
  DEAL_CREATED: { label: "Deal Created", category: "Deals", entityType: "DEAL", icon: "handshake" },
  DEAL_UPDATED: { label: "Deal Updated", category: "Deals", entityType: "DEAL", icon: "pencil" },
  DEAL_STAGE_CHANGED: { label: "Deal Stage Changed", category: "Deals", entityType: "DEAL", icon: "git-branch" },
  DEAL_OWNER_CHANGED: { label: "Deal Owner Changed", category: "Deals", entityType: "DEAL", icon: "user-cog" },
  DEAL_ASSIGNED: { label: "Deal Assigned", category: "Deals", entityType: "DEAL", icon: "user-check" },
  DEAL_WON: { label: "Deal Won", category: "Deals", entityType: "DEAL", icon: "trophy" },
  DEAL_LOST: { label: "Deal Lost", category: "Deals", entityType: "DEAL", icon: "x-circle" },
  DEAL_FIELD_CHANGED: { label: "Deal Field Changed", category: "Deals", entityType: "DEAL", icon: "pencil" },
  TASK_CREATED: { label: "Task Created", category: "Tasks & Activities", entityType: "TASK", icon: "list-plus" },
  TASK_UPDATED: { label: "Task Updated", category: "Tasks & Activities", entityType: "TASK", icon: "pencil" },
  TASK_COMPLETED: { label: "Task Completed", category: "Tasks & Activities", entityType: "TASK", icon: "check-circle" },
  TASK_CANCELLED: { label: "Task Cancelled", category: "Tasks & Activities", entityType: "TASK", icon: "x-circle" },
  TASK_OVERDUE: { label: "Task Overdue", category: "Tasks & Activities", entityType: "TASK", icon: "alarm-clock" },
  FOLLOW_UP_CREATED: { label: "Follow-Up Created", category: "Tasks & Activities", entityType: "TASK", icon: "calendar-plus" },
  CALL_CREATED: { label: "Call Scheduled", category: "Tasks & Activities", entityType: "CALL", icon: "phone" },
  CALL_COMPLETED: { label: "Call Completed", category: "Tasks & Activities", entityType: "CALL", icon: "phone-call" },
  CALL_MISSED: { label: "Call Missed", category: "Tasks & Activities", entityType: "CALL", icon: "phone-off" },
  MESSAGE_RECEIVED: { label: "Message Received", category: "Communication", entityType: "MESSAGE", icon: "message-square" },
  MESSAGE_UNREAD_FOR: { label: "Message Unread For...", category: "Communication", entityType: "MESSAGE", icon: "mail-question" },
  MESSAGE_FAILED: { label: "Message Failed", category: "Communication", entityType: "MESSAGE", icon: "message-square-x" },
  SMS_REPLIED: { label: "SMS Replied", category: "Communication", entityType: "MESSAGE", icon: "message-square" },
  WHATSAPP_REPLIED: { label: "WhatsApp Replied", category: "Communication", entityType: "MESSAGE", icon: "message-square" },
  EMAIL_SENT: { label: "Email Sent", category: "Communication", entityType: "EMAIL", icon: "mail" },
  EMAIL_FAILED: { label: "Email Failed", category: "Communication", entityType: "EMAIL", icon: "mail-warning" },
  EMAIL_REPLIED: { label: "Email Replied", category: "Communication", entityType: "EMAIL", icon: "mail" },
  EMAIL_BOUNCED: { label: "Email Bounced", category: "Communication", entityType: "EMAIL", icon: "mail-warning" },
  MEETING_BOOKED: { label: "Meeting Scheduled", category: "Meetings & Appointments", entityType: "MEETING", icon: "calendar-plus" },
  MEETING_RESCHEDULED: { label: "Meeting Rescheduled", category: "Meetings & Appointments", entityType: "MEETING", icon: "calendar-clock" },
  MEETING_CANCELLED: { label: "Meeting Cancelled", category: "Meetings & Appointments", entityType: "MEETING", icon: "calendar-x" },
  MEETING_COMPLETED: { label: "Meeting Completed", category: "Meetings & Appointments", entityType: "MEETING", icon: "calendar-check" },
  MEETING_NO_SHOW: { label: "Meeting No-Show", category: "Meetings & Appointments", entityType: "MEETING", icon: "calendar-off" },
  DOCUMENT_UPLOADED: { label: "Document Uploaded", category: "Documents", entityType: "DOCUMENT", icon: "file-up" },
  DOCUMENT_REQUEST_SUBMITTED: { label: "Document Request Submitted", category: "Documents", entityType: "DOCUMENT_REQUEST", icon: "file-check" },
  DOCUMENT_REQUEST_COMPLETED: { label: "Document Request Completed", category: "Documents", entityType: "DOCUMENT_REQUEST", icon: "file-check-2" },
  SIGNATURE_REQUEST_COMPLETED: { label: "Signature Completed", category: "Documents", entityType: "SIGNATURE_REQUEST", icon: "signature" },
  DATE_REACHED: { label: "Date Reached", category: "Date & Time", entityType: "LEAD", icon: "calendar" },
  TIME_ELAPSED: { label: "Time Elapsed Since...", category: "Date & Time", entityType: "LEAD", icon: "hourglass" },
  SCHEDULED: { label: "On a Schedule", category: "Date & Time", entityType: "LEAD", icon: "clock" },
  RECORD_INACTIVE_FOR: { label: "Record Inactive For...", category: "Date & Time", entityType: "LEAD", icon: "clock-alert" },
  MANUAL: { label: "Manual Trigger", category: "Other", entityType: "LEAD", icon: "hand" },
};

/**
 * Triggers from the CRM's full 80-trigger taxonomy that aren't wired to a
 * real backend AutomationTriggerType yet — each needs either a schema field
 * that doesn't exist (e.g. old-value tracking for "re-opened" states), new
 * audit-log instrumentation on a mutation path that doesn't log one today
 * (tag add/remove, follower add/remove), or a real third-party integration
 * (Instagram/Messenger). Shown disabled in the picker so the full taxonomy
 * stays visible without pretending any of these fire today.
 */
export const PLANNED_TRIGGERS: { label: string; category: string; note: string }[] = [
  { label: "Lead Re-Opened", category: "Leads", note: "Needs prior-status tracking" },
  { label: "Lead Tag Added", category: "Tags", note: "Needs tag-mutation logging" },
  { label: "Lead Tag Removed", category: "Tags", note: "Needs tag-mutation logging" },
  { label: "Contact Tag Added", category: "Tags", note: "Needs tag-mutation logging" },
  { label: "Contact Tag Removed", category: "Tags", note: "Needs tag-mutation logging" },
  { label: "Deal Re-Opened", category: "Deals", note: "Needs prior-stage tracking" },
  { label: "Team Changed", category: "Assignment", note: "No team-assignment field yet" },
  { label: "Follower Added", category: "Assignment", note: "Needs follower-mutation logging" },
  { label: "Follower Removed", category: "Assignment", note: "Needs follower-mutation logging" },
  { label: "Form Submitted", category: "Lead Intake", note: "Needs forms-submission logging" },
  { label: "Lead Imported", category: "Lead Intake", note: "Needs import-path logging" },
  { label: "Lead Received via API", category: "Lead Intake", note: "Needs API-intake logging" },
  { label: "Contact Associated with Deal", category: "Relationships", note: "Needs association logging" },
  { label: "Contact Removed from Deal", category: "Relationships", note: "Needs association logging" },
  { label: "Instagram DM Received", category: "Communication", note: "Needs Meta app integration" },
  { label: "Messenger Message Received", category: "Communication", note: "Needs Meta app integration" },
];

/** Groups + labels every real action for the canvas's action picker, plus
 * the two structural flow-control steps (Wait / Branch) that aren't
 * AutomationActionType values but are picked from the same panel. */
export const ACTION_CATALOG: Record<
  AutomationActionType,
  { label: string; category: string; icon: string }
> = {
  UPDATE_RECORD: { label: "Update Field", category: "Record", icon: "pencil" },
  CHANGE_STATUS: { label: "Change Status", category: "Record", icon: "refresh-cw" },
  ASSIGN_OWNER: { label: "Assign Owner", category: "Record", icon: "user-check" },
  ADD_TAG: { label: "Add Tag", category: "Record", icon: "tag" },
  REMOVE_TAG: { label: "Remove Tag", category: "Record", icon: "tag" },
  LINK_RECORD: { label: "Link Record", category: "Record", icon: "link" },
  CREATE_TASK: { label: "Create Task", category: "Tasks", icon: "list-plus" },
  ADD_TO_WORK_QUEUE: { label: "Add to Work Queue", category: "Tasks", icon: "inbox" },
  CREATE_FOLLOW_UP: { label: "Create Follow-Up", category: "Tasks", icon: "calendar-plus" },
  CREATE_REMINDER: { label: "Create Reminder", category: "Tasks", icon: "bell-plus" },
  CANCEL_REMINDERS: { label: "Cancel Reminders", category: "Tasks", icon: "bell-off" },
  CREATE_NOTE: { label: "Create Note", category: "Tasks", icon: "sticky-note" },
  SEND_EMAIL: { label: "Send Email", category: "Communication", icon: "mail" },
  SEND_MESSAGE: { label: "Send Message", category: "Communication", icon: "message-square" },
  SEND_NOTIFICATION: { label: "Send Internal Notification", category: "Communication", icon: "bell" },
  TRIGGER_AUTOMATION: { label: "Trigger Another Automation", category: "Flow Control", icon: "workflow" },
  WEBHOOK: { label: "Send Webhook", category: "Integrations", icon: "webhook" },
  CREATE_LEAD: { label: "Create Lead", category: "Records", icon: "user-plus" },
  DELETE_LEAD: { label: "Delete Lead", category: "Records", icon: "user-minus" },
  CREATE_CONTACT: { label: "Create Contact", category: "Records", icon: "user-plus" },
  DELETE_CONTACT: { label: "Delete Contact", category: "Records", icon: "user-minus" },
  CREATE_COMPANY: { label: "Create Organization", category: "Records", icon: "building" },
  DELETE_COMPANY: { label: "Delete Organization", category: "Records", icon: "building" },
  CREATE_DEAL: { label: "Create Deal", category: "Records", icon: "circle-dollar-sign" },
  DELETE_DEAL: { label: "Delete Deal", category: "Records", icon: "circle-dollar-sign" },
  ADD_FOLLOWER: { label: "Add Follower", category: "Relationships & Assignment", icon: "user-plus" },
  REMOVE_FOLLOWER: { label: "Remove Follower", category: "Relationships & Assignment", icon: "user-minus" },
  ROUND_ROBIN_ASSIGN: { label: "Round Robin Assignment", category: "Relationships & Assignment", icon: "shuffle" },
  ASSOCIATE_CONTACT: { label: "Associate Organization", category: "Relationships & Assignment", icon: "link" },
  REMOVE_ASSOCIATION: { label: "Remove Association", category: "Relationships & Assignment", icon: "unlink" },
  SCHEDULE_CALL: { label: "Schedule Call", category: "Tasks", icon: "phone" },
  CREATE_MEETING: { label: "Create Meeting", category: "Tasks", icon: "calendar-plus" },
  SEND_SMS: { label: "Send SMS", category: "Communication", icon: "message-square" },
  SEND_WHATSAPP: { label: "Send WhatsApp", category: "Communication", icon: "message-circle" },
  REQUEST_DOCUMENTS: { label: "Request Documents", category: "Documents", icon: "file-plus" },
  UPDATE_DOCUMENT_STATUS: { label: "Update Document Status", category: "Documents", icon: "file-check" },
  SEND_DOCUMENT_REMINDER: { label: "Send Document Reminder", category: "Documents", icon: "file-clock" },
  END_AUTOMATION: { label: "End Automation", category: "Flow Control", icon: "circle-stop" },
};

/**
 * Actions from the CRM's full taxonomy that still have no executor.
 *
 * Everything else that used to sit here is now wired — see ACTION_CATALOG.
 * What remains needs one of: a third-party integration the workspace does
 * not have (Instagram/Messenger), a schema field that does not exist
 * (team assignment), or engine work beyond a single action step
 * (condition waits, cross-run cancellation). Shown disabled in the picker
 * so the full taxonomy stays visible without pretending any of these run.
 */
export const PLANNED_ACTIONS: { label: string; category: string; note: string }[] = [
  { label: "Wait Until Condition", category: "Flow Control", note: "Needs engine support" },
  { label: "Stop Other Automation", category: "Flow Control", note: "Needs cross-run cancellation" },
  { label: "Assign Team", category: "Relationships & Assignment", note: "No team-assignment field yet" },
  { label: "Activity Action", category: "Tasks", note: "No defined behaviour yet" },
  { label: "Send Instagram DM", category: "Communication", note: "Needs Meta app integration" },
  { label: "Send Facebook Messenger", category: "Communication", note: "Needs Meta app integration" },
  { label: "Send Client Notification", category: "Communication", note: "Needs a client portal channel" },
];

/**
 * Mirrors IMPLEMENTED_ACTIONS in automation-definition.service.ts: enum
 * members the backend declares but never wired into the executor, which
 * always fail validation with `automation.error.actionNotSupported`. Empty
 * today — every action in ACTION_CATALOG has an executor. REMOVE_FROM_WORK_QUEUE
 * is the one unwired backend member, and it is deliberately absent from
 * AUTOMATION_ACTION_TYPES rather than listed here.
 */
const NOT_YET_IMPLEMENTED_ACTIONS: AutomationActionType[] = [];

export function isActionImplemented(action: AutomationActionType): boolean {
  return !NOT_YET_IMPLEMENTED_ACTIONS.includes(action);
}

/**
 * Mirrors the entity restrictions enforced server-side in
 * automation-definition.service.ts (`validateStep`) — some actions only make
 * sense for certain trigger entity types (e.g. a Task has no "owner" field
 * in the automation field registry the way a Lead/Deal does). Filtering the
 * picker by this means a user can never build a combination the backend
 * would reject with `automation.error.actionEntityNotSupported`.
 */
export function isActionAllowedForEntity(
  action: AutomationActionType,
  entityType: AutomationEntityType
): boolean {
  if (!isActionImplemented(action)) return false;
  if (
    (["UPDATE_RECORD", "CHANGE_STATUS", "ASSIGN_OWNER"] as AutomationActionType[]).includes(action)
  ) {
    return (
      entityType === "LEAD" ||
      entityType === "DEAL" ||
      entityType === "CONTACT" ||
      entityType === "COMPANY"
    );
  }
  if ((["ADD_TAG", "REMOVE_TAG"] as AutomationActionType[]).includes(action)) {
    return entityType === "TASK";
  }
  const scope = ACTION_ENTITY_SCOPE[action];
  return scope ? scope.includes(entityType) : true;
}

const CRM_RECORD_ENTITIES: AutomationEntityType[] = ["LEAD", "CONTACT", "COMPANY", "DEAL"];

/**
 * Mirrors ACTION_ENTITY_SCOPE in automation-definition.service.ts. An action
 * missing from this map runs against any trigger entity.
 */
const ACTION_ENTITY_SCOPE: Partial<Record<AutomationActionType, AutomationEntityType[]>> = {
  DELETE_LEAD: ["LEAD"],
  DELETE_CONTACT: ["CONTACT"],
  DELETE_COMPANY: ["COMPANY"],
  DELETE_DEAL: ["DEAL"],
  ADD_FOLLOWER: ["LEAD"],
  REMOVE_FOLLOWER: ["LEAD"],
  ROUND_ROBIN_ASSIGN: CRM_RECORD_ENTITIES,
  ASSOCIATE_CONTACT: ["LEAD"],
  REMOVE_ASSOCIATION: ["LEAD"],
  LINK_RECORD: ["LEAD"],
  SCHEDULE_CALL: CRM_RECORD_ENTITIES,
  CREATE_MEETING: CRM_RECORD_ENTITIES,
  REQUEST_DOCUMENTS: CRM_RECORD_ENTITIES,
  CANCEL_REMINDERS: [...CRM_RECORD_ENTITIES, "TASK", "CALL", "MEETING"],
  UPDATE_DOCUMENT_STATUS: ["DOCUMENT_REQUEST"],
  SEND_DOCUMENT_REMINDER: ["DOCUMENT_REQUEST"],
};

export const FLOW_CONTROL_CATALOG = {
  WAIT_FOR_DURATION: { label: "Wait", category: "Flow Control", icon: "hourglass" },
  WAIT_UNTIL_DATE: { label: "Wait Until Date", category: "Flow Control", icon: "calendar-clock" },
  IF_ELSE: { label: "If / Else Branch", category: "Flow Control", icon: "git-branch" },
} as const;

/** Mirrors AUTOMATION_ACTION_REGISTRY in the backend, for building the step config editor. */
/**
 * Mirrors AUTOMATION_ACTION_REGISTRY in the backend, for building the step
 * config editor. Each action offers exactly the fields its own module's
 * create DTO accepts, so a step configured here maps 1:1 onto what the
 * module's own create form would send.
 *
 * Generated from the backend registry; `action-catalog.test.ts` asserts
 * every key here has a FIELD_META widget and that required is a subset of
 * allowed.
 */
export const AUTOMATION_ACTION_KEYS: Record<
  string,
  { allowed: string[]; required: string[] }
> = {
  UPDATE_RECORD: {
    allowed: ["fields"],
    required: ["fields"],
  },
  CHANGE_STATUS: {
    allowed: ["field", "value"],
    required: ["value"],
  },
  ASSIGN_OWNER: {
    allowed: ["ownerId"],
    required: ["ownerId"],
  },
  CREATE_TASK: {
    allowed: ["subject", "description", "taskType", "priority", "startAt", "startInMs", "dueAt", "dueInMs", "reminderAt", "reminderInMs", "repeatEvery", "recurrenceTimezone", "recurrenceLimit", "isPublic", "isBillable", "assigneeIds", "followerIds", "collaboratorIds", "tags", "attachmentKeys", "relatedType", "leadId", "contactId", "companyId", "dealId"],
    required: ["subject", "assigneeIds"],
  },
  CREATE_REMINDER: {
    allowed: ["title", "remindAt", "remindInMs", "targetUserId", "reminderType", "notificationMethod", "taskId", "callId", "meetingId", "relatedType", "leadId", "contactId", "companyId", "dealId", "quoteId", "estimateId", "invoiceId", "creditNoteId"],
    required: ["title", "targetUserId"],
  },
  CREATE_NOTE: {
    allowed: ["title", "body", "noteType", "isPinned", "isPrivate", "relatedType", "leadId", "contactId", "companyId", "dealId", "quoteId", "estimateId", "invoiceId", "creditNoteId"],
    required: ["body"],
  },
  ADD_TAG: {
    allowed: ["tag"],
    required: ["tag"],
  },
  REMOVE_TAG: {
    allowed: ["tag"],
    required: ["tag"],
  },
  SEND_NOTIFICATION: {
    allowed: ["recipientId", "notificationType", "title", "message", "taskId", "ticketId", "relatedType", "leadId", "contactId", "companyId", "dealId"],
    required: ["recipientId", "title", "message"],
  },
  SEND_EMAIL: {
    allowed: ["subject", "body", "toEmail", "cc", "bcc", "templateId", "replyToId", "scheduledAt", "relatedType", "leadId", "contactId", "companyId", "dealId"],
    required: ["subject", "body", "toEmail"],
  },
  SEND_MESSAGE: {
    allowed: ["messageType", "channel", "subject", "body", "toUserId", "toContactId", "templateId", "relatedType", "leadId", "contactId", "companyId", "dealId"],
    required: ["messageType", "subject", "body"],
  },
  ADD_TO_WORK_QUEUE: {
    allowed: ["subject", "description", "taskType", "priority", "startAt", "startInMs", "dueAt", "dueInMs", "reminderAt", "reminderInMs", "repeatEvery", "recurrenceTimezone", "recurrenceLimit", "isPublic", "isBillable", "assigneeIds", "followerIds", "collaboratorIds", "tags", "attachmentKeys", "relatedType", "leadId", "contactId", "companyId", "dealId"],
    required: ["subject", "assigneeIds"],
  },
  CREATE_FOLLOW_UP: {
    allowed: ["subject", "description", "taskType", "priority", "startAt", "startInMs", "dueAt", "dueInMs", "reminderAt", "reminderInMs", "repeatEvery", "recurrenceTimezone", "recurrenceLimit", "isPublic", "isBillable", "assigneeIds", "followerIds", "collaboratorIds", "tags", "attachmentKeys", "relatedType", "leadId", "contactId", "companyId", "dealId"],
    required: ["subject", "assigneeIds"],
  },
  TRIGGER_AUTOMATION: {
    allowed: ["triggerType", "entityType", "entityId"],
    required: ["triggerType"],
  },
  LINK_RECORD: {
    allowed: ["companyId"],
    required: ["companyId"],
  },
  CANCEL_REMINDERS: {
    allowed: [],
    required: [],
  },
  WEBHOOK: {
    allowed: ["url", "method", "headers", "body", "timeoutMs"],
    required: ["url"],
  },
  CREATE_LEAD: {
    allowed: ["firstName", "lastName", "email", "phone", "mobilePhone", "jobTitle", "department", "linkedinUrl", "websiteUrl", "twitterUrl", "street", "city", "state", "country", "postalCode", "companyId", "companyName", "companyWebsite", "industry", "companySize", "pipelineStage", "tags", "source", "lifecycleStage", "score", "rating", "doNotContact", "productInterest", "budgetRange", "estimatedValue", "currency", "probability", "expectedCloseDate", "description", "notes", "ownerId", "avatarKey"],
    required: ["firstName", "lastName", "email"],
  },
  DELETE_LEAD: {
    allowed: ["recordId"],
    required: [],
  },
  CREATE_CONTACT: {
    allowed: ["firstName", "lastName", "email", "phone", "mobilePhone", "jobTitle", "department", "linkedinUrl", "lifecycleStage", "source", "doNotContact", "notes", "companyId", "ownerId", "avatarKey"],
    required: ["email"],
  },
  DELETE_CONTACT: {
    allowed: ["recordId"],
    required: [],
  },
  CREATE_COMPANY: {
    allowed: ["name", "website", "industry", "size", "employeeCount", "annualRevenue", "description", "street", "city", "state", "country", "postalCode", "linkedinUrl", "twitterUrl", "phone", "parentId", "ownerId"],
    required: ["name"],
  },
  DELETE_COMPANY: {
    allowed: ["recordId"],
    required: [],
  },
  CREATE_DEAL: {
    allowed: ["name", "stage", "value", "currency", "probability", "expectedCloseDate", "source", "description", "lostReason", "competitor", "pipeline", "companyId", "ownerId"],
    required: ["name"],
  },
  DELETE_DEAL: {
    allowed: ["recordId"],
    required: [],
  },
  ADD_FOLLOWER: {
    allowed: ["userId"],
    required: ["userId"],
  },
  REMOVE_FOLLOWER: {
    allowed: ["userId"],
    required: ["userId"],
  },
  ROUND_ROBIN_ASSIGN: {
    allowed: ["memberUserIds", "ruleId"],
    required: [],
  },
  ASSOCIATE_CONTACT: {
    allowed: ["companyId"],
    required: ["companyId"],
  },
  REMOVE_ASSOCIATION: {
    allowed: [],
    required: [],
  },
  SCHEDULE_CALL: {
    allowed: ["subject", "callType", "callAt", "callInMs", "duration", "phone", "agenda", "purpose", "notes", "reminderAt", "reminderInMs", "assignedToId", "participantIds", "relatedType", "leadId", "contactId", "companyId", "dealId"],
    required: ["subject"],
  },
  CREATE_MEETING: {
    allowed: ["title", "meetingType", "startAt", "startInMs", "endAt", "durationMinutes", "timezone", "allDay", "location", "meetingLink", "agenda", "notes", "reminderAt", "reminderInMs", "attendeeIds", "externalAttendees", "relatedType", "leadId", "contactId", "companyId", "dealId"],
    required: ["title"],
  },
  SEND_SMS: {
    allowed: ["toPhone", "body"],
    required: ["toPhone", "body"],
  },
  SEND_WHATSAPP: {
    allowed: ["toPhone", "body"],
    required: ["toPhone", "body"],
  },
  REQUEST_DOCUMENTS: {
    allowed: ["title", "documentType", "requestedFromId", "dueDate", "dueInMs", "notes", "relatedType", "leadId", "contactId", "companyId", "dealId"],
    required: ["title", "documentType", "requestedFromId"],
  },
  UPDATE_DOCUMENT_STATUS: {
    allowed: ["status"],
    required: ["status"],
  },
  SEND_DOCUMENT_REMINDER: {
    allowed: ["message"],
    required: [],
  },
  END_AUTOMATION: {
    allowed: ["reason"],
    required: [],
  },
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
 * `key` must be unique within a run's step tree and match
 * ^[a-zA-Z0-9_-]{1,80}$. Mirrors the backend's `AutomationStepDefinition`
 * (src/modules/automation/interfaces/automation-definition.interface.ts) —
 * a discriminated union on `type` so the workflow canvas can render and edit
 * ACTION / WAIT_FOR_DURATION / WAIT_UNTIL_DATE / IF_ELSE nodes.
 */
export type AutomationActionStep = {
  key: string;
  type: "ACTION";
  action: AutomationActionType | string;
  config: Record<string, unknown>;
};

export type AutomationWaitDurationStep = {
  key: string;
  type: "WAIT_FOR_DURATION";
  durationMs: number;
};

export type AutomationWaitUntilStep = {
  key: string;
  type: "WAIT_UNTIL_DATE";
  until: string;
};

/**
 * `EQUALS` / `GREATER_THAN` / etc. compare a real field from
 * `AUTOMATION_FIELD_REGISTRY` (mirrors the backend's copy of the same name in
 * automation-condition.service.ts). `_activity.MESSAGE` / `_activity.EMAIL`
 * are the two reserved pseudo-fields powering "wait N days, then branch on
 * no-reply" — EXISTS/DOES_NOT_EXIST only, no `value`, evaluated live against
 * real inbound Message/Email rows when the run resumes from a wait.
 */
export type AutomationConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "CONTAINS"
  | "EXISTS"
  | "DOES_NOT_EXIST"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "BEFORE"
  | "AFTER"
  | "IN_LIST"
  | "OWNER_EQUALS"
  | "STATUS_EQUALS"
  | "TAG_CONTAINS";

export type AutomationCondition = {
  field: string;
  operator: AutomationConditionOperator;
  value?: unknown;
};

export type AutomationConditionGroup = {
  mode: "ALL" | "ANY";
  items: Array<AutomationCondition | AutomationConditionGroup>;
};

export type AutomationIfElseStep = {
  key: string;
  type: "IF_ELSE";
  condition: AutomationConditionGroup;
  then: AutomationStep[];
  else: AutomationStep[];
};

export type AutomationStep =
  | AutomationActionStep
  | AutomationWaitDurationStep
  | AutomationWaitUntilStep
  | AutomationIfElseStep;

/**
 * Mirrors AUTOMATION_FIELD_REGISTRY in automation-condition.service.ts — the
 * only fields a real (non-`_activity.*`) condition may reference, and their
 * comparison type (which operators/value shapes are valid for the builder).
 */
export type AutomationConditionFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "array";

export const AUTOMATION_FIELD_REGISTRY: Record<
  AutomationEntityType,
  Record<string, AutomationConditionFieldType>
> = {
  LEAD: {
    id: "string",
    status: "string",
    source: "string",
    ownerId: "string",
    lifecycleStage: "string",
    rating: "string",
    score: "number",
    companyId: "string",
    isConverted: "boolean",
    createdAt: "date",
    updatedAt: "date",
  },
  CONTACT: {
    id: "string",
    status: "string",
    source: "string",
    ownerId: "string",
    lifecycleStage: "string",
    companyId: "string",
    doNotContact: "boolean",
    createdAt: "date",
    updatedAt: "date",
  },
  COMPANY: {
    id: "string",
    status: "string",
    ownerId: "string",
    industry: "string",
    size: "string",
    version: "number",
    createdAt: "date",
    updatedAt: "date",
  },
  DEAL: {
    id: "string",
    stage: "string",
    ownerId: "string",
    companyId: "string",
    source: "string",
    probability: "number",
    pipeline: "string",
    currency: "string",
    expectedCloseDate: "date",
    actualCloseDate: "date",
    createdAt: "date",
    updatedAt: "date",
  },
  TASK: {
    id: "string",
    status: "string",
    priority: "string",
    taskType: "string",
    createdById: "string",
    assigneeIds: "array",
    tags: "array",
    startDate: "date",
    dueDate: "date",
    completedAt: "date",
    createdAt: "date",
    updatedAt: "date",
  },
  CALL: {
    id: "string",
    status: "string",
    callType: "string",
    assignedToId: "string",
    callDate: "date",
    createdAt: "date",
    updatedAt: "date",
  },
  MESSAGE: {
    id: "string",
    status: "string",
    messageType: "string",
    channel: "string",
    direction: "string",
    fromId: "string",
    toUserId: "string",
    toContactId: "string",
    createdAt: "date",
    updatedAt: "date",
  },
  EMAIL: {
    id: "string",
    status: "string",
    createdById: "string",
    scheduledAt: "date",
    sentAt: "date",
    createdAt: "date",
    updatedAt: "date",
  },
  MEETING: {
    id: "string",
    status: "string",
    origin: "string",
    organizerId: "string",
    startAt: "date",
    endAt: "date",
    createdAt: "date",
    updatedAt: "date",
  },
  DOCUMENT: {
    id: "string",
    documentType: "string",
    uploadedById: "string",
    createdAt: "date",
    updatedAt: "date",
  },
  DOCUMENT_REQUEST: {
    id: "string",
    status: "string",
    documentType: "string",
    requestedById: "string",
    dueDate: "date",
    createdAt: "date",
    updatedAt: "date",
  },
  SIGNATURE_REQUEST: {
    id: "string",
    status: "string",
    documentId: "string",
    signerId: "string",
    createdById: "string",
    expiresAt: "date",
    createdAt: "date",
    updatedAt: "date",
  },
  REMINDER: {
    id: "string",
    status: "string",
    reminderType: "string",
    targetUserId: "string",
    remindAt: "date",
    createdAt: "date",
    updatedAt: "date",
  },
  NOTE: {
    id: "string",
    noteType: "string",
    createdById: "string",
    isPinned: "boolean",
    isPrivate: "boolean",
    createdAt: "date",
    updatedAt: "date",
  },
  NOTIFICATION: {
    id: "string",
    type: "string",
    status: "string",
    recipientId: "string",
    createdAt: "date",
  },
};

/** Entity types with a Message/Email polymorphic link — the only ones the
 * `_activity.*` no-reply/has-replied condition can be built against. */
export const ACTIVITY_CAPABLE_ENTITY_TYPES: AutomationEntityType[] = [
  "LEAD",
  "CONTACT",
  "COMPANY",
  "DEAL",
];

/** Mirrors `AutomationDefinition` (automation-definition.interface.ts) — the
 * actual persisted shape. `entityType`/trigger config live under `trigger`,
 * not flat on the definition. */
export type AutomationVersion = {
  id: string;
  version: number;
  status: AutomationVersionStatus | string;
  triggerType: AutomationTriggerType | string;
  definition: {
    trigger?: {
      type?: string;
      entityType?: string;
      config?: Record<string, unknown>;
    };
    conditions?: AutomationConditionGroup;
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
  /** `null` clears a saved condition group on update; omitting it keeps the
   * stored one (automation.service.ts reads `dto.conditions ?? current`). */
  conditions?: Record<string, unknown> | null;
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
