export type ReportKind =
  | "Lead"
  | "Deal"
  | "Activity"
  | "Revenue"
  | "Pipeline"
  | "Conversion"
  | "Custom";
export const REPORT_DATA_SOURCE_OPTIONS = [
  { id: "leads", label: "Leads" },
  { id: "deals", label: "Deals" },
  { id: "activities", label: "Activities" },
  { id: "tasks", label: "Tasks" },
  { id: "meetings", label: "Meetings" },
  { id: "emails", label: "Emails" },
  { id: "tickets", label: "Support Tickets" },
  { id: "documents", label: "Documents" },
  { id: "contacts", label: "Contacts" },
  { id: "companies", label: "Companies" },
  { id: "campaigns", label: "Campaigns" },
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "quotes", label: "Quotes" },
  { id: "estimates", label: "Estimates" },
] as const;

export type ReportDataSourceId =
  (typeof REPORT_DATA_SOURCE_OPTIONS)[number]["id"];

export const REPORT_DATA_SOURCES = REPORT_DATA_SOURCE_OPTIONS.map(
  (item) => item.id,
);

export const REPORT_FILTER_OPERATORS = [
  { id: "eq", label: "equals" },
  { id: "neq", label: "does not equal" },
  { id: "gt", label: "greater than" },
  { id: "gte", label: "at least" },
  { id: "lt", label: "less than" },
  { id: "lte", label: "at most" },
  { id: "contains", label: "contains" },
] as const;

export type ReportFilterOperator =
  (typeof REPORT_FILTER_OPERATORS)[number]["id"];

const COMMON = [
  { id: "status", label: "Status" },
  { id: "createdAt", label: "Created date" },
] as const;

export const REPORT_FIELDS_BY_SOURCE: Record<
  string,
  Array<{ id: string; label: string }>
> = {
  leads: [
    { id: "status", label: "Status" },
    { id: "source", label: "Source" },
    { id: "isConverted", label: "Converted" },
    { id: "ownerId", label: "Owner" },
    { id: "createdAt", label: "Created date" },
  ],
  deals: [
    { id: "stage", label: "Stage" },
    { id: "source", label: "Source" },
    { id: "pipeline", label: "Pipeline" },
    { id: "ownerId", label: "Owner" },
    { id: "actualCloseDate", label: "Close date" },
    { id: "createdAt", label: "Created date" },
  ],
  activities: [
    { id: "type", label: "Type" },
    { id: "isDone", label: "Done" },
    { id: "ownerId", label: "Owner" },
    { id: "completedAt", label: "Completed" },
    { id: "createdAt", label: "Created date" },
  ],
  tasks: [
    { id: "taskType", label: "Task type" },
    { id: "status", label: "Status" },
    { id: "priority", label: "Priority" },
    { id: "createdById", label: "Created by" },
    { id: "dueDate", label: "Due date" },
    { id: "completedAt", label: "Completed" },
    { id: "createdAt", label: "Created date" },
  ],
  meetings: [
    { id: "status", label: "Status" },
    { id: "meetingType", label: "Meeting type" },
    { id: "organizerId", label: "Organizer" },
    { id: "startAt", label: "Start" },
    { id: "createdAt", label: "Created date" },
  ],
  emails: [
    { id: "status", label: "Status" },
    { id: "createdById", label: "Created by" },
    { id: "sentAt", label: "Sent" },
    { id: "createdAt", label: "Created date" },
  ],
  tickets: [
    { id: "status", label: "Status" },
    { id: "priority", label: "Priority" },
    { id: "assignedToId", label: "Assigned to" },
    { id: "resolvedAt", label: "Resolved" },
    { id: "createdAt", label: "Created date" },
  ],
  documents: [
    { id: "documentType", label: "Document type" },
    { id: "uploadedById", label: "Uploaded by" },
    { id: "createdAt", label: "Created date" },
  ],
  contacts: [
    { id: "status", label: "Status" },
    { id: "source", label: "Source" },
    { id: "ownerId", label: "Owner" },
    { id: "createdAt", label: "Created date" },
  ],
  companies: [
    { id: "status", label: "Status" },
    { id: "industry", label: "Industry" },
    { id: "ownerId", label: "Owner" },
    { id: "createdAt", label: "Created date" },
  ],
  campaigns: [
    { id: "status", label: "Status" },
    { id: "channel", label: "Channel" },
    { id: "campaignType", label: "Campaign type" },
    { id: "createdById", label: "Created by" },
    { id: "createdAt", label: "Created date" },
  ],
  invoices: [
    { id: "status", label: "Status" },
    { id: "currency", label: "Currency" },
    { id: "createdById", label: "Created by" },
    { id: "createdAt", label: "Created date" },
  ],
  payments: [
    { id: "status", label: "Status" },
    { id: "paymentMethod", label: "Payment method" },
    { id: "createdById", label: "Created by" },
    { id: "createdAt", label: "Created date" },
  ],
  quotes: [...COMMON, { id: "currency", label: "Currency" }],
  estimates: [...COMMON, { id: "currency", label: "Currency" }],
};

export const REPORT_TYPE_DEFAULT_SOURCE: Record<ReportKind, string> = {
  Lead: "leads",
  Deal: "deals",
  Activity: "activities",
  Revenue: "payments",
  Pipeline: "deals",
  Conversion: "leads",
  Custom: "leads",
};

export function labelForDataSource(id: string): string {
  const match = REPORT_DATA_SOURCE_OPTIONS.find(
    (item) => item.id === id || item.label.toLowerCase() === id.toLowerCase(),
  );
  return match?.label ?? id;
}

export function normalizeDataSourceId(raw: string): string {
  const value = raw.trim().toLowerCase();
  const match = REPORT_DATA_SOURCE_OPTIONS.find(
    (item) =>
      item.id === value ||
      item.label.toLowerCase() === value ||
      item.label.toLowerCase().replace(/s$/, "") === value,
  );
  if (match) return match.id;
  if (value.includes("ticket")) return "tickets";
  if (value.includes("invoice")) return "invoices";
  if (value.includes("payment") || value.includes("revenue")) return "payments";
  if (value.includes("pipeline")) return "deals";
  return value || "leads";
}

export function fieldsForSource(source: string) {
  return REPORT_FIELDS_BY_SOURCE[normalizeDataSourceId(source)] ?? [];
}

export function toApiField(source: string, raw?: string): string | undefined {
  if (!raw) return undefined;
  const fields = fieldsForSource(source);
  const match = fields.find(
    (field) =>
      field.id === raw || field.label.toLowerCase() === raw.toLowerCase(),
  );
  return match?.id;
}

export function sortOptionsForSource(source: string) {
  const fields = fieldsForSource(source);
  return [
    { id: "count:desc", label: "Count desc" },
    { id: "count:asc", label: "Count asc" },
    ...fields.flatMap((field) => [
      { id: `${field.id}:desc`, label: `${field.label} desc` },
      { id: `${field.id}:asc`, label: `${field.label} asc` },
    ]),
  ];
}

export function toApiSortBy(source: string, raw?: string): string | undefined {
  if (!raw) return undefined;
  const options = sortOptionsForSource(source);
  const match = options.find(
    (item) =>
      item.id === raw || item.label.toLowerCase() === raw.toLowerCase(),
  );
  if (match) return match.id;
  if (raw.toLowerCase().includes("count") && raw.toLowerCase().includes("desc"))
    return "count:desc";
  if (raw.toLowerCase().includes("date")) return "createdAt:desc";
  return undefined;
}

export function formatFilterLabel(
  field?: string,
  operator?: string,
  value?: string,
): string | undefined {
  if (!field || !operator || !value) return undefined;
  const op =
    REPORT_FILTER_OPERATORS.find((item) => item.id === operator)?.label ??
    operator;
  return `${field} ${op} ${value}`;
}

export function resolveApiDateRange(
  preset: string,
  customFrom?: string,
  customTo?: string,
): { startDate: string; endDate: string } {
  if (preset === "Custom" && customFrom && customTo) {
    return {
      startDate: new Date(`${customFrom}T00:00:00.000`).toISOString(),
      endDate: new Date(`${customTo}T23:59:59.999`).toISOString(),
    };
  }
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (preset === "Last 7 days") start.setDate(start.getDate() - 6);
  else if (preset === "This quarter") {
    const quarter = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(quarter, 1);
  } else if (preset === "This year") start.setMonth(0, 1);
  else start.setDate(start.getDate() - 29);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function inferDateRangePreset(
  raw: unknown,
  fallback = "Last 30 days",
): string {
  if (typeof raw === "string" && raw.trim()) {
    if (
      [
        "Last 7 days",
        "Last 30 days",
        "This quarter",
        "This year",
        "Custom",
      ].includes(raw)
    ) {
      return raw;
    }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const rec = raw as Record<string, unknown>;
    if (typeof rec.dateRangePreset === "string") return rec.dateRangePreset;
  }
  return fallback;
}
