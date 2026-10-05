import {
  ensureCrmSession,
  isBoundCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { partyName, relatedActivityLabel } from "@/lib/activities/party";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import {
  DOCUMENT_REQUEST_TYPES,
  progressForStatus,
  type DocumentRequest,
  type DocumentRequestStatus,
  type DocumentRequestType,
  type RequestedDocLine,
} from "@/lib/documents/requests/types";

export type CrmDocumentRequestQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  leadId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
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

export function workspaceDocumentRequestsPath(
  workspaceId: string,
  suffix = "",
): string {
  return `/v1/workspaces/${workspaceId}/document-requests${suffix}`;
}

export function globalDocumentRequestsPath(suffix = ""): string {
  return `/v1/document-requests${suffix}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** A document request carries its own `items` list. Do not treat those files as requests. */
function isDocumentRequestRow(rec: Record<string, unknown>) {
  return Boolean(
    pickStr(rec.id, rec.uuid, rec.documentRequestId) &&
      (rec.title != null || rec.requestedFromId != null),
  );
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(isRecord);
    }
    return data.filter(isRecord);
  }
  if (isRecord(data)) {
    if (isDocumentRequestRow(data)) return [data];
    for (const key of [
      "items",
      "documentRequests",
      "requests",
      "records",
      "rows",
      "result",
    ]) {
      if (Array.isArray(data[key])) return extractRecords(data[key]);
    }
    if (data.data != null && data.data !== data) return extractRecords(data.data);
  }
  return [];
}

export function mapDocumentRequestStatus(raw: string): DocumentRequestStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("approv") || value.includes("complete")) return "Approved";
  if (value.includes("reject")) return "Rejected";
  if (value.includes("expir") || value.includes("cancel")) return "Expired";
  if (value.includes("receiv") || value.includes("review")) return "Received";
  if (value.includes("pend") || value.includes("progress")) return "Pending";
  return "Requested";
}

export function apiDocumentRequestStatus(status: DocumentRequestStatus): string {
  return status.toUpperCase();
}

export function mapDocumentRequestType(raw: string): DocumentRequestType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  const hit = DOCUMENT_REQUEST_TYPES.find(
    (type) => type.toLowerCase() === value,
  );
  if (hit) return hit;
  if (value.includes("contract")) return "Contract";
  if (value.includes("propos")) return "Proposal";
  if (value.includes("id") || value.includes("identity")) return "ID Proof";
  if (value.includes("financ") || value.includes("bank")) return "Financial";
  if (value.includes("legal")) return "Legal";
  if (value.includes("refinanc")) return "Refinance";
  if (value.includes("purchas") || value.includes("propert")) {
    return "Property purchase";
  }
  return "Other";
}

const CRM_DOCUMENT_REQUEST_TYPES = new Set([
  "CONTRACT",
  "PROPOSAL",
  "ID_PROOF",
  "FINANCIAL",
  "LEGAL",
  "OTHER",
]);

export function apiDocumentRequestType(type: DocumentRequestType): string {
  const mapped = type.toUpperCase().replace(/ /g, "_");
  return CRM_DOCUMENT_REQUEST_TYPES.has(mapped) ? mapped : "OTHER";
}

function formatDisplayDate(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed)
    .toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ (\d{4})$/, ", $1");
}

function toIsoDateTime(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  const local = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (local) {
    const [, year, month, day, hour, minute] = local;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    );
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function toIsoDate(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  const au = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (au) {
    const [, d, m, y] = au;
    const local = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      17,
      0,
      0,
      0,
    );
    if (local.getTime() <= Date.now()) {
      local.setDate(local.getDate() + 1);
    }
    return local.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  if (parsed.getTime() <= Date.now()) {
    parsed.setTime(Date.now() + 60 * 60 * 1000);
  }
  return parsed.toISOString();
}

function mapItems(raw: unknown): RequestedDocLine[] | undefined {
  const rows = extractRecords(raw);
  if (!rows.length) return undefined;
  return rows.map((row, index) => ({
    id: pickStr(row.id, row.itemId, row.catalogId) || `dri-${index}`,
    catalogId: pickStr(row.catalogId, row.documentTypeId) || undefined,
    title: pickStr(row.title, row.name, row.documentType, `Document ${index + 1}`),
    description: pickStr(row.description, row.notes) || undefined,
    applicant: pickStr(row.applicant, row.applicantName) || undefined,
    status:
      pickStr(row.status).toLowerCase().includes("accept")
        ? "Accepted"
        : pickStr(row.status).toLowerCase().includes("reject")
          ? "Rejected"
          : pickStr(row.status).toLowerCase().includes("upload")
            ? "Uploaded"
            : "Awaiting",
    fileName:
      pickStr(
        row.fileName,
        row.filename,
        row.document && typeof row.document === "object"
          ? (row.document as Record<string, unknown>).name
          : "",
      ) || undefined,
  }));
}

function progressPercent(raw: unknown, status: DocumentRequestStatus): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  if (raw && typeof raw === "object") {
    const rec = raw as Record<string, unknown>;
    const total = Number(rec.total);
    const received = Number(rec.received);
    if (total > 0 && Number.isFinite(received)) {
      return Math.max(0, Math.min(100, Math.round((received / total) * 100)));
    }
  }
  return progressForStatus(status);
}

function formatDisplayDateTime(raw: unknown): string {
  const date = formatDisplayDate(raw);
  if (!date) return "";
  const parsed = Date.parse(typeof raw === "string" ? raw : "");
  if (Number.isNaN(parsed)) return date;
  const value = new Date(parsed);
  if (value.getHours() === 0 && value.getMinutes() === 0) return date;
  const time = value.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

export function normalizeDocumentRequest(
  raw: Record<string, unknown>,
  index: number,
): DocumentRequest {
  const client =
    raw.client && typeof raw.client === "object"
      ? (raw.client as Record<string, unknown>)
      : null;
  const status = mapDocumentRequestStatus(
    pickStr(raw.status, raw.state, "REQUESTED"),
  );
  const requestedFromPerson =
    raw.requestedFrom && typeof raw.requestedFrom === "object"
      ? raw.requestedFrom
      : null;
  const requestedFrom = pickStr(
    typeof raw.requestedFrom === "string" ? raw.requestedFrom : "",
    partyName(requestedFromPerson),
    raw.recipientName,
    raw.clientName,
    raw.applicantName,
    client && pickStr(client.name, client.fullName),
    "Client",
  );
  const title = pickStr(raw.title, raw.name, raw.subject, `Document request ${index + 1}`);
  const id = pickStr(raw.id, raw.uuid, raw.documentRequestId) || `crm-dr-${index}`;
  return {
    id,
    requestId:
      pickStr(raw.requestId, raw.code, raw.reference, raw.number) ||
      `DR-${String(index + 1).padStart(3, "0")}`,
    title,
    requestedFrom,
    requestedFromId: pickStr(raw.requestedFromId, client && client.id) || undefined,
    relatedTo:
      pickStr(
        typeof raw.relatedTo === "string" ? raw.relatedTo : "",
        raw.relatedLabel,
        raw.relatedName,
        relatedActivityLabel(raw),
      ) || undefined,
    leadId: pickStr(raw.leadId) || undefined,
    contactId: pickStr(raw.contactId) || undefined,
    companyId: pickStr(raw.companyId) || undefined,
    dealId: pickStr(raw.dealId) || undefined,
    documentType: mapDocumentRequestType(
      pickStr(raw.documentType, raw.type, raw.category, "Other"),
    ),
    status,
    dueDate: formatDisplayDate(raw.dueDate ?? raw.dueAt ?? raw.deadline),
    reminderDate:
      formatDisplayDateTime(raw.reminderDate ?? raw.reminderAt ?? raw.remindAt) ||
      undefined,
    repeat: pickStr(raw.repeat, raw.reminderRepeat) || undefined,
    notifyBy: Array.isArray(raw.notifyBy)
      ? raw.notifyBy.map(String)
      : undefined,
    requestedBy: pickStr(
      typeof raw.requestedBy === "string" ? raw.requestedBy : "",
      partyName(raw.requestedBy),
      partyName(raw.requestedByUser),
      partyName(raw.owner),
      raw.ownerName,
      raw.createdByName,
    ) || "—",
    requestedById: pickStr(raw.requestedById, raw.ownerId, raw.createdById) || undefined,
    requestedDate: formatDisplayDate(
      raw.requestedDate ?? raw.createdAt ?? raw.sentAt,
    ),
    lastUpdated: formatDisplayDate(raw.updatedAt ?? raw.lastUpdated ?? raw.createdAt),
    progress: progressPercent(raw.progress, status),
    receivedDate:
      formatDisplayDate(raw.receivedDate ?? raw.receivedAt) || undefined,
    priority:
      pickStr(raw.priority).toLowerCase() === "high"
        ? "High"
        : pickStr(raw.priority).toLowerCase() === "low"
          ? "Low"
          : pickStr(raw.priority)
            ? "Normal"
            : undefined,
    notes: pickStr(raw.notes, raw.description, raw.internalNotes) || undefined,
    items: mapItems(raw.items ?? raw.documents ?? raw.requestedDocuments),
    clientName:
      pickStr(raw.clientName, client && client.name, requestedFrom) || undefined,
    clientEmail:
      pickStr(
        raw.clientEmail,
        client && client.email,
        requestedFromPerson &&
          (requestedFromPerson as Record<string, unknown>).email,
      ) || undefined,
  };
}

export function normalizeDocumentRequests(data: unknown): DocumentRequest[] {
  return extractRecords(data).map((row, index) =>
    normalizeDocumentRequest(row, index),
  );
}

async function withSession<T>(fn: (session: CrmSession) => Promise<T>): Promise<T> {
  const session = await ensureCrmSession();
  if (!session) throw new Error("Sign in to manage document requests");
  return fn(session);
}

function isMissingCrmRoute(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /\(404\)|not found/i.test(message);
}

async function requestsCall(
  suffix: string,
  query = "",
  init?: RequestInit,
): Promise<unknown> {
  const scoped = await ensureCrmSession();
  const paths = [
    ...(scoped?.workspaceId
      ? [`${workspaceDocumentRequestsPath(scoped.workspaceId, suffix)}${query}`]
      : []),
    `${globalDocumentRequestsPath(suffix)}${query}`,
  ].filter((path, index, all) => all.indexOf(path) === index);

  let lastError: unknown;
  for (let i = 0; i < paths.length; i += 1) {
    try {
      if (isBoundCrmSession()) {
        return await withSession((session) => crmFetch(session, paths[i], init));
      }
      return await crmBffFetch(paths[i], init);
    } catch (err) {
      lastError = err;
      if (i < paths.length - 1 && isMissingCrmRoute(err)) continue;
      throw err;
    }
  }
  throw lastError;
}

async function requestsGet(suffix: string, query = ""): Promise<unknown> {
  return requestsCall(suffix, query);
}

async function requestsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  return requestsCall(suffix, "", init);
}

function asRequest(data: unknown): DocumentRequest | null {
  const items = normalizeDocumentRequests(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeDocumentRequest(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmDocumentRequests(
  query: CrmDocumentRequestQuery = {},
): Promise<DocumentRequest[]> {
  return normalizeDocumentRequests(
    await requestsGet(
      "",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
        leadId: query.leadId,
        contactId: query.contactId,
        companyId: query.companyId,
        dealId: query.dealId,
      }),
    ),
  );
}

export async function getCrmDocumentRequest(
  id: string,
): Promise<DocumentRequest | null> {
  return asRequest(await requestsGet(`/${id}`));
}

function compactBody(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value == null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    }),
  );
}

export function toCreateDocumentRequestBody(
  input: Partial<DocumentRequest> & {
    title: string;
    requestedFromId?: string;
    leadId?: string;
    contactId?: string;
    companyId?: string;
    dealId?: string;
  },
): Record<string, unknown> {
  const requestedFromId = isUuid(input.requestedFromId ?? "")
    ? input.requestedFromId
    : undefined;
  const parents = compactBody({
    leadId: isUuid(input.leadId ?? "") ? input.leadId : undefined,
    contactId: isUuid(input.contactId ?? "") ? input.contactId : undefined,
    companyId: isUuid(input.companyId ?? "") ? input.companyId : undefined,
    dealId: isUuid(input.dealId ?? "") ? input.dealId : undefined,
  });
  const parentKeys = Object.keys(parents);
  const singleParent =
    parentKeys.length <= 1
      ? parents
      : compactBody({
          [parentKeys[0]]: parents[parentKeys[0]],
        });
  const documentType = input.documentType
    ? apiDocumentRequestType(input.documentType)
    : "OTHER";
  const items = (input.items ?? [])
    .map((item) => ({
      name: item.title.trim(),
      documentType,
    }))
    .filter((item) => item.name)
    .slice(0, 25);
  const notifyBy = (input.notifyBy ?? [])
    .map((method) => method.trim())
    .filter(Boolean)
    .slice(0, 4);
  return compactBody({
    title: input.title.trim(),
    documentType,
    requestedFromId,
    dueDate: toIsoDateTime(input.dueDate) ?? toIsoDate(input.dueDate),
    notes: (input.notes ?? input.internalNotes)?.trim(),
    reminderAt: toIsoDateTime(input.reminderDate),
    reminderRepeat: input.repeat?.trim(),
    notifyBy: notifyBy.length ? notifyBy : undefined,
    items: items.length ? items : undefined,
    ...singleParent,
  });
}

export async function createCrmDocumentRequest(
  body: Record<string, unknown>,
): Promise<DocumentRequest | null> {
  const requestedFromId =
    typeof body.requestedFromId === "string" ? body.requestedFromId : "";
  if (!isUuid(requestedFromId)) {
    throw new Error(
      "Pick or add a live CRM contact before creating this document request.",
    );
  }
  try {
    return asRequest(
      await requestsMutate("", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  } catch (err) {
    const fallback = compactBody({
      title: typeof body.title === "string" ? body.title.trim() : "",
      documentType:
        typeof body.documentType === "string" ? body.documentType : "OTHER",
      requestedFromId,
    });
    if (!fallback.title || JSON.stringify(body) === JSON.stringify(fallback)) {
      throw err;
    }
    try {
      return asRequest(
        await requestsMutate("", {
          method: "POST",
          body: JSON.stringify(fallback),
        }),
      );
    } catch {
      throw err;
    }
  }
}

export async function updateCrmDocumentRequest(
  id: string,
  patch: Record<string, unknown>,
): Promise<DocumentRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmDocumentRequest(id: string): Promise<void> {
  await requestsMutate(`/${id}`, { method: "DELETE" });
}

export async function restoreCrmDocumentRequest(
  id: string,
): Promise<DocumentRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/restore`, { method: "POST", body: "{}" }),
  );
}

export async function sendCrmDocumentRequest(
  id: string,
): Promise<DocumentRequest | null> {
  if (!isCrmDocumentRequestId(id)) {
    throw new Error("Save the document request before sending it.");
  }
  return asRequest(
    await requestsMutate(`/${id}/send`, { method: "POST", body: "{}" }),
  );
}

export async function receiveCrmDocumentRequest(
  id: string,
): Promise<DocumentRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/receive`, { method: "POST", body: "{}" }),
  );
}

export async function approveCrmDocumentRequest(
  id: string,
): Promise<DocumentRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/approve`, { method: "POST", body: "{}" }),
  );
}

export async function rejectCrmDocumentRequest(
  id: string,
  reason?: string,
): Promise<DocumentRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason, notes: reason } : {}),
    }),
  );
}

export async function expireCrmDocumentRequest(
  id: string,
): Promise<DocumentRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/expire`, { method: "POST", body: "{}" }),
  );
}

export async function syncCrmDocumentRequestStatus(
  id: string,
  status: DocumentRequestStatus,
  reason?: string,
): Promise<DocumentRequest | null> {
  switch (status) {
    case "Pending":
      return sendCrmDocumentRequest(id);
    case "Received":
      return receiveCrmDocumentRequest(id);
    case "Approved":
      return approveCrmDocumentRequest(id);
    case "Rejected":
      return rejectCrmDocumentRequest(id, reason);
    case "Expired":
      return expireCrmDocumentRequest(id);
    default:
      return updateCrmDocumentRequest(id, {
        status: apiDocumentRequestStatus(status),
      });
  }
}

export async function tryCrmDocumentRequest<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function isCrmDocumentRequestId(id: string): boolean {
  return isUuid(id);
}
