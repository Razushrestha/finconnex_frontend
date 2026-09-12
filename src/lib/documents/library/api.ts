import {
  ensureCrmSession,
  isBoundCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import {
  type CrmDocumentType,
  CRM_DOCUMENT_TYPES,
  type DocumentAccessLevel,
  type LibraryDocument,
} from "@/lib/documents/library/types";
import { isUuid } from "@/lib/activity-timeline/auth";

export type CrmDocumentQuery = {
  page?: number;
  limit?: number;
  search?: string;
  contactId?: string;
  leadId?: string;
  companyId?: string;
  dealId?: string;
};

export type CrmDocumentDownload = {
  url: string | null;
  raw: unknown;
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

export function workspaceDocumentsPath(workspaceId: string, suffix = ""): string {
  return `/v1/workspaces/${workspaceId}/documents${suffix}`;
}

export function globalDocumentsPath(suffix = ""): string {
  return `/v1/documents${suffix}`;
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
    for (const key of ["items", "documents", "files", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function mapDocumentAccess(raw: string): DocumentAccessLevel {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("org") || value.includes("public")) return "Organization";
  if (value.includes("team") || value.includes("workspace")) return "Team";
  return "Private";
}

export function apiDocumentAccess(level: DocumentAccessLevel): string {
  return level.toUpperCase();
}

function parseMeta(description: string) {
  const folder = description.match(/\[folder:([^\]]+)\]/)?.[1]?.trim();
  const relatedTo = description.match(/\[related:([^\]]+)\]/)?.[1]?.trim();
  const tags = description.match(/\[tags:([^\]]+)\]/)?.[1];
  return {
    folder,
    relatedTo,
    tags: tags
      ? tags.split(/[,;]+/).map((item) => item.trim()).filter(Boolean)
      : [],
  };
}

export function folderToDocumentType(folder?: string): CrmDocumentType {
  switch (folder) {
    case "Deals":
      return "PROPOSAL";
    case "Signed":
      return "CONTRACT";
    case "Templates":
      return "OTHER";
    case "Clients":
      return "OTHER";
    default:
      return "OTHER";
  }
}

export function documentTypeToFolder(
  type?: string,
  description?: string,
): string {
  const encoded = description ? parseMeta(description).folder : undefined;
  if (encoded) return encoded;
  switch (type) {
    case "PROPOSAL":
      return "Deals";
    case "CONTRACT":
    case "LEGAL":
      return "Signed";
    case "ID_PROOF":
    case "FINANCIAL":
      return "Clients";
    default:
      return "Clients";
  }
}

export function encodeDocumentDescription(input: {
  folder?: string;
  tags?: string[];
  relatedTo?: string;
  notes?: string;
}): string | undefined {
  const lines = [
    input.folder ? `[folder:${input.folder}]` : "",
    input.tags?.length ? `[tags:${input.tags.join(",")}]` : "",
    input.relatedTo ? `[related:${input.relatedTo}]` : "",
    input.notes?.trim() ?? "",
  ].filter(Boolean);
  return lines.join("\n") || undefined;
}

function asDocumentType(raw: string): CrmDocumentType | undefined {
  const value = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return CRM_DOCUMENT_TYPES.includes(value as CrmDocumentType)
    ? (value as CrmDocumentType)
    : undefined;
}

function formatDate(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString("en-AU");
}

function formatSize(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw >= 1_000_000) return `${(raw / 1_000_000).toFixed(1)} MB`;
    if (raw >= 1000) return `${Math.round(raw / 1000)} KB`;
    return `${raw} B`;
  }
  return pickStr(raw) || "—";
}

function mapTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => pickStr(item)).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function normalizeLibraryDocument(
  raw: Record<string, unknown>,
  index: number,
): LibraryDocument {
  const ownerObj =
    raw.owner && typeof raw.owner === "object"
      ? (raw.owner as Record<string, unknown>)
      : null;
  const fileName = pickStr(
    raw.fileName,
    raw.filename,
    raw.name,
    raw.title,
    `Document ${index + 1}`,
  );
  const uploadedAt = formatDate(
    raw.uploadedAt ?? raw.createdAt ?? raw.updatedAt,
  );
  const owner = pickStr(
    raw.ownerName,
    raw.uploadedBy,
    raw.createdByName,
    ownerObj && pickStr(ownerObj.name, ownerObj.fullName),
    "—",
  );
  const sizeBytes =
    typeof raw.sizeBytes === "number"
      ? raw.sizeBytes
      : typeof raw.size === "number"
        ? raw.size
        : undefined;
  const sizeLabel = formatSize(raw.sizeLabel ?? sizeBytes ?? raw.size ?? raw.bytes);
  const version = Number(raw.version ?? raw.currentVersion ?? 1) || 1;
  const description = pickStr(raw.description, raw.note) || undefined;
  const meta = description ? parseMeta(description) : { folder: "", relatedTo: "", tags: [] };
  const documentType = asDocumentType(pickStr(raw.documentType, raw.type));
  const relatedIds = {
    leadId: pickStr(raw.leadId) || undefined,
    contactId: pickStr(raw.contactId) || undefined,
    companyId: pickStr(raw.companyId) || undefined,
    dealId: pickStr(raw.dealId) || undefined,
  };
  return {
    id: pickStr(raw.id, raw.uuid, raw.documentId) || `crm-doc-${index}`,
    fileName,
    folder:
      pickStr(raw.folder, raw.category, raw.collection, meta.folder) ||
      documentTypeToFolder(documentType, description),
    owner,
    relatedTo: pickStr(raw.relatedTo, raw.relatedLabel, meta.relatedTo) || undefined,
    version,
    tags: mapTags(raw.tags ?? raw.labels).length
      ? mapTags(raw.tags ?? raw.labels)
      : meta.tags,
    uploadedAt,
    accessLevel: mapDocumentAccess(pickStr(raw.accessLevel, raw.visibility, raw.access, "PRIVATE")),
    sizeLabel,
    storageKey: pickStr(raw.key, raw.storageKey, raw.fileKey) || undefined,
    mimeType: pickStr(raw.mimeType, raw.contentType) || undefined,
    sizeBytes,
    description,
    documentType,
    ...relatedIds,
    versions: [
      {
        version,
        uploadedAt,
        uploadedBy: owner,
        sizeLabel,
        note: pickStr(raw.note, raw.description) || undefined,
      },
    ],
  };
}

export function normalizeLibraryDocuments(data: unknown): LibraryDocument[] {
  return extractRecords(data).map((row, index) =>
    normalizeLibraryDocument(row, index),
  );
}

async function withSession<T>(fn: (session: CrmSession) => Promise<T>): Promise<T> {
  const session = await ensureCrmSession();
  if (!session) throw new Error("Sign in to manage documents");
  return fn(session);
}

function isMissingCrmRoute(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /\(404\)|not found/i.test(message);
}

async function documentsCall(
  suffix: string,
  query = "",
  init?: RequestInit,
): Promise<unknown> {
  const scoped = await ensureCrmSession();
  const paths = [
    ...(scoped?.workspaceId
      ? [`${workspaceDocumentsPath(scoped.workspaceId, suffix)}${query}`]
      : []),
    `${globalDocumentsPath(suffix)}${query}`,
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

async function documentsGet(suffix: string, query = ""): Promise<unknown> {
  return documentsCall(suffix, query);
}

async function documentsMutate(suffix: string, init: RequestInit): Promise<unknown> {
  return documentsCall(suffix, "", init);
}

function asDocument(data: unknown): LibraryDocument | null {
  const items = normalizeLibraryDocuments(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeLibraryDocument(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmDocuments(
  query: CrmDocumentQuery = {},
): Promise<LibraryDocument[]> {
  return normalizeLibraryDocuments(
    await documentsGet(
      "",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        contactId: query.contactId,
        leadId: query.leadId,
        companyId: query.companyId,
        dealId: query.dealId,
      }),
    ),
  );
}

export async function listCrmDocumentLibrary(
  query: CrmDocumentQuery = {},
): Promise<LibraryDocument[]> {
  try {
    return normalizeLibraryDocuments(
      await documentsGet(
        "/library",
        toQuery({
          page: query.page,
          limit: query.limit ?? 100,
          search: query.search,
        }),
      ),
    );
  } catch (err) {
    if (isMissingCrmRoute(err)) return listCrmDocuments(query);
    throw err;
  }
}

export async function listMyCrmDocuments(
  query: CrmDocumentQuery = {},
): Promise<LibraryDocument[]> {
  return normalizeLibraryDocuments(
    await documentsGet(
      "/my",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
      }),
    ),
  );
}

export async function listRecentCrmDocuments(
  query: CrmDocumentQuery = {},
): Promise<LibraryDocument[]> {
  return normalizeLibraryDocuments(
    await documentsGet(
      "/recent",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
      }),
    ),
  );
}

export async function getCrmDocument(id: string): Promise<LibraryDocument | null> {
  return asDocument(await documentsGet(`/${id}`));
}

export async function getCrmDocumentDownload(
  id: string,
): Promise<CrmDocumentDownload> {
  const data = await documentsGet(`/${id}/download`);
  if (typeof data === "string" && data.trim()) {
    return { url: data.trim(), raw: data };
  }
  const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    url:
      pickStr(rec.url, rec.downloadUrl, rec.href, rec.signedUrl, rec.location) ||
      null,
    raw: data,
  };
}

export async function getCrmDocumentPreview(
  id: string,
): Promise<CrmDocumentDownload> {
  const data = await documentsGet(`/${id}/preview`);
  if (typeof data === "string" && data.trim()) {
    return { url: data.trim(), raw: data };
  }
  const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    url:
      pickStr(rec.url, rec.previewUrl, rec.href, rec.signedUrl, rec.location) ||
      null,
    raw: data,
  };
}

export function toCreateDocumentBody(
  input: Partial<LibraryDocument> & { fileName: string },
): Record<string, unknown> {
  const related = pickRelatedIds(input);
  const key = input.storageKey?.trim();
  const mimeType = input.mimeType?.trim() || "application/octet-stream";
  const sizeBytes = Number(input.sizeBytes) || 0;
  return {
    name: input.fileName.trim(),
    documentType:
      input.documentType || folderToDocumentType(input.folder),
    key,
    mimeType,
    sizeBytes,
    description: encodeDocumentDescription({
      folder: input.folder,
      tags: input.tags,
      relatedTo: input.relatedTo,
      notes: input.description,
    }),
    ...related,
  };
}

export function toUpdateDocumentBody(
  input: Partial<LibraryDocument> & { fileName?: string },
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.fileName?.trim()) body.name = input.fileName.trim();
  if (input.documentType) body.documentType = input.documentType;
  else if (input.folder) body.documentType = folderToDocumentType(input.folder);
  const description = encodeDocumentDescription({
    folder: input.folder,
    tags: input.tags,
    relatedTo: input.relatedTo,
    notes: input.description,
  });
  if (description) body.description = description;
  Object.assign(body, pickRelatedIds(input));
  return body;
}

function pickRelatedIds(input: Partial<LibraryDocument>): Record<string, string> {
  const pairs: Array<[string, string | undefined]> = [
    ["leadId", input.leadId],
    ["contactId", input.contactId],
    ["companyId", input.companyId],
    ["dealId", input.dealId],
  ];
  const selected = pairs.find(([, value]) => value && isUuid(value));
  return selected ? { [selected[0]]: selected[1] as string } : {};
}

export async function createCrmDocument(
  body: Record<string, unknown>,
): Promise<LibraryDocument | null> {
  const payload = {
    ...body,
    name: pickStr(body.name, body.fileName, body.title),
    documentType: pickStr(body.documentType) || "OTHER",
    key: pickStr(body.key, body.storageKey, body.fileKey),
    mimeType:
      pickStr(body.mimeType, body.contentType) || "application/octet-stream",
    sizeBytes: Number(body.sizeBytes) || undefined,
  };
  return asDocument(
    await documentsMutate("", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateCrmDocument(
  id: string,
  patch: Record<string, unknown>,
): Promise<LibraryDocument | null> {
  return asDocument(
    await documentsMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmDocument(id: string): Promise<void> {
  await documentsMutate(`/${id}`, { method: "DELETE" });
}

export async function restoreCrmDocument(
  id: string,
): Promise<LibraryDocument | null> {
  return asDocument(
    await documentsMutate(`/${id}/restore`, { method: "POST", body: "{}" }),
  );
}

export async function bulkDeleteCrmDocuments(ids: string[]): Promise<unknown> {
  return documentsMutate("/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function bulkRestoreCrmDocuments(ids: string[]): Promise<unknown> {
  return documentsMutate("/bulk-restore", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function tryCrmDocument<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function isCrmDocumentId(id: string): boolean {
  return isUuid(id);
}
