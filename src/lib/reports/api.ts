import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmErrorMessage, crmFetch, unwrapCrmData } from "@/lib/crm/request";
import {
  buildPreviewRows,
  formatReportAt,
  formatReportDate,
  upsertReport,
  type ReportRow,
  type ReportSchedule,
  type ReportStatus,
  type ReportType,
  type SavedReport,
} from "@/lib/reports/types";

export type CrmReportQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function reportsPath(suffix = ""): string {
  return `/v1/reports${suffix}`;
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of [
      "items",
      "reports",
      "records",
      "rows",
      "result",
      "results",
    ]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

function formatDate(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString("en-AU");
}

function formatAt(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return formatReportAt(new Date(parsed));
}

export function mapReportType(raw: string): ReportType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("lead")) return "Lead";
  if (value.includes("deal")) return "Deal";
  if (value.includes("activ")) return "Activity";
  if (value.includes("revenu")) return "Revenue";
  if (value.includes("pipeline")) return "Pipeline";
  if (value.includes("convers")) return "Conversion";
  if (value.includes("custom")) return "Custom";
  return "Custom";
}

export function mapReportStatus(raw: string): ReportStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("run")) return "Running";
  if (value.includes("schedul")) return "Scheduled";
  if (value.includes("ready") || value.includes("active")) return "Ready";
  return "Draft";
}

export function mapReportSchedule(raw: string): ReportSchedule {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("daily")) return "Daily";
  if (value.includes("week")) return "Weekly";
  if (value.includes("month")) return "Monthly";
  return "None";
}

function apiType(type: ReportType): string {
  return type.toUpperCase();
}

function apiStatus(status: ReportStatus): string {
  return status.toUpperCase();
}

function apiSchedule(schedule: ReportSchedule): string {
  return schedule.toUpperCase();
}

function mapPreviewRows(raw: unknown, type: ReportType): ReportRow[] {
  const records = extractRecords(raw);
  if (!records.length) return buildPreviewRows(type);
  return records.map((row) => ({
    label: pickStr(row.label, row.name, row.metric, row.key, "Metric"),
    value:
      typeof row.value === "number" && Number.isFinite(row.value)
        ? row.value
        : pickStr(row.value, row.count, row.amount, row.total, "—"),
    secondary: pickStr(row.secondary, row.note, row.period) || undefined,
  }));
}

export function normalizeReport(
  raw: Record<string, unknown>,
  index: number,
): SavedReport {
  const createdBy =
    raw.createdBy && typeof raw.createdBy === "object"
      ? (raw.createdBy as Record<string, unknown>)
      : null;
  const type = mapReportType(pickStr(raw.type, raw.reportType, "CUSTOM"));
  const id = pickStr(raw.id, raw.uuid, raw.reportId) || `crm-rpt-${index}`;
  const reportId = pickStr(
    raw.number,
    raw.code,
    raw.reference,
    raw.reportNumber,
    typeof raw.reportId === "string" && !isUuid(raw.reportId)
      ? raw.reportId
      : "",
    `RPT-${index + 1}`,
  );
  return {
    id,
    reportId,
    name: pickStr(raw.name, raw.title, raw.subject, "Report"),
    type,
    status: mapReportStatus(pickStr(raw.status, raw.state, "DRAFT")),
    dataSource: pickStr(raw.dataSource, raw.source, raw.entity, "Leads"),
    dateRange: pickStr(raw.dateRange, raw.range, raw.period, "Last 30 days"),
    customFrom: pickStr(raw.customFrom, raw.from, raw.startDate) || undefined,
    customTo: pickStr(raw.customTo, raw.to, raw.endDate) || undefined,
    filters: pickStr(raw.filters, raw.filter) || undefined,
    groupBy: pickStr(raw.groupBy, raw.group) || undefined,
    sortBy: pickStr(raw.sortBy, raw.sort) || undefined,
    schedule: mapReportSchedule(pickStr(raw.schedule, raw.cadence, "NONE")),
    createdBy: pickStr(
      createdBy && pickStr(createdBy.name, createdBy.fullName),
      raw.createdByName,
      raw.ownerName,
      raw.owner,
      raw.createdBy,
      "—",
    ),
    createdAt: formatDate(raw.createdAt) || formatReportDate(),
    lastRunAt: formatAt(raw.lastRunAt ?? raw.ranAt ?? raw.executedAt) || undefined,
    sharedWith: pickStr(raw.sharedWith) || undefined,
    emailedTo: pickStr(raw.emailedTo, raw.emailTo) || undefined,
    isTemplate: Boolean(raw.isTemplate ?? raw.template),
    previewRows: mapPreviewRows(
      raw.previewRows ?? raw.results ?? raw.metrics ?? raw.data,
      type,
    ),
    audit: [],
  };
}

export function normalizeReports(data: unknown): SavedReport[] {
  return extractRecords(data).map((row, index) => normalizeReport(row, index));
}

async function reportsRequest(
  suffix: string,
  init?: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage reports");
  return crmFetch(auth, reportsPath(suffix), init);
}

async function reportsBlob(suffix: string): Promise<Blob> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to export a report");
  const res = await fetch(`${auth.baseUrl}${reportsPath(suffix)}`, {
    headers: {
      Accept: "application/octet-stream,text/csv,application/json,*/*",
      Authorization: `Bearer ${auth.accessToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    throw new Error(crmErrorMessage(json, `Export failed (${res.status})`));
  }
  return res.blob();
}

function asReport(data: unknown): SavedReport | null {
  const items = normalizeReports(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeReport(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmReports(
  query: CrmReportQuery = {},
): Promise<SavedReport[]> {
  return normalizeReports(
    await reportsRequest(
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
      }),
    ),
  );
}

export async function getCrmReport(id: string): Promise<SavedReport | null> {
  return asReport(await reportsRequest(`/${id}`));
}

export async function createCrmReport(
  body: Record<string, unknown>,
): Promise<SavedReport | null> {
  return asReport(
    await reportsRequest("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmReport(
  id: string,
  patch: Record<string, unknown>,
): Promise<SavedReport | null> {
  return asReport(
    await reportsRequest(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmReport(id: string): Promise<void> {
  await reportsRequest(`/${id}`, { method: "DELETE" });
}

export async function runCrmReport(id: string): Promise<SavedReport | null> {
  return asReport(
    await reportsRequest(`/${id}/run`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function exportCrmReport(
  id: string,
  format?: string,
): Promise<Blob> {
  const q = format ? `?format=${encodeURIComponent(format)}` : "";
  return reportsBlob(`/${id}/export${q}`);
}

export async function saveCrmReportAsTemplate(
  id: string,
): Promise<SavedReport | null> {
  return asReport(
    await reportsRequest(`/${id}/template`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function tryCrmReport<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteReport(row: SavedReport | null) {
  if (row) upsertReport(row);
  return row;
}

export function toCreateReportBody(input: {
  name: string;
  type: ReportType;
  dataSource: string;
  dateRange: string;
  customFrom?: string;
  customTo?: string;
  filters?: string;
  groupBy?: string;
  sortBy?: string;
  schedule: ReportSchedule;
  status: ReportStatus;
}): Record<string, unknown> {
  return {
    name: input.name,
    title: input.name,
    type: apiType(input.type),
    reportType: apiType(input.type),
    dataSource: input.dataSource,
    source: input.dataSource,
    dateRange: input.dateRange,
    range: input.dateRange,
    ...(input.customFrom ? { customFrom: input.customFrom, from: input.customFrom } : {}),
    ...(input.customTo ? { customTo: input.customTo, to: input.customTo } : {}),
    ...(input.filters ? { filters: input.filters } : {}),
    ...(input.groupBy ? { groupBy: input.groupBy } : {}),
    ...(input.sortBy ? { sortBy: input.sortBy } : {}),
    schedule: apiSchedule(input.schedule),
    status: apiStatus(input.status),
  };
}

export function isCrmReportId(id: string): boolean {
  return isUuid(id);
}
