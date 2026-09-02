import {
  ensureCrmAccess,
  ensureCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import {
  type DocumentAccessLevel,
  type LibraryDocument,
} from "@/lib/documents/library/types";

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
  const sizeLabel = formatSize(raw.sizeLabel ?? raw.size ?? raw.bytes);
  const version = Number(raw.version ?? raw.currentVersion ?? 1) || 1;
  return {
    id: pickStr(raw.id, raw.uuid, raw.documentId) || `crm-doc-${index}`,
    fileName,
    folder: pickStr(raw.folder, raw.category, raw.collection, "Clients"),
    owner,
    relatedTo: pickStr(raw.relatedTo, raw.relatedLabel) || undefined,
    version,
    tags: mapTags(raw.tags ?? raw.labels),
    uploadedAt,
    accessLevel: mapDocumentAccess(pickStr(raw.accessLevel, raw.visibility, raw.access, "PRIVATE")),
    sizeLabel,
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

async function withSession<T>(
  run: (
    session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
    scoped: boolean,
  ) => Promise<T>,
): Promise<T> {
  const scoped = await ensureCrmSession();
  if (scoped) return run(scoped, true);
  const access = await ensureCrmAccess();
  if (!access) throw new Error("Sign in to manage documents");
  return run(access, false);
}

function documentsUrl(
  session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
  scoped: boolean,
  suffix: string,
) {
  return scoped
    ? workspaceDocumentsPath((session as CrmSession).workspaceId, suffix)
    : globalDocumentsPath(suffix);
}

async function documentsGet(suffix: string, query = ""): Promise<unknown> {
  return withSession((session, scoped) =>
    crmFetch(session, `${documentsUrl(session, scoped, suffix)}${query}`),
  );
}

async function documentsMutate(suffix: string, init: RequestInit): Promise<unknown> {
  return withSession((session, scoped) =>
    crmFetch(session, documentsUrl(session, scoped, suffix), init),
  );
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

export function toCreateDocumentBody(
  input: Partial<LibraryDocument> & { fileName: string },
): Record<string, unknown> {
  return {
    name: input.fileName,
    fileName: input.fileName,
    title: input.fileName,
    folder: input.folder,
    category: input.folder,
    ownerName: input.owner,
    owner: input.owner,
    relatedTo: input.relatedTo,
    tags: input.tags,
    accessLevel: input.accessLevel
      ? apiDocumentAccess(input.accessLevel)
      : undefined,
    visibility: input.accessLevel
      ? apiDocumentAccess(input.accessLevel)
      : undefined,
    fileKey: input.storageKey,
    storageKey: input.storageKey,
    url: input.storageUrl,
  };
}

export async function createCrmDocument(
  body: Record<string, unknown>,
): Promise<LibraryDocument | null> {
  return asDocument(
    await documentsMutate("", {
      method: "POST",
      body: JSON.stringify(body),
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

export async function tryCrmDocument<T>(run: () => Promise<T>): Promise<T | null> {
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

export function isCrmDocumentId(id: string): boolean {
  return isUuid(id);
}
