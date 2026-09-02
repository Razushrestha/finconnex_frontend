import {
  ensureCrmAccess,
  ensureCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
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
      "documentRequests",
      "requests",
      "records",
      "rows",
      "result",
    ]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
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

export function apiDocumentRequestType(type: DocumentRequestType): string {
  return type.toUpperCase().replace(/ /g, "_");
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

function toIsoDate(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.includes("T") ? value : `${value.slice(0, 10)}T00:00:00.000Z`;
  }
  const au = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (au) {
    const [, d, m, y] = au;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00.000Z`;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toISOString();
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
    fileName: pickStr(row.fileName, row.filename) || undefined,
  }));
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
  const requestedFrom = pickStr(
    raw.requestedFrom,
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
    relatedTo: pickStr(raw.relatedTo, raw.relatedLabel) || undefined,
    documentType: mapDocumentRequestType(
      pickStr(raw.documentType, raw.type, raw.category, "Other"),
    ),
    status,
    dueDate: formatDisplayDate(raw.dueDate ?? raw.dueAt ?? raw.deadline),
    reminderDate: formatDisplayDate(raw.reminderDate ?? raw.remindAt) || undefined,
    notifyBy: Array.isArray(raw.notifyBy)
      ? raw.notifyBy.map(String)
      : undefined,
    requestedBy: pickStr(
      raw.requestedBy,
      raw.ownerName,
      raw.createdByName,
      raw.owner,
      "—",
    ),
    requestedDate: formatDisplayDate(
      raw.requestedDate ?? raw.createdAt ?? raw.sentAt,
    ),
    lastUpdated: formatDisplayDate(raw.updatedAt ?? raw.lastUpdated ?? raw.createdAt),
    progress: progressForStatus(status),
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
    clientName: pickStr(raw.clientName, client && client.name) || undefined,
    clientEmail: pickStr(raw.clientEmail, client && client.email) || undefined,
  };
}

export function normalizeDocumentRequests(data: unknown): DocumentRequest[] {
  return extractRecords(data).map((row, index) =>
    normalizeDocumentRequest(row, index),
  );
}

async function withSession<T>(
  run: (
    session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
    scoped: boolean,
  ) => Promise<T>,
): Promise<T> {
  const scoped = await ensureCrmSession();
  if (scoped) return run(scoped, true);
  const access = await ensureCrmAccess();
  if (!access) throw new Error("Sign in to manage document requests");
  return run(access, false);
}

function requestsUrl(
  session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
  scoped: boolean,
  suffix: string,
) {
  return scoped
    ? workspaceDocumentRequestsPath((session as CrmSession).workspaceId, suffix)
    : globalDocumentRequestsPath(suffix);
}

async function requestsGet(suffix: string, query = ""): Promise<unknown> {
  return withSession((session, scoped) =>
    crmFetch(session, `${requestsUrl(session, scoped, suffix)}${query}`),
  );
}

async function requestsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  return withSession((session, scoped) =>
    crmFetch(session, requestsUrl(session, scoped, suffix), init),
  );
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

export function toCreateDocumentRequestBody(
  input: Partial<DocumentRequest> & { title: string },
): Record<string, unknown> {
  return {
    title: input.title,
    name: input.title,
    requestedFrom: input.requestedFrom,
    clientName: input.clientName ?? input.requestedFrom,
    recipientName: input.requestedFrom,
    clientEmail: input.clientEmail,
    documentType: input.documentType
      ? apiDocumentRequestType(input.documentType)
      : undefined,
    type: input.documentType
      ? apiDocumentRequestType(input.documentType)
      : undefined,
    status: input.status ? apiDocumentRequestStatus(input.status) : "REQUESTED",
    dueDate: toIsoDate(input.dueDate),
    reminderDate: toIsoDate(input.reminderDate),
    notes: input.notes ?? input.internalNotes,
    requestedBy: input.requestedBy,
    ownerName: input.requestedBy,
    priority: input.priority?.toUpperCase(),
    relatedTo: input.relatedTo,
    items: input.items?.map((item) => ({
      title: item.title,
      name: item.title,
      description: item.description,
      applicant: item.applicant,
      catalogId: item.catalogId,
    })),
  };
}

export async function createCrmDocumentRequest(
  body: Record<string, unknown>,
): Promise<DocumentRequest | null> {
  return asRequest(
    await requestsMutate("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
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
