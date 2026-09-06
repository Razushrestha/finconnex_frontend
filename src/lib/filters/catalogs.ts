import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  CALL_PURPOSES,
  CALL_STAGES,
  CALL_TYPES,
} from "@/lib/calls/types";
import { COMPANY_STATUSES } from "@/lib/companies/types";
import { CONTACT_SOURCES, CONTACT_STATUSES } from "@/lib/contacts/types";
import type { CustomFieldDef } from "@/lib/custom-fields/types";
import { DEAL_CURRENCIES, LOST_REASONS } from "@/lib/deals/types";
import { NOTE_TYPES } from "@/lib/notes/types";
import {
  LEAD_PIPELINE_STAGES,
  LEAD_SOURCES,
  LEAD_STATUSES,
} from "@/lib/leads/types";
import { MEETING_STATUSES, MEETING_TYPES } from "@/lib/meetings/types";
import { MESSAGE_STATUSES, MESSAGE_TYPES } from "@/lib/messages/types";
import {
  EMPLOYMENT_TYPES,
  FACT_FIND_FIELDS,
  INCOME_TYPES,
  WORK_ARRANGEMENTS,
} from "@/lib/portals/mortgage";
import {
  NOTIFICATION_METHODS,
  REMINDER_OWNERS,
  REMINDER_STATUSES,
  REMINDER_TYPES,
} from "@/lib/reminders/types";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from "@/lib/tasks/types";
import type { FilterFieldDef, FilterSystemGroup } from "@/lib/filters/types";

export const SYSTEM_DEFINED_OPTIONS = [
  "Record Action",
  "Related Records Action",
  "Touched Records",
  "Untouched Records",
] as const;

export const WEBSITE_ACTIVITY_FIELDS: FilterFieldDef[] = [
  { id: "web.lastVisited", label: "Last visited page", type: "text" },
  { id: "web.visitCount", label: "Visit count", type: "number" },
  { id: "web.formSubmitted", label: "Form submitted", type: "select", options: ["Yes", "No"] },
  { id: "web.chatStarted", label: "Chat started", type: "select", options: ["Yes", "No"] },
  { id: "web.lastActivity", label: "Last website activity", type: "date" },
];

const SKIP_FACT_FIND = new Set([
  "employmentsJson",
  "incomesJson",
  "liabilitiesJson",
  "propertiesJson",
  "vehiclesJson",
  "currentAddressGeo",
  "postalAddressGeo",
  "previousAddressGeo",
  "propertySearchGeo",
  "droppedEmploymentIncomeIds",
]);

function customToFields(defs: CustomFieldDef[]): FilterFieldDef[] {
  return defs.map((def) => ({
    id: `cf:${def.key}`,
    label: def.label,
    type:
      def.type === "number"
        ? "number"
        : def.type === "date"
          ? "date"
          : def.type === "select"
            ? "select"
            : "text",
    options: def.options,
  }));
}

function sortFields(fields: FilterFieldDef[]) {
  return [...fields].sort((a, b) => a.label.localeCompare(b.label));
}

function factFindFields(role: "primary" | "secondary"): FilterFieldDef[] {
  const prefix = role === "secondary" ? "2nd " : "";
  const idPrefix = role === "secondary" ? "secondary." : "";
  return FACT_FIND_FIELDS.filter((field) => !SKIP_FACT_FIND.has(field.id)).map(
    (field) => ({
      id: `${idPrefix}${field.id}`,
      label: `${prefix}${field.label}`,
      type:
        field.control === "money"
          ? "money"
          : field.type === "number"
            ? "number"
            : field.type === "date"
              ? "date"
              : field.type === "select"
                ? "select"
                : "text",
      options: field.options,
    }),
  );
}

function employmentSlots(role: "primary" | "secondary"): FilterFieldDef[] {
  const prefix = role === "secondary" ? "2nd " : "";
  const idPrefix = role === "secondary" ? "secondary.slot" : "slot";
  const rows: FilterFieldDef[] = [];
  for (const n of [1, 2] as const) {
    rows.push(
      {
        id: `${idPrefix}.income.${n}.amount`,
        label: `${prefix}Annual Income ${n}`,
        type: "money",
      },
      {
        id: `${idPrefix}.income.${n}.type`,
        label: `${prefix}Income Type ${n}`,
        type: "select",
        options: INCOME_TYPES,
      },
      {
        id: `${idPrefix}.emp.${n}.status`,
        label: `${prefix}Employment Status ${n}`,
        type: "select",
        options: ["Current", "Previous"],
      },
      {
        id: `${idPrefix}.emp.${n}.type`,
        label: `${prefix}Employment Type ${n}`,
        type: "select",
        options: EMPLOYMENT_TYPES,
      },
      {
        id: `${idPrefix}.emp.${n}.employer`,
        label: `${prefix}Employer Name ${n}`,
        type: "text",
      },
      {
        id: `${idPrefix}.emp.${n}.occupation`,
        label: `${prefix}Job Title ${n}`,
        type: "text",
      },
      {
        id: `${idPrefix}.emp.${n}.workArrangement`,
        label: `${prefix}Work Arrangement ${n}`,
        type: "select",
        options: WORK_ARRANGEMENTS,
      },
    );
  }
  return rows;
}

const LEAD_CRM_FIELDS: FilterFieldDef[] = [
  { id: "name", label: "Lead Name", type: "text" },
  { id: "email", label: "Email", type: "text" },
  { id: "phone", label: "Phone", type: "text" },
  { id: "mobilePhone", label: "Mobile Phone", type: "text" },
  { id: "company", label: "Company", type: "text" },
  { id: "companyWebsite", label: "Company Website", type: "text" },
  { id: "industry", label: "Industry", type: "text" },
  { id: "companySize", label: "Company Size", type: "text" },
  { id: "jobTitle", label: "Job Title", type: "text" },
  { id: "department", label: "Department", type: "text" },
  { id: "source", label: "Lead Source", type: "select", options: LEAD_SOURCES },
  { id: "status", label: "Lead Status", type: "select", options: LEAD_STATUSES },
  {
    id: "pipelineStage",
    label: "Pipeline Stage",
    type: "select",
    options: LEAD_PIPELINE_STAGES,
  },
  { id: "owner", label: "Owner", type: "select", options: ACTIVITY_OWNERS },
  { id: "createdDate", label: "Created Date", type: "date" },
  { id: "modifiedDate", label: "Modified Date", type: "date" },
  { id: "notes", label: "Notes", type: "text" },
  { id: "description", label: "Description", type: "text" },
  { id: "productInterest", label: "Product Interest", type: "text" },
  { id: "budgetRange", label: "Budget Range", type: "text" },
  { id: "estimatedValue", label: "Estimated Value", type: "money" },
  { id: "tags", label: "Tags", type: "text" },
  { id: "city", label: "City", type: "text" },
  { id: "state", label: "State", type: "text" },
  { id: "country", label: "Country", type: "text" },
  { id: "street", label: "Street", type: "text" },
  { id: "postalCode", label: "Postal Code", type: "text" },
  { id: "linkedinUrl", label: "LinkedIn URL", type: "text" },
  { id: "websiteUrl", label: "Website URL", type: "text" },
  { id: "lifecycleStage", label: "Lifecycle Stage", type: "text" },
  { id: "rating", label: "Rating", type: "text" },
  { id: "score", label: "Score", type: "number" },
];

export function leadFilterFields(custom: CustomFieldDef[] = []): FilterFieldDef[] {
  return sortFields([
    ...LEAD_CRM_FIELDS,
    ...factFindFields("primary"),
    ...factFindFields("secondary"),
    ...employmentSlots("primary"),
    ...employmentSlots("secondary"),
    ...customToFields(custom),
  ]);
}

export const LEAD_SYSTEM_GROUPS: FilterSystemGroup[] = [
  { id: "source", title: "Lead Source", options: LEAD_SOURCES },
  { id: "status", title: "Pipeline Stage", options: LEAD_PIPELINE_STAGES },
];

export const DEAL_FILTER_FIELDS: FilterFieldDef[] = sortFields([
  { id: "name", label: "Deal Name", type: "text" },
  { id: "account", label: "Account", type: "text" },
  { id: "contact", label: "Contact Name", type: "text" },
  { id: "value", label: "Deal Value", type: "money" },
  { id: "currency", label: "Currency", type: "select", options: DEAL_CURRENCIES },
  { id: "probability", label: "Probability", type: "number" },
  { id: "owner", label: "Owner", type: "select", options: ACTIVITY_OWNERS },
  { id: "closeDate", label: "Close Date", type: "date" },
  { id: "stage", label: "Stage", type: "text" },
  { id: "tags", label: "Tags", type: "text" },
  { id: "lostReason", label: "Lost Reason", type: "select", options: LOST_REASONS },
]);

export function dealFilterFields(custom: CustomFieldDef[] = []): FilterFieldDef[] {
  return sortFields([...DEAL_FILTER_FIELDS, ...customToFields(custom)]);
}

export const CONTACT_FILTER_FIELDS: FilterFieldDef[] = sortFields([
  { id: "name", label: "Contact Name", type: "text" },
  { id: "company", label: "Company", type: "text" },
  { id: "email", label: "Email", type: "text" },
  { id: "phone", label: "Phone", type: "text" },
  { id: "mobile", label: "Mobile", type: "text" },
  { id: "owner", label: "Owner", type: "select", options: ACTIVITY_OWNERS },
  { id: "source", label: "Lead Source", type: "select", options: CONTACT_SOURCES },
  { id: "status", label: "Status", type: "select", options: CONTACT_STATUSES },
  { id: "createdDate", label: "Created Date", type: "date" },
  { id: "tags", label: "Tags", type: "text" },
]);

export function contactFilterFields(custom: CustomFieldDef[] = []): FilterFieldDef[] {
  return sortFields([...CONTACT_FILTER_FIELDS, ...customToFields(custom)]);
}

export const CONTACT_SYSTEM_GROUPS: FilterSystemGroup[] = [
  { id: "source", title: "Lead Source", options: CONTACT_SOURCES },
  { id: "status", title: "Status", options: CONTACT_STATUSES },
];

export const COMPANY_FILTER_FIELDS: FilterFieldDef[] = sortFields([
  { id: "name", label: "Company Name", type: "text" },
  { id: "website", label: "Website", type: "text" },
  { id: "industry", label: "Industry", type: "text" },
  { id: "phone", label: "Phone", type: "text" },
  { id: "owner", label: "Owner", type: "select", options: ACTIVITY_OWNERS },
  { id: "annualRevenue", label: "Annual Revenue", type: "money" },
  { id: "city", label: "City", type: "text" },
  { id: "tags", label: "Tags", type: "text" },
  { id: "status", label: "Status", type: "select", options: COMPANY_STATUSES },
]);

export const COMPANY_SYSTEM_GROUPS: FilterSystemGroup[] = [
  { id: "status", title: "Status", options: COMPANY_STATUSES },
];

export const TASK_FILTER_FIELDS: FilterFieldDef[] = sortFields([
  { id: "title", label: "Task Name", type: "text" },
  { id: "taskId", label: "Task ID", type: "text" },
  { id: "taskType", label: "Task Type", type: "select", options: TASK_TYPES },
  { id: "priority", label: "Priority", type: "select", options: TASK_PRIORITIES },
  { id: "status", label: "Status", type: "select", options: TASK_STATUSES },
  { id: "dueDate", label: "Due Date", type: "date" },
  { id: "assignedTo", label: "Assigned To", type: "select", options: ACTIVITY_OWNERS },
  { id: "relatedTo", label: "Related To", type: "text" },
  { id: "reminderDate", label: "Reminder Date", type: "date" },
  { id: "createdBy", label: "Created By", type: "select", options: ACTIVITY_OWNERS },
  { id: "createdOn", label: "Created On", type: "date" },
  { id: "modifiedBy", label: "Modified By", type: "select", options: ACTIVITY_OWNERS },
  { id: "modifiedOn", label: "Modified On", type: "date" },
  { id: "description", label: "Description", type: "text" },
  { id: "notes", label: "Notes", type: "text" },
  { id: "completedBy", label: "Completed By", type: "text" },
  { id: "completedDate", label: "Completed Date", type: "date" },
  { id: "collaborators", label: "Collaborators", type: "text" },
]);

export const TASK_SYSTEM_GROUPS: FilterSystemGroup[] = [
  { id: "status", title: "Status", options: TASK_STATUSES },
  { id: "priority", title: "Priority", options: TASK_PRIORITIES },
  { id: "type", title: "Task Type", options: TASK_TYPES },
];

export const CALL_FILTER_FIELDS: FilterFieldDef[] = sortFields([
  { id: "subject", label: "Subject", type: "text" },
  { id: "relatedTo", label: "Related To", type: "text" },
  { id: "contact", label: "Contact", type: "text" },
  { id: "callFor", label: "Call For", type: "text" },
  { id: "fromNumber", label: "From Number", type: "text" },
  { id: "callType", label: "Call Type", type: "select", options: CALL_TYPES },
  { id: "status", label: "Status", type: "select", options: CALL_STAGES },
  { id: "date", label: "Date", type: "date" },
  { id: "duration", label: "Duration", type: "text" },
  { id: "notes", label: "Notes", type: "text" },
  { id: "agenda", label: "Agenda", type: "text" },
  { id: "purpose", label: "Purpose", type: "select", options: CALL_PURPOSES },
  { id: "assignedTo", label: "Assigned To", type: "select", options: ACTIVITY_OWNERS },
  { id: "calledBy", label: "Called By", type: "select", options: ACTIVITY_OWNERS },
  { id: "outcome", label: "Outcome", type: "text" },
  { id: "createdBy", label: "Created By", type: "select", options: ACTIVITY_OWNERS },
  { id: "createdOn", label: "Created On", type: "date" },
]);

export const CALL_SYSTEM_GROUPS: FilterSystemGroup[] = [
  { id: "status", title: "Status", options: CALL_STAGES },
  { id: "type", title: "Call Type", options: CALL_TYPES },
];

export const MEETING_FILTER_FIELDS: FilterFieldDef[] = sortFields([
  { id: "title", label: "Meeting Title", type: "text" },
  { id: "type", label: "Meeting Type", type: "select", options: MEETING_TYPES },
  { id: "status", label: "Meeting Status", type: "select", options: MEETING_STATUSES },
  { id: "relatedTo", label: "Related To", type: "text" },
  { id: "organizer", label: "Host", type: "text" },
  { id: "attendees", label: "Participants", type: "text" },
  { id: "startDateTime", label: "Start Time", type: "date" },
  { id: "endDateTime", label: "End Time", type: "date" },
  { id: "location", label: "Location", type: "text" },
  { id: "meetingLink", label: "Meeting Link", type: "text" },
  { id: "agenda", label: "Agenda", type: "text" },
  { id: "notes", label: "Notes", type: "text" },
]);

export const MEETING_SYSTEM_GROUPS: FilterSystemGroup[] = [
  { id: "status", title: "Meeting Status", options: MEETING_STATUSES },
  { id: "type", title: "Meeting Type", options: MEETING_TYPES },
];

export const NOTE_FILTER_FIELDS: FilterFieldDef[] = sortFields([
  { id: "title", label: "Title", type: "text" },
  { id: "body", label: "Note Body", type: "text" },
  { id: "noteType", label: "Note Type", type: "select", options: NOTE_TYPES },
  { id: "relatedTo", label: "Related To", type: "text" },
  { id: "createdBy", label: "Created By", type: "text" },
  { id: "createdAt", label: "Created Time", type: "date" },
  { id: "updatedBy", label: "Modified By", type: "text" },
  { id: "updatedAt", label: "Modified Time", type: "date" },
  { id: "isPinned", label: "Is Pinned", type: "select", options: ["Yes", "No"] },
  { id: "isPrivate", label: "Is Private", type: "select", options: ["Yes", "No"] },
  { id: "owner", label: "Owner", type: "text" },
]);

export const NOTE_SYSTEM_GROUPS: FilterSystemGroup[] = [
  { id: "type", title: "Note Type", options: NOTE_TYPES },
  { id: "flags", title: "Flags", options: ["Pinned", "Private"] },
];

export const MESSAGE_FILTER_FIELDS: FilterFieldDef[] = sortFields([
  { id: "subject", label: "Subject", type: "text" },
  { id: "body", label: "Body", type: "text" },
  { id: "type", label: "Type", type: "select", options: MESSAGE_TYPES },
  { id: "status", label: "Status", type: "select", options: MESSAGE_STATUSES },
  { id: "from", label: "From", type: "text" },
  { id: "to", label: "To", type: "text" },
  { id: "relatedTo", label: "Related To", type: "text" },
  { id: "sentDate", label: "Sent Date", type: "date" },
  { id: "template", label: "Template", type: "text" },
]);

export const MESSAGE_SYSTEM_GROUPS: FilterSystemGroup[] = [
  { id: "type", title: "Type", options: MESSAGE_TYPES },
  { id: "status", title: "Status", options: MESSAGE_STATUSES },
];

const EMAIL_STATUS_OPTIONS = [
  "Draft",
  "Scheduled",
  "Sent",
  "Delivered",
  "Opened",
  "Bounced",
  "Failed",
] as const;

const EMAIL_IMPORTANCE_OPTIONS = ["high", "normal", "low"] as const;

export const EMAIL_FILTER_FIELDS: FilterFieldDef[] = sortFields([
  { id: "subject", label: "Subject", type: "text" },
  { id: "body", label: "Body", type: "text" },
  { id: "from", label: "From", type: "text" },
  { id: "to", label: "To", type: "text" },
  { id: "relatedTo", label: "Related To", type: "text" },
  { id: "status", label: "Status", type: "select", options: EMAIL_STATUS_OPTIONS },
  { id: "templateUsed", label: "Template", type: "text" },
  {
    id: "importance",
    label: "Importance",
    type: "select",
    options: EMAIL_IMPORTANCE_OPTIONS,
  },
  { id: "sentDate", label: "Sent Date", type: "date" },
  { id: "openedDate", label: "Opened Date", type: "date" },
]);

export const EMAIL_SYSTEM_GROUPS: FilterSystemGroup[] = [
  { id: "status", title: "Status", options: EMAIL_STATUS_OPTIONS },
  { id: "flags", title: "Flags", options: ["Unread only", "Has attachment"] },
];

export const REMINDER_FILTER_FIELDS: FilterFieldDef[] = sortFields([
  { id: "title", label: "Reminder", type: "text" },
  { id: "relatedTo", label: "Related To", type: "text" },
  { id: "dateTime", label: "When", type: "date" },
  { id: "type", label: "Type", type: "select", options: REMINDER_TYPES },
  { id: "status", label: "Status", type: "select", options: REMINDER_STATUSES },
  {
    id: "notificationMethod",
    label: "Notification",
    type: "select",
    options: NOTIFICATION_METHODS,
  },
  { id: "owner", label: "Owner", type: "select", options: REMINDER_OWNERS },
]);

export const REMINDER_SYSTEM_GROUPS: FilterSystemGroup[] = [
  { id: "status", title: "Status", options: REMINDER_STATUSES },
  { id: "type", title: "Type", options: REMINDER_TYPES },
  { id: "method", title: "Notification", options: NOTIFICATION_METHODS },
  { id: "owner", title: "Owner", options: REMINDER_OWNERS },
];
