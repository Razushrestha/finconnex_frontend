/** SRS §14 Reports */

export type ReportType =
  | "Lead"
  | "Deal"
  | "Activity"
  | "Revenue"
  | "Pipeline"
  | "Conversion"
  | "Custom";

export type ReportSchedule = "None" | "Daily" | "Weekly" | "Monthly";

export type ReportStatus = "Draft" | "Ready" | "Scheduled" | "Running";

export interface ReportAuditEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
}

export interface ReportRow {
  label: string;
  value: number | string;
  secondary?: string;
}

export interface SavedReport {
  id: string;
  reportId: string;
  name: string;
  type: ReportType;
  status: ReportStatus;
  dataSource: string;
  dateRange: string;
  filters?: string;
  groupBy?: string;
  sortBy?: string;
  schedule: ReportSchedule;
  createdBy: string;
  createdAt: string;
  lastRunAt?: string;
  sharedWith?: string;
  previewRows: ReportRow[];
  audit: ReportAuditEvent[];
}

export const REPORT_TYPES: ReportType[] = [
  "Lead",
  "Deal",
  "Activity",
  "Revenue",
  "Pipeline",
  "Conversion",
  "Custom",
];

export const REPORT_SCHEDULES: ReportSchedule[] = [
  "None",
  "Daily",
  "Weekly",
  "Monthly",
];

export const REPORT_STATUSES: ReportStatus[] = [
  "Draft",
  "Ready",
  "Scheduled",
  "Running",
];

export const REPORT_DATA_SOURCES = [
  "Leads",
  "Deals",
  "Activities",
  "Invoices",
  "Campaigns",
  "Support Tickets",
  "Payments",
] as const;

export const REPORT_DATE_RANGES = [
  "Last 7 days",
  "Last 30 days",
  "This quarter",
  "This year",
  "Custom",
] as const;

export const REPORT_OWNERS = [
  "John Smith",
  "Tejas Gokhe",
  "Roshna Abraham",
  "Shiva Kadhka",
] as const;

const STORE_KEY = "reports:v1";

export function formatReportAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatReportDate(d = new Date()) {
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function previewForType(type: ReportType): ReportRow[] {
  switch (type) {
    case "Lead":
      return [
        { label: "New", value: 42, secondary: "This month" },
        { label: "Qualified", value: 18 },
        { label: "Converted", value: 9 },
        { label: "Unqualified", value: 6 },
      ];
    case "Deal":
      return [
        { label: "Open pipeline", value: "$1.24M" },
        { label: "Won", value: 14, secondary: "This quarter" },
        { label: "Lost", value: 5 },
        { label: "Avg deal size", value: "$86,400" },
      ];
    case "Activity":
      return [
        { label: "Calls completed", value: 128 },
        { label: "Meetings held", value: 47 },
        { label: "Tasks overdue", value: 11 },
        { label: "Notes logged", value: 203 },
      ];
    case "Revenue":
      return [
        { label: "Invoiced", value: "$412,500" },
        { label: "Collected", value: "$298,100" },
        { label: "Outstanding", value: "$114,400" },
        { label: "Overdue", value: "$22,800" },
      ];
    case "Pipeline":
      return [
        { label: "Qualification", value: 22 },
        { label: "Proposal", value: 15 },
        { label: "Negotiation", value: 8 },
        { label: "Closed Won", value: 14 },
      ];
    case "Conversion":
      return [
        { label: "Lead → Contact", value: "21%" },
        { label: "Contact → Deal", value: "34%" },
        { label: "Deal → Won", value: "28%" },
        { label: "Overall", value: "6.4%" },
      ];
    default:
      return [
        { label: "Metric A", value: 100 },
        { label: "Metric B", value: 64 },
        { label: "Metric C", value: 31 },
      ];
  }
}

export const savedReports: SavedReport[] = [
  {
    id: "rp1",
    reportId: "RPT-6001",
    name: "Monthly lead funnel",
    type: "Lead",
    status: "Ready",
    dataSource: "Leads",
    dateRange: "Last 30 days",
    filters: "Status ≠ Unqualified",
    groupBy: "Status",
    sortBy: "Count desc",
    schedule: "Monthly",
    createdBy: "John Smith",
    createdAt: "01/07/2026",
    lastRunAt: "20/07/2026 08:00",
    sharedWith: "Sales team",
    previewRows: previewForType("Lead"),
    audit: [
      { id: "a1", at: "01/07/2026 10:00", action: "Created", actor: "John Smith" },
      { id: "a2", at: "01/07/2026 10:20", action: "Scheduled Monthly", actor: "John Smith" },
      { id: "a3", at: "20/07/2026 08:00", action: "Run completed", actor: "System" },
    ],
  },
  {
    id: "rp2",
    reportId: "RPT-6002",
    name: "Q3 revenue collected",
    type: "Revenue",
    status: "Scheduled",
    dataSource: "Invoices",
    dateRange: "This quarter",
    groupBy: "Owner",
    sortBy: "Collected desc",
    schedule: "Weekly",
    createdBy: "Tejas Gokhe",
    createdAt: "10/07/2026",
    lastRunAt: "19/07/2026 09:00",
    previewRows: previewForType("Revenue"),
    audit: [
      { id: "a1", at: "10/07/2026 11:00", action: "Created", actor: "Tejas Gokhe" },
      { id: "a2", at: "10/07/2026 11:15", action: "Scheduled Weekly", actor: "Tejas Gokhe" },
    ],
  },
  {
    id: "rp3",
    reportId: "RPT-6003",
    name: "Pipeline by stage",
    type: "Pipeline",
    status: "Ready",
    dataSource: "Deals",
    dateRange: "This year",
    groupBy: "Stage",
    schedule: "None",
    createdBy: "Roshna Abraham",
    createdAt: "15/07/2026",
    lastRunAt: "18/07/2026 14:30",
    previewRows: previewForType("Pipeline"),
    audit: [
      { id: "a1", at: "15/07/2026 09:00", action: "Created", actor: "Roshna Abraham" },
      { id: "a2", at: "18/07/2026 14:30", action: "Run completed", actor: "Roshna Abraham" },
    ],
  },
  {
    id: "rp4",
    reportId: "RPT-6004",
    name: "Support resolution draft",
    type: "Custom",
    status: "Draft",
    dataSource: "Support Tickets",
    dateRange: "Last 30 days",
    filters: "Status = Resolved OR Closed",
    schedule: "None",
    createdBy: "Shiva Kadhka",
    createdAt: "21/07/2026",
    previewRows: [
      { label: "Resolved", value: 24 },
      { label: "Closed", value: 18 },
      { label: "Avg hours to resolve", value: 16.5 },
      { label: "CSAT", value: "4.5 / 5" },
    ],
    audit: [
      { id: "a1", at: "21/07/2026 10:00", action: "Created", actor: "Shiva Kadhka" },
    ],
  },
  {
    id: "rp5",
    reportId: "RPT-6005",
    name: "Activity load by owner",
    type: "Activity",
    status: "Ready",
    dataSource: "Activities",
    dateRange: "Last 7 days",
    groupBy: "Assigned To",
    schedule: "Daily",
    createdBy: "John Smith",
    createdAt: "05/07/2026",
    lastRunAt: "21/07/2026 07:00",
    sharedWith: "Managers",
    previewRows: previewForType("Activity"),
    audit: [
      { id: "a1", at: "05/07/2026 12:00", action: "Created", actor: "John Smith" },
      { id: "a2", at: "05/07/2026 12:10", action: "Scheduled Daily", actor: "John Smith" },
      { id: "a3", at: "21/07/2026 07:00", action: "Run completed", actor: "System" },
    ],
  },
];

function readStore(): SavedReport[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as SavedReport[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: SavedReport[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listReports(): SavedReport[] {
  return (
    readStore() ??
    savedReports.map((r) => ({
      ...r,
      previewRows: r.previewRows.map((p) => ({ ...p })),
      audit: r.audit.map((a) => ({ ...a })),
    }))
  );
}

export function upsertReport(r: SavedReport) {
  const list = listReports();
  const i = list.findIndex((x) => x.id === r.id);
  if (i >= 0) list[i] = r;
  else list.unshift(r);
  writeStore(list);
  return r;
}

export function deleteReport(id: string) {
  writeStore(listReports().filter((r) => r.id !== id));
}

export function getReportById(id: string) {
  return listReports().find((r) => r.id === id);
}

export function nextReportIds() {
  const list = listReports();
  const nums = list
    .map((r) => Number(r.reportId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 6000) + 1;
  return { id: `rp-${Date.now()}`, reportId: `RPT-${n}` };
}

export function appendReportAudit(
  r: SavedReport,
  action: string,
  actor: string,
): SavedReport {
  return {
    ...r,
    audit: [
      ...r.audit,
      { id: `a-${Date.now()}`, at: formatReportAt(), action, actor },
    ],
  };
}

export function buildPreviewRows(type: ReportType): ReportRow[] {
  return previewForType(type);
}

export const REPORT_STATUS_STYLE: Record<ReportStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Ready: "bg-emerald-50 text-emerald-700",
  Scheduled: "bg-sky-50 text-sky-700",
  Running: "bg-amber-50 text-amber-800",
};
