import { AUTOMATION_ENTITY_TYPES, TRIGGER_CATALOG } from "./types";

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
  | "datetime";

export interface FieldMeta {
  label: string;
  widget: FieldWidget;
  placeholder?: string;
  options?: { label: string; value: string }[];
  helpText?: string;
}

export const FIELD_META: Record<string, FieldMeta> = {
  fields: { label: "Fields to Update (JSON)", widget: "textarea", placeholder: '{"status": "QUALIFIED"}' },
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
  toEmail: { label: "To Email", widget: "text", placeholder: "{{email}} or literal address", helpText: "Use {{email}} to send to the triggering record's email." },
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
};
