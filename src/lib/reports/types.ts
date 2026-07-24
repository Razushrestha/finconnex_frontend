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
  /** When dateRange is Custom */
  customFrom?: string;
  customTo?: string;
  filters?: string;
  groupBy?: string;
  sortBy?: string;
  schedule: ReportSchedule;
  createdBy: string;
  createdAt: string;
  lastRunAt?: string;
  sharedWith?: string;
  emailedTo?: string;
  isTemplate?: boolean;
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

export const REPORT_GROUP_BY = [
  "Status",
  "Owner",
  "Stage",
  "Source",
  "Assigned To",
  "Month",
  "Client",
] as const;

export const REPORT_SORT_BY = [
  "Count desc",
  "Count asc",
  "Name asc",
  "Amount desc",
  "Date desc",
  "Collected desc",
] as const;

export const REPORT_FILTER_PRESETS = [
  "Status ≠ Unqualified",
  "Status = Open",
  "Owner = Me",
  "Amount > 0",
  "Overdue only",
] as const;

export const REPORT_SHARE_TARGETS = [
  "Managers",
  "Sales team",
  "Finance",
  "Leadership",
] as const;

export const REPORT_TYPE_STYLE: Record<ReportType, string> = {
  Lead: "bg-sky-50 text-sky-700",
  Deal: "bg-violet-50 text-violet-700",
  Activity: "bg-amber-50 text-amber-800",
  Revenue: "bg-emerald-50 text-emerald-700",
  Pipeline: "bg-indigo-50 text-indigo-700",
  Conversion: "bg-rose-50 text-rose-700",
  Custom: "bg-slate-100 text-slate-600",
};

export function resolveDateRangeLabel(r: SavedReport) {
  if (r.dateRange === "Custom" && (r.customFrom || r.customTo)) {
    return `${r.customFrom ?? "…"} → ${r.customTo ?? "…"}`;
  }
  return r.dateRange;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportReportCsv(r: SavedReport) {
  const meta = [
    ["Report ID", r.reportId],
    ["Name", r.name],
    ["Type", r.type],
    ["Data Source", r.dataSource],
    ["Date Range", resolveDateRangeLabel(r)],
    ["Filters", r.filters ?? ""],
    ["Group By", r.groupBy ?? ""],
    ["Sort By", r.sortBy ?? ""],
    ["Schedule", r.schedule],
    ["Created By", r.createdBy],
    ["Last Run", r.lastRunAt ?? ""],
  ];
  const header = ["Label", "Value", "Secondary"];
  const body = r.previewRows.map((row) =>
    [row.label, row.value, row.secondary ?? ""]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  const metaLines = meta.map(
    ([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`,
  );
  const blob = new Blob(
    [[...metaLines, "", header.join(","), ...body].join("\n")],
    { type: "text/csv" },
  );
  downloadBlob(blob, `${r.reportId}.csv`);
}

/** Spreadsheet-friendly Excel export (HTML table → .xls) */
export function exportReportExcel(r: SavedReport) {
  const rows = r.previewRows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(String(row.label))}</td><td>${escapeHtml(String(row.value))}</td><td>${escapeHtml(row.secondary ?? "")}</td></tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(r.name)}</title></head><body>
<h2>${escapeHtml(r.reportId)}: ${escapeHtml(r.name)}</h2>
<p>Type: ${escapeHtml(r.type)} · Source: ${escapeHtml(r.dataSource)} · Range: ${escapeHtml(resolveDateRangeLabel(r))}</p>
<table border="1"><thead><tr><th>Label</th><th>Value</th><th>Secondary</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  downloadBlob(
    new Blob([html], { type: "application/vnd.ms-excel" }),
    `${r.reportId}.xls`,
  );
}

/** Printable PDF-style HTML download (open/print as PDF) */
export function exportReportPdf(r: SavedReport) {
  const rows = r.previewRows
    .map(
      (row) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(String(row.label))}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${escapeHtml(String(row.value))}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">${escapeHtml(row.secondary ?? "")}</td></tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(r.reportId)}</title>
<style>body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:40px auto;color:#0f172a}
h1{font-size:22px;margin:0} .meta{color:#64748b;font-size:12px;margin:8px 0 24px}
table{width:100%;border-collapse:collapse;font-family:system-ui,sans-serif;font-size:13px}
th{text-align:left;padding:8px;border-bottom:2px solid #cbd5e1;color:#64748b;font-size:11px;text-transform:uppercase}
.badge{display:inline-block;background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}</style></head><body>
<p class="badge">FinConnex · §14 Report</p>
<h1>${escapeHtml(r.name)}</h1>
<p class="meta">${escapeHtml(r.reportId)} · ${escapeHtml(r.type)} · ${escapeHtml(r.dataSource)} · ${escapeHtml(resolveDateRangeLabel(r))}<br/>Created by ${escapeHtml(r.createdBy)}${r.lastRunAt ? ` · Last run ${escapeHtml(r.lastRunAt)}` : ""}</p>
<table><thead><tr><th>Metric</th><th>Value</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TEMPLATE_KEY = "reports:templates:v1";

function readTemplates(): SavedReport[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TEMPLATE_KEY);
    return raw ? (JSON.parse(raw) as SavedReport[]) : null;
  } catch {
    return null;
  }
}

function writeTemplates(list: SavedReport[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TEMPLATE_KEY, JSON.stringify(list));
}

export function listReportTemplates(): SavedReport[] {
  return readTemplates() ?? [];
}

export function saveReportAsTemplate(r: SavedReport, actor: string) {
  const ids = nextReportIds();
  const tpl: SavedReport = {
    ...r,
    id: ids.id,
    reportId: ids.reportId,
    name: `${r.name} (template)`,
    status: "Draft",
    schedule: "None",
    isTemplate: true,
    lastRunAt: undefined,
    createdAt: formatReportDate(),
    previewRows: r.previewRows.map((p) => ({ ...p })),
    audit: [
      {
        id: `a-${Date.now()}`,
        at: formatReportAt(),
        action: "Saved as template",
        actor,
      },
    ],
  };
  const list = listReportTemplates();
  list.unshift(tpl);
  writeTemplates(list);
  return tpl;
}

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
