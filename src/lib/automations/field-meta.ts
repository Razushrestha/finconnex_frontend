import { AUTOMATION_ENTITY_TYPES, TRIGGER_CATALOG, type AutomationActionType } from "./types";
import type { RelatedTarget } from "./record-search";

/** Per-config-key rendering hints for the step config panel — maps a raw
 * `AUTOMATION_ACTION_KEYS` key to a friendly label and input widget. */
export type FieldWidget =
  | "text"
  | "textarea"
  | "number"
  | "member"
  | "members"
  | "tags"
  | "select"
  | "checkbox"
  | "json"
  | "datetime"
  | "record";

export interface FieldMeta {
  label: string;
  widget: FieldWidget;
  /** Which list a `record` widget searches. */
  target?: RelatedTarget;
  placeholder?: string;
  options?: { label: string; value: string }[];
  helpText?: string;
}

/**
 * Config keys an action accepts but the builder does not ask for.
 *
 * The relation keys (`relatedType` + the four parent ids) default to the
 * record that triggered the run — which is what a step on that record wants —
 * so offering them as raw UUID boxes invites a wrong answer to a question the
 * executor already answers. `replyToId` is an existing email's uuid, which
 * nobody can know while designing a workflow.
 *
 * Suppression is display-only: a value already saved (by a template, or by
 * hand through the API) still round-trips and is still rendered, so nothing
 * is stranded out of sight — see `visibleActionConfigKeys`.
 */
/**
 * Actions whose payload creates a Task. They share the task registry's key
 * list, so they share the task-shaped parts of the form.
 */
export const TASK_CREATING_ACTIONS = [
  "CREATE_TASK",
  "ADD_TO_WORK_QUEUE",
  "CREATE_FOLLOW_UP",
] as const satisfies readonly AutomationActionType[];

/**
 * Per-action label overrides.
 *
 * FIELD_META is keyed by config key, so one entry serves every action that
 * accepts that key — `ownerId` is "New Owner" because ASSIGN_OWNER asked
 * first, which reads wrongly in a Create Lead step. These override the label
 * where an action calls the same field something else on its own form.
 */
export const ACTION_FIELD_LABELS: Partial<
  Record<AutomationActionType, Readonly<Record<string, string>>>
> = {
  CREATE_LEAD: {
    ownerId: "Lead owner",
    pipelineStage: "Lead Status",
    source: "Lead source",
    firstName: "First name",
    lastName: "Last name",
    notes: "Notes",
    tags: "Add tags",
  },
};

/**
 * The keys a step shows before "Show all fields".
 *
 * CREATE_LEAD accepts 37 keys; the Create Lead form asks nine. Rendering all
 * 37 in registry order buries the nine someone actually came to fill in, so
 * these lead and the rest stay one click away. Everything remains editable —
 * this is ordering, not suppression.
 */
export const PRIMARY_ACTION_FIELDS: Partial<
  Record<AutomationActionType, readonly string[]>
> = {
  CREATE_LEAD: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "pipelineStage",
    "source",
    "ownerId",
    "tags",
    "notes",
  ],
};

/**
 * Splits an action's visible keys into the ones shown up front and the rest,
 * preserving registry order within each half. A key already carrying a value
 * is promoted, so a step configured through the API never hides its own data.
 */
export function splitActionConfigKeys(
  action: string,
  visible: readonly string[],
  config: Record<string, unknown>,
): { primary: string[]; more: string[] } {
  const lead = (
    PRIMARY_ACTION_FIELDS as Record<string, readonly string[] | undefined>
  )[action];
  if (!lead) return { primary: [...visible], more: [] };
  const primary: string[] = [];
  const more: string[] = [];
  for (const key of visible) {
    if (lead.includes(key) || config[key] !== undefined) primary.push(key);
    else more.push(key);
  }
  return { primary, more };
}

export function actionFieldLabel(action: string, key: string): string | undefined {
  return (
    ACTION_FIELD_LABELS as Record<
      string,
      Readonly<Record<string, string>> | undefined
    >
  )[action]?.[key];
}

export const HIDDEN_ACTION_CONFIG_KEYS: Partial<
  Record<AutomationActionType, readonly string[]>
> = {
  SEND_EMAIL: [
    "replyToId",
    "relatedType",
    "leadId",
    "contactId",
    "companyId",
    "dealId",
  ],
};

/**
 * The keys the step form renders, in the registry's own order. `action` is
 * widened to string because a step read back from the API carries whatever
 * the backend stored, which need not be an action this build knows.
 */
export function visibleActionConfigKeys(
  action: string,
  allowed: readonly string[],
  config: Record<string, unknown>,
): string[] {
  const hidden = (
    HIDDEN_ACTION_CONFIG_KEYS as Record<string, readonly string[] | undefined>
  )[action];
  if (!hidden) return [...allowed];
  return allowed.filter(
    (key) => !hidden.includes(key) || config[key] !== undefined,
  );
}

export const FIELD_META: Record<string, FieldMeta> = {
  fields: {
    label: "Fields to Update",
    widget: "json",
    placeholder: '{"status": "QUALIFIED"}',
    helpText: "JSON object of field names to new values",
  },
  field: { label: "Field Name", widget: "text", placeholder: "status" },
  value: { label: "New Value", widget: "text" },
  ownerId: { label: "New Owner", widget: "member" },
  tag: { label: "Tag", widget: "text", placeholder: "hot-lead" },
  subject: { label: "Subject", widget: "text" },
  description: { label: "Description", widget: "textarea" },
  taskType: {
    label: "Task Type",
    widget: "select",
    options: [
      { label: "Call", value: "CALL" },
      { label: "Email", value: "EMAIL" },
      { label: "Meeting", value: "MEETING" },
      { label: "Follow Up", value: "FOLLOW_UP" },
      { label: "Demo", value: "DEMO" },
      { label: "Research", value: "RESEARCH" },
      { label: "Other", value: "OTHER" },
    ],
  },
  priority: {
    label: "Priority",
    widget: "select",
    options: [
      { label: "Low", value: "LOW" },
      { label: "Medium", value: "MEDIUM" },
      { label: "High", value: "HIGH" },
      { label: "Urgent", value: "URGENT" },
    ],
  },
  startAt: { label: "Start At (ISO date)", widget: "datetime" },
  startInMs: { label: "Start In (minutes from now)", widget: "number" },
  dueAt: { label: "Due At (ISO date)", widget: "datetime" },
  dueInMs: { label: "Due In (minutes from now)", widget: "number" },
  assigneeIds: { label: "Assignees", widget: "members" },
  tags: { label: "Tags", widget: "tags" },
  title: { label: "Title", widget: "text" },
  body: { label: "Message", widget: "textarea" },
  message: { label: "Message", widget: "textarea" },
  remindAt: { label: "Remind At (ISO date)", widget: "datetime" },
  remindInMs: { label: "Remind In (minutes from now)", widget: "number" },
  targetUserId: { label: "Remind", widget: "member" },
  recipientId: { label: "Recipient", widget: "member" },
  notificationType: { label: "Notification Type", widget: "text", placeholder: "GENERAL" },
  // SEND_EMAIL renders To/Cc/Bcc through EmailRecipientsField instead of
  // these generic widgets; they remain as the fallback for any other action
  // that takes an address.
  toEmail: { label: "To Email", widget: "text", placeholder: "name@example.com", helpText: "Leave empty to send to the triggering record's own address." },
  messageType: {
    label: "Message Type",
    widget: "select",
    options: [
      { label: "Internal", value: "INTERNAL" },
      { label: "External", value: "EXTERNAL" },
    ],
  },
  channel: {
    label: "Channel",
    widget: "select",
    options: [
      { label: "In-App", value: "IN_APP" },
      { label: "SMS", value: "SMS" },
      { label: "WhatsApp", value: "WHATSAPP" },
    ],
  },
  toUserId: { label: "To (Teammate)", widget: "member" },
  toContactId: { label: "To Contact ID", widget: "text" },
  url: { label: "Webhook URL", widget: "text", placeholder: "https://example.com/hooks/..." },
  method: {
    label: "HTTP Method",
    widget: "select",
    options: [
      { label: "POST", value: "POST" },
      { label: "PUT", value: "PUT" },
      { label: "PATCH", value: "PATCH" },
    ],
  },
  headers: { label: "Headers (JSON)", widget: "textarea", placeholder: '{"Authorization": "Bearer ..."}' },
  timeoutMs: { label: "Timeout (ms)", widget: "number" },
  triggerType: {
    label: "Trigger Type to Fire",
    widget: "select",
    options: (Object.entries(TRIGGER_CATALOG) as [string, (typeof TRIGGER_CATALOG)[keyof typeof TRIGGER_CATALOG]][])
      .map(([value, meta]) => ({ value, label: meta.label })),
    helpText: "Publishes a synthetic event of this trigger type — any enabled workflow listening for it (including other workflows) will run, exactly as if the real event had happened.",
  },
  entityType: {
    label: "Record Type (optional)",
    widget: "select",
    options: AUTOMATION_ENTITY_TYPES.map((value) => ({ value, label: value })),
    helpText: "Defaults to this workflow's own record type if left unset.",
  },
  entityId: {
    label: "Record ID (optional)",
    widget: "text",
    helpText: "Defaults to the record that triggered this workflow if left unset.",
  },

  // ─── Added with the expanded action set ─────────────────────────────────
  firstName: { label: "First Name", widget: "text" },
  lastName: { label: "Last Name", widget: "text" },
  email: { label: "Email", widget: "text", placeholder: "name@example.com" },
  phone: { label: "Phone", widget: "text" },
  jobTitle: { label: "Job Title", widget: "text" },
  companyId: { label: "Organization", widget: "record", target: "COMPANY" },
  name: { label: "Name", widget: "text" },
  website: { label: "Website", widget: "text", placeholder: "https://example.com" },
  industry: { label: "Industry", widget: "text" },
  currency: { label: "Currency", widget: "text", placeholder: "USD" },
  expectedCloseDate: { label: "Expected Close Date", widget: "datetime" },
  stage: {
    label: "Deal Stage",
    widget: "select",
    options: [
      { label: "Prospecting", value: "PROSPECTING" },
      { label: "Qualification", value: "QUALIFICATION" },
      { label: "Proposal", value: "PROPOSAL" },
      { label: "Negotiation", value: "NEGOTIATION" },
      { label: "Contract Sent", value: "CONTRACT_SENT" },
      { label: "Closed Won", value: "CLOSED_WON" },
      { label: "Closed Lost", value: "CLOSED_LOST" },
    ],
  },
  source: {
    label: "Source",
    widget: "select",
    options: [
      { label: "Website", value: "WEBSITE" },
      { label: "Referral", value: "REFERRAL" },
      { label: "Cold Call", value: "COLD_CALL" },
      { label: "Social Media", value: "SOCIAL_MEDIA" },
      { label: "Email Campaign", value: "EMAIL_CAMPAIGN" },
      { label: "Paid Ad", value: "PAID_AD" },
      { label: "Event", value: "EVENT" },
      { label: "Partner", value: "PARTNER" },
      { label: "Other", value: "OTHER" },
    ],
  },
  recordId: {
    label: "Record",
    widget: "text",
    helpText: "Leave empty to act on the record that triggered this automation",
  },
  userId: { label: "Member", widget: "member" },
  memberUserIds: {
    label: "Round Robin Pool",
    widget: "members",
    helpText: "Members are assigned in this order, one per run",
  },
  ruleId: {
    label: "Lead Assignment Rule",
    widget: "text",
    helpText: "Use an existing rule's pool and rotation instead of a pool set here",
  },
  callType: {
    label: "Call Type",
    widget: "select",
    options: [
      { label: "Outbound", value: "OUTBOUND" },
      { label: "Inbound", value: "INBOUND" },
      { label: "Missed", value: "MISSED" },
      { label: "Voicemail", value: "VOICEMAIL" },
    ],
  },
  callAt: { label: "Call At (ISO date)", widget: "datetime" },
  callInMs: { label: "Call In (minutes from now)", widget: "number" },
  duration: { label: "Duration (minutes)", widget: "number" },
  agenda: { label: "Agenda", widget: "textarea" },
  notes: { label: "Notes", widget: "textarea" },
  assignedToId: { label: "Assigned To", widget: "member" },
  participantIds: { label: "Participants", widget: "members" },
  meetingType: {
    label: "Meeting Type",
    widget: "select",
    options: [
      { label: "Video Call", value: "VIDEO_CALL" },
      { label: "In Person", value: "IN_PERSON" },
      { label: "Phone Call", value: "PHONE_CALL" },
      { label: "Conference", value: "CONFERENCE" },
    ],
  },
  durationMinutes: { label: "Duration (minutes)", widget: "number", helpText: "Defaults to 30" },
  location: { label: "Location", widget: "text" },
  meetingLink: { label: "Meeting Link", widget: "text", placeholder: "https://…" },
  attendeeIds: { label: "Attendees", widget: "members" },
  toPhone: { label: "To Phone Number", widget: "text", placeholder: "+15550100" },
  documentType: {
    label: "Document Type",
    widget: "select",
    options: [
      { label: "Contract", value: "CONTRACT" },
      { label: "Proposal", value: "PROPOSAL" },
      { label: "ID Proof", value: "ID_PROOF" },
      { label: "Financial", value: "FINANCIAL" },
      { label: "Legal", value: "LEGAL" },
      { label: "Other", value: "OTHER" },
    ],
  },
  requestedFromId: { label: "Requested From (Contact)", widget: "text", helpText: "Contact UUID" },
  dueDate: { label: "Due Date", widget: "datetime" },
  status: {
    label: "New Status",
    widget: "select",
    helpText: "Runs the matching transition; there is no path back to Requested",
    options: [
      { label: "Pending (send request)", value: "PENDING" },
      { label: "Received", value: "RECEIVED" },
      { label: "Approved", value: "APPROVED" },
      { label: "Rejected", value: "REJECTED" },
      { label: "Expired", value: "EXPIRED" },
    ],
  },
  reason: { label: "Reason", widget: "text", helpText: "Recorded on the run; optional" },

  // ─── Relation to the record the step acts on ──────────────────────────
  relatedType: {
    label: "Related Entity",
    widget: "select",
    helpText: "Leave every relation field empty to attach this to the record that triggered the automation",
    options: [
      { label: "Lead", value: "LEAD" },
      { label: "Contact", value: "CONTACT" },
      { label: "Organization", value: "COMPANY" },
      { label: "Deal", value: "DEAL" },
    ],
  },
  leadId: { label: "Related Lead", widget: "record", target: "LEAD" },
  contactId: { label: "Related Contact", widget: "record", target: "CONTACT" },
  dealId: { label: "Related Deal", widget: "record", target: "DEAL" },
  taskId: { label: "Related Task", widget: "record", target: "TASK" },
  callId: { label: "Related Call", widget: "text", helpText: "Record UUID" },
  meetingId: { label: "Related Meeting", widget: "record", target: "MEETING" },
  quoteId: { label: "Related Quote", widget: "text", helpText: "Record UUID" },
  estimateId: { label: "Related Estimate", widget: "text", helpText: "Record UUID" },
  invoiceId: { label: "Related Invoice", widget: "text", helpText: "Record UUID" },
  creditNoteId: { label: "Related Credit Note", widget: "text", helpText: "Record UUID" },
  parentId: { label: "Parent Organization", widget: "text", helpText: "Record UUID" },
  templateId: { label: "Template", widget: "text", helpText: "Record UUID" },
  replyToId: { label: "In Reply To", widget: "text", helpText: "Record UUID" },
  // ─── Task ─────────────────────────────────────────────────────────────
  reminderAt: { label: "Reminder At", widget: "datetime" },
  reminderInMs: { label: "Remind In (minutes from now)", widget: "number" },
  repeatEvery: {
    label: "Repeat Every",
    widget: "select",
    options: [
      { label: "Daily", value: "DAILY" },
      { label: "Weekly", value: "WEEKLY" },
      { label: "Monthly", value: "MONTHLY" },
      { label: "Yearly", value: "YEARLY" },
    ],
  },
  recurrenceTimezone: { label: "Recurrence Timezone", widget: "text", placeholder: "America/New_York" },
  recurrenceLimit: { label: "Recurrence Limit", widget: "number", helpText: "Number of occurrences, 2–100" },
  isPublic: { label: "Visible to all workspace members", widget: "checkbox" },
  isBillable: { label: "Billable", widget: "checkbox" },
  followerIds: { label: "Followers", widget: "members" },
  collaboratorIds: { label: "Collaborators", widget: "members" },
  attachmentKeys: { label: "Attachments", widget: "tags", helpText: "Uploaded storage keys" },
  // ─── Note ─────────────────────────────────────────────────────────────
  noteType: {
    label: "Note Type",
    widget: "select",
    options: [
      { label: "General", value: "GENERAL" },
      { label: "Call Summary", value: "CALL_SUMMARY" },
      { label: "Meeting Notes", value: "MEETING_NOTES" },
      { label: "Follow-up", value: "FOLLOW_UP" },
      { label: "Other", value: "OTHER" },
    ],
  },
  isPinned: { label: "Pin Note", widget: "checkbox" },
  isPrivate: { label: "Only visible to you (Private)", widget: "checkbox" },
  // ─── Email ────────────────────────────────────────────────────────────
  cc: { label: "Cc", widget: "text", helpText: "Comma-separated addresses" },
  bcc: { label: "Bcc", widget: "text", helpText: "Comma-separated addresses, hidden from other recipients" },
  scheduledAt: { label: "Send At", widget: "datetime", helpText: "Leave empty to send immediately" },
  // ─── Reminder ─────────────────────────────────────────────────────────
  reminderType: {
    label: "Reminder Type",
    widget: "select",
    options: [
      { label: "Task Due", value: "TASK_DUE" },
      { label: "Meeting Start", value: "MEETING_START" },
      { label: "Follow-up", value: "FOLLOW_UP" },
      { label: "Custom", value: "CUSTOM" },
    ],
  },
  notificationMethod: {
    label: "Notify Via",
    widget: "select",
    options: [
      { label: "In App", value: "IN_APP" },
      { label: "Email", value: "EMAIL" },
      { label: "Push", value: "PUSH" },
      { label: "SMS", value: "SMS" },
    ],
  },
  // ─── Call & meeting ───────────────────────────────────────────────────
  purpose: { label: "Purpose", widget: "text" },
  endAt: { label: "Ends At", widget: "datetime", helpText: "Overrides Duration when set" },
  timezone: { label: "Timezone", widget: "text", placeholder: "Asia/Kathmandu" },
  allDay: { label: "All day", widget: "checkbox" },
  // ─── Lead / contact / organization / deal columns ─────────────────────
  mobilePhone: { label: "Mobile Phone", widget: "text" },
  department: { label: "Department", widget: "text" },
  linkedinUrl: { label: "LinkedIn URL", widget: "text" },
  websiteUrl: { label: "Website URL", widget: "text" },
  twitterUrl: { label: "Twitter URL", widget: "text" },
  street: { label: "Street", widget: "text" },
  city: { label: "City", widget: "text" },
  state: { label: "State", widget: "text" },
  country: { label: "Country", widget: "text" },
  postalCode: { label: "Postal Code", widget: "text" },
  companyName: { label: "Organization Name", widget: "text" },
  companyWebsite: { label: "Organization Website", widget: "text" },
  companySize: {
    label: "Organization Size",
    widget: "select",
    options: [
      { label: "Micro (1–9)", value: "MICRO" },
      { label: "Small (10–49)", value: "SMALL" },
      { label: "Medium (50–249)", value: "MEDIUM" },
      { label: "Large (250–999)", value: "LARGE" },
      { label: "Enterprise (1000+)", value: "ENTERPRISE" },
    ],
  },
  size: {
    label: "Organization Size",
    widget: "select",
    options: [
      { label: "Micro (1–9)", value: "MICRO" },
      { label: "Small (10–49)", value: "SMALL" },
      { label: "Medium (50–249)", value: "MEDIUM" },
      { label: "Large (250–999)", value: "LARGE" },
      { label: "Enterprise (1000+)", value: "ENTERPRISE" },
    ],
  },
  employeeCount: { label: "Employee Count", widget: "number" },
  annualRevenue: { label: "Annual Revenue", widget: "text", placeholder: "1000000.00" },
  pipelineStage: {
    label: "Pipeline Stage",
    widget: "select",
    options: [
      { label: "New Lead", value: "NEW_LEAD" },
      { label: "Appointment Booked", value: "APPOINTMENT_BOOKED" },
      { label: "Appointment Missed", value: "APPOINTMENT_MISSED" },
      { label: "In Conversation", value: "IN_CONVERSATION" },
      { label: "Hold", value: "HOLD" },
      { label: "No Answer", value: "NO_ANSWER" },
      { label: "Waiting On Docs", value: "WAITING_ON_DOCS" },
      { label: "Document Received", value: "DOCUMENT_RECEIVED" },
      { label: "Findings", value: "FINDINGS" },
      { label: "Research And Servicing", value: "RESEARCH_AND_SERVICING" },
      { label: "Servicing Completed", value: "SERVICING_COMPLETED" },
      { label: "Loan Proposal Presented", value: "LOAN_PROPOSAL_PRESENTED" },
      { label: "Future Potential Clients", value: "FUTURE_POTENTIAL_CLIENTS" },
      { label: "Closed Won", value: "CLOSED_WON" },
      { label: "Closed Lost", value: "CLOSED_LOST" },
    ],
  },
  lifecycleStage: {
    label: "Lifecycle Stage",
    widget: "select",
    options: [
      { label: "Subscriber", value: "SUBSCRIBER" },
      { label: "Lead", value: "LEAD" },
      { label: "MQL", value: "MQL" },
      { label: "SQL", value: "SQL" },
      { label: "Opportunity", value: "OPPORTUNITY" },
      { label: "Customer", value: "CUSTOMER" },
      { label: "Evangelist", value: "EVANGELIST" },
      { label: "Lost", value: "LOST" },
    ],
  },
  rating: {
    label: "Rating",
    widget: "select",
    options: [
      { label: "Hot", value: "HOT" },
      { label: "Warm", value: "WARM" },
      { label: "Cold", value: "COLD" },
    ],
  },
  lostReason: {
    label: "Lost Reason",
    widget: "select",
    options: [
      { label: "Price", value: "PRICE" },
      { label: "Feature", value: "FEATURE" },
      { label: "Competitor", value: "COMPETITOR" },
      { label: "No Budget", value: "NO_BUDGET" },
      { label: "No Response", value: "NO_RESPONSE" },
      { label: "Other", value: "OTHER" },
    ],
  },
  score: { label: "Score", widget: "number", helpText: "0–100" },
  probability: { label: "Probability (%)", widget: "number" },
  doNotContact: { label: "Do not contact", widget: "checkbox" },
  productInterest: { label: "Product Interest", widget: "text" },
  budgetRange: { label: "Budget Range", widget: "text" },
  estimatedValue: { label: "Estimated Value", widget: "text" },
  competitor: { label: "Competitor", widget: "text" },
  pipeline: { label: "Pipeline", widget: "text" },
  ticketId: { label: "Related Ticket", widget: "text", helpText: "Record UUID" },
  avatarKey: {
    label: "Avatar",
    widget: "text",
    helpText: "Storage key from the upload endpoint",
  },
  externalAttendees: {
    label: "External Attendees",
    widget: "json",
    placeholder: '[{ "email": "guest@example.com", "name": "Guest" }]',
    helpText: "JSON array of { email, name } for people outside the workspace",
  },
};
