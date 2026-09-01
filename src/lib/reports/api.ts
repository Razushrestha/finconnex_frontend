import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmErrorMessage, crmFetch } from "@/lib/crm/request";
import {
  formatFilterLabel,
  inferDateRangePreset,
  normalizeDataSourceId,
  resolveApiDateRange,
  toApiField,
  toApiSortBy,
} from "@/lib/reports/catalog";
import {
  buildPreviewRows,
  formatReportAt,
  formatReportDate,
  upsertReport,
  type ReportFilter,
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

function apiSchedule(schedule: ReportSchedule): string | undefined {
  if (schedule === "None") return undefined;
  return schedule.toUpperCase();
}

function asDefinition(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function parseFilters(
  raw: unknown,
): { field?: string; operator?: ReportFilter["operator"]; value?: string } {
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object") {
    const first = raw[0] as Record<string, unknown>;
    return {
      field: pickStr(first.field) || undefined,
      operator: (pickStr(first.operator, "eq") || "eq") as ReportFilter["operator"],
      value: String(first.value ?? ""),
    };
  }
  return {};
}

function rowsToPreview(raw: unknown, type: ReportType): ReportRow[] {
  const records = extractRecords(raw);
  if (!records.length) return buildPreviewRows(type);
  return records.map((row, index) => {
    const keys = Object.keys(row).filter((key) => key !== "id");
    const labelKey = keys.find((key) => key !== "count") ?? keys[0];
    const valueKey = keys.includes("count") ? "count" : keys[1] ?? keys[0];
    return {
      label: pickStr(row.label, row.name, labelKey ? row[labelKey] : "", `Row ${index + 1}`),
      value:
        typeof row[valueKey] === "number" && Number.isFinite(row[valueKey])
          ? (row[valueKey] as number)
          : pickStr(row.value, row.count, row.amount, row.total, valueKey ? row[valueKey] : "—"),
      secondary: pickStr(row.secondary, row.note, row.period) || undefined,
    };
  });
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
  const definition = asDefinition(raw.definition);
  const filters = parseFilters(raw.filters);
  const dataSource = normalizeDataSourceId(
    pickStr(raw.dataSource, raw.source, raw.entity, "leads"),
  );
  const dateRange = inferDateRangePreset(
    pickStr(definition.dateRangePreset) || raw.dateRange,
  );
  return {
    id,
    reportId,
    name: pickStr(raw.name, raw.title, raw.subject, "Report"),
    type,
    status: mapReportStatus(
      pickStr(
        raw.status,
        raw.state,
        pickStr(raw.schedule) && pickStr(raw.schedule) !== "NONE"
          ? "SCHEDULED"
          : "READY",
      ),
    ),
    dataSource,
    dateRange,
    customFrom: pickStr(raw.customFrom, raw.from, definition.customFrom) || undefined,
    customTo: pickStr(raw.customTo, raw.to, definition.customTo) || undefined,
    filters:
      formatFilterLabel(filters.field, filters.operator, filters.value) ||
      pickStr(raw.filter) ||
      undefined,
    filterField: filters.field,
    filterOperator: filters.operator,
    filterValue: filters.value,
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
    lastRunAt:
      formatAt(
        definition.lastRunAt ?? raw.lastRunAt ?? raw.ranAt ?? raw.executedAt,
      ) || undefined,
    sharedWith:
      pickStr(definition.sharedWith, raw.sharedWith) || undefined,
    emailedTo: pickStr(definition.emailedTo, raw.emailedTo, raw.emailTo) || undefined,
    isTemplate: Boolean(raw.isTemplate ?? raw.template),
    previewRows: rowsToPreview(
      raw.previewRows ?? raw.results ?? raw.metrics ?? raw.rows ?? raw.data,
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
  const payload = await reportsRequest(`/${id}/run`, {
    method: "POST",
    body: "{}",
  });
  const report = await getCrmReport(id);
  if (!report) return asReport(payload);
  const rec = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return {
    ...report,
    status: report.schedule === "None" ? "Ready" : "Scheduled",
    lastRunAt: formatAt(rec.generatedAt) || formatReportAt(),
    previewRows: rowsToPreview(rec.rows ?? rec, report.type),
  };
}

export async function exportCrmReport(
  id: string,
  format?: string,
): Promise<Blob> {
  const q = format ? `?format=${encodeURIComponent(format)}` : "";
  const payload = await reportsRequest(`/${id}/export${q}`);
  if (payload && typeof payload === "object") {
    const rec = payload as Record<string, unknown>;
    if (typeof rec.data === "string") {
      const binary = atob(rec.data);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: pickStr(rec.contentType) || "application/octet-stream",
      });
      Object.assign(blob, { filename: pickStr(rec.filename) });
      return blob;
    }
  }
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

export async function emailCrmReport(
  id: string,
  to: string,
  format = "csv",
): Promise<void> {
  await reportsRequest(`/${id}/email`, {
    method: "POST",
    body: JSON.stringify({ to, format }),
  });
}

export async function shareCrmReport(
  id: string,
  sharedWith: string,
): Promise<SavedReport | null> {
  return asReport(
    await reportsRequest(`/${id}/share`, {
      method: "POST",
      body: JSON.stringify({ sharedWith }),
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
  filterField?: string;
  filterOperator?: ReportFilter["operator"];
  filterValue?: string;
  groupBy?: string;
  sortBy?: string;
  schedule: ReportSchedule;
  status: ReportStatus;
  sharedWith?: string;
  reportCode?: string;
}): Record<string, unknown> {
  const dataSource = normalizeDataSourceId(input.dataSource);
  const groupBy = toApiField(dataSource, input.groupBy);
  const sortBy = toApiSortBy(dataSource, input.sortBy);
  const field =
    input.filterField ||
    (input.filters ? toApiField(dataSource, input.filters.split(" ")[0]) : undefined);
  const operator = input.filterOperator;
  const value = input.filterValue;
  const filters =
    field && operator && value
      ? [{ field, operator, value }]
      : undefined;
  const schedule = apiSchedule(input.schedule);
  return {
    name: input.name,
    reportType: apiType(input.type),
    dataSource,
    dateRange: resolveApiDateRange(
      input.dateRange,
      input.customFrom,
      input.customTo,
    ),
    dateRangePreset: input.dateRange,
    ...(filters ? { filters } : {}),
    ...(groupBy ? { groupBy } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(schedule ? { schedule } : {}),
    ...(input.sharedWith ? { sharedWith: input.sharedWith } : {}),
    ...(input.reportCode ? { reportCode: input.reportCode } : {}),
  };
}

export function toUpdateReportBody(
  input: Parameters<typeof toCreateReportBody>[0],
): Record<string, unknown> {
  const body = toCreateReportBody(input);
  if (input.schedule === "None") body.schedule = null;
  return body;
}

export function isCrmReportId(id: string): boolean {
  return isUuid(id);
}
