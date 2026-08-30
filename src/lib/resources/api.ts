import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import {
  formatResourceDate,
  looksLikeUrl,
  upsertResource,
  type ResourceAccess,
  type ResourceCategory,
  type ResourceItem,
  type ResourceType,
} from "@/lib/resources/types";

export type CrmResourceQuery = {
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

function toNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
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

export function resourcesPath(suffix = ""): string {
  return `/v1/resources${suffix}`;
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
    for (const key of ["items", "resources", "records", "rows", "result"]) {
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

export function mapResourceType(raw: string): ResourceType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("video")) return "Video";
  if (value.includes("image") || value.includes("photo")) return "Image";
  if (value.includes("link") || value.includes("url")) return "Link";
  if (value.includes("template")) return "Template";
  if (value.includes("guide") || value.includes("playbook")) return "Guide";
  if (value.includes("faq")) return "FAQ";
  return "Document";
}

export function mapResourceCategory(raw: string): ResourceCategory {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("market")) return "Marketing";
  if (value.includes("support")) return "Support";
  if (value.includes("product")) return "Product";
  if (value.includes("train")) return "Training";
  if (value.includes("legal") || value.includes("complian")) return "Legal";
  return "Sales";
}

export function mapResourceAccess(raw: string): ResourceAccess {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("public")) return "Public";
  if (value.includes("restrict") || value.includes("private")) return "Restricted";
  return "Internal";
}

function mapTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean);
  }
  const text = pickStr(raw);
  if (!text) return [];
  return text
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function normalizeResource(
  raw: Record<string, unknown>,
  index: number,
): ResourceItem {
  const owner =
    raw.uploadedBy && typeof raw.uploadedBy === "object"
      ? (raw.uploadedBy as Record<string, unknown>)
      : raw.createdBy && typeof raw.createdBy === "object"
        ? (raw.createdBy as Record<string, unknown>)
        : null;
  const fileOrUrl = pickStr(
    raw.fileOrUrl,
    raw.url,
    raw.href,
    raw.fileName,
    raw.filename,
    raw.file,
    raw.path,
  );
  const id = pickStr(raw.id, raw.uuid, raw.resourceId) || `crm-res-${index}`;
  const resourceId = pickStr(
    raw.number,
    raw.code,
    raw.reference,
    raw.resourceNumber,
    typeof raw.resourceId === "string" && !isUuid(raw.resourceId)
      ? raw.resourceId
      : "",
    `RES-${index + 1}`,
  );
  return {
    id,
    resourceId,
    name: pickStr(raw.name, raw.title, raw.subject, "Resource"),
    type: mapResourceType(pickStr(raw.type, raw.resourceType, "DOCUMENT")),
    category: mapResourceCategory(
      pickStr(raw.category, raw.department, "SALES"),
    ),
    fileOrUrl,
    isExternalUrl: Boolean(raw.isExternalUrl) || looksLikeUrl(fileOrUrl),
    description: pickStr(raw.description, raw.summary, raw.notes) || undefined,
    tags: mapTags(raw.tags ?? raw.labels),
    accessLevel: mapResourceAccess(
      pickStr(raw.accessLevel, raw.access, raw.visibility, "INTERNAL"),
    ),
    uploadedBy: pickStr(
      owner && pickStr(owner.name, owner.fullName),
      raw.uploadedByName,
      raw.ownerName,
      raw.owner,
      raw.createdBy,
      raw.uploadedBy,
      "—",
    ),
    uploadDate:
      formatDate(raw.uploadDate ?? raw.createdAt ?? raw.uploadedAt) ||
      formatResourceDate(),
    downloadCount: toNum(raw.downloadCount ?? raw.downloads ?? raw.downloadHits),
    sharedWith: pickStr(raw.sharedWith) || undefined,
    audit: [],
  };
}

export function normalizeResources(data: unknown): ResourceItem[] {
  return extractRecords(data).map((row, index) =>
    normalizeResource(row, index),
  );
}

async function resourcesRequest(
  suffix: string,
  init?: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage resources");
  return crmFetch(auth, resourcesPath(suffix), init);
}

function asResource(data: unknown): ResourceItem | null {
  const items = normalizeResources(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeResource(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmResources(
  query: CrmResourceQuery = {},
): Promise<ResourceItem[]> {
  return normalizeResources(
    await resourcesRequest(
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
      }),
    ),
  );
}

export async function getCrmResource(id: string): Promise<ResourceItem | null> {
  return asResource(await resourcesRequest(`/${id}`));
}

export async function createCrmResource(
  body: Record<string, unknown>,
): Promise<ResourceItem | null> {
  return asResource(
    await resourcesRequest("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmResource(
  id: string,
  patch: Record<string, unknown>,
): Promise<ResourceItem | null> {
  return asResource(
    await resourcesRequest(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmResource(id: string): Promise<void> {
  await resourcesRequest(`/${id}`, { method: "DELETE" });
}

export async function tryCrmResource<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteResource(row: ResourceItem | null) {
  if (row) upsertResource(row);
  return row;
}

export function toCreateResourceBody(input: {
  name: string;
  type: ResourceType;
  category: ResourceCategory;
  fileOrUrl: string;
  description?: string;
  tags: string[];
  accessLevel: ResourceAccess;
}): Record<string, unknown> {
  const external = looksLikeUrl(input.fileOrUrl);
  return {
    name: input.name,
    title: input.name,
    type: input.type.toUpperCase(),
    resourceType: input.type.toUpperCase(),
    category: input.category.toUpperCase(),
    fileOrUrl: input.fileOrUrl,
    url: external ? input.fileOrUrl : undefined,
    fileName: external ? undefined : input.fileOrUrl,
    isExternalUrl: external,
    description: input.description,
    tags: input.tags,
    accessLevel: input.accessLevel.toUpperCase(),
    access: input.accessLevel.toUpperCase(),
    visibility: input.accessLevel.toUpperCase(),
  };
}

export function isCrmResourceId(id: string): boolean {
  return isUuid(id);
}
