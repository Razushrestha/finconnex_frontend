import { crmWorkspaceFetch } from "@/lib/crm/request";
import type { RecycleBinItem } from "@/lib/rules/soft-delete";

/**
 * Mirrors RECYCLE_BIN_ENTITY_TYPE_VALUES in the API. The list endpoint
 * requires one of these, spelled exactly so, and rejects any other query
 * parameter — so these are the only types the bin can show.
 */
export const RECYCLE_ENTITY_TYPES = [
  "LEAD",
  "CONTACT",
  "COMPANY",
  "DEAL",
  "TASK",
  "EMAIL",
  "MESSAGE",
  "DOCUMENT",
  "DOCUMENT_REQUEST",
] as const;

export type RecycleEntityType = (typeof RECYCLE_ENTITY_TYPES)[number];

export const RECYCLE_BIN_HREF = "/settings/data-management/recycle-bin";
export const RECYCLE_BIN_LEADS_HREF = `${RECYCLE_BIN_HREF}?type=LEAD`;

export function isRecycleEntityType(value: unknown): value is RecycleEntityType {
  return (RECYCLE_ENTITY_TYPES as readonly unknown[]).includes(value);
}

export const RECYCLE_ENTITY_LABELS: Record<RecycleEntityType, string> = {
  LEAD: "Leads",
  CONTACT: "Contacts",
  COMPANY: "Companies",
  DEAL: "Deals",
  TASK: "Tasks",
  EMAIL: "Emails",
  MESSAGE: "Messages",
  DOCUMENT: "Documents",
  DOCUMENT_REQUEST: "Document requests",
};

export type CrmRecycleBinQuery = {
  entityType?: string;
  page?: number;
  limit?: number;
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

export function recycleBinPath(suffix = ""): string {
  return `/v1/recycle-bin${suffix}`;
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
    for (const key of ["items", "records", "rows", "result", "entries"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function moduleFromEntityType(entityType: string): string {
  const key = entityType.toLowerCase();
  const map: Record<string, string> = {
    lead: "sales.leads",
    contact: "sales.contacts",
    company: "sales.companies",
    deal: "sales.deals",
    quote: "finance.quotations",
    quotation: "finance.quotations",
    estimate: "finance.estimates",
    invoice: "finance.invoices",
    payment: "finance.payments",
    product: "finance.products",
    email: "activities.emails",
    note: "activities.notes",
    meeting: "activities.meetings",
    call: "activities.calls",
    document: "documents.library",
    document_request: "documents.requests",
    task: "activities.tasks",
    message: "activities.messages",
    ticket: "support.tickets",
  };
  return map[key] ?? `crm.${key}`;
}

export function entityTypeFromModule(module: string): string {
  const key = module.toLowerCase();
  if (key.includes("lead")) return "lead";
  if (key.includes("contact")) return "contact";
  if (key.includes("compan")) return "company";
  if (key.includes("deal")) return "deal";
  if (key.includes("quot")) return "quote";
  if (key.includes("estimate")) return "estimate";
  if (key.includes("invoice")) return "invoice";
  if (key.includes("payment")) return "payment";
  if (key.includes("product")) return "product";
  if (key.includes("email")) return "email";
  if (key.includes("note")) return "note";
  if (key.includes("meeting")) return "meeting";
  if (key.includes("call")) return "call";
  if (key.includes("document")) return "document";
  if (key.includes("ticket")) return "ticket";
  if (key.startsWith("crm.")) return key.slice(4);
  return module.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "record";
}

function formatWhen(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString("en-AU");
}

export function normalizeRecycleBinItem(
  raw: Record<string, unknown>,
  index: number,
): RecycleBinItem {
  const entityType = pickStr(
    raw.entityType,
    raw.type,
    raw.resource,
    raw.kind,
    "record",
  );
  const recordId = pickStr(raw.recordId, raw.entityId, raw.sourceId, raw.id);
  return {
    id: pickStr(raw.binId, raw.id) || `${entityType}:${recordId || index}`,
    module: moduleFromEntityType(entityType),
    recordId: recordId || `unknown-${index}`,
    recordLabel: pickStr(
      raw.recordLabel,
      raw.title,
      raw.name,
      raw.label,
      raw.subject,
      recordId || "Deleted record",
    ),
    recordType: pickStr(raw.recordType, entityType),
    deletedAt: formatWhen(raw.deletedAt ?? raw.deleted_at ?? raw.removedAt),
    deletedBy: pickStr(raw.deletedBy, raw.deleted_by, raw.actor, raw.user, "—"),
    entityType,
    snapshot: raw.snapshot ?? null,
  };
}

/** One entity type's page, raw, with only the parameters the API accepts. */
async function fetchRecords(
  entityType: string,
  query: CrmRecycleBinQuery,
): Promise<Record<string, unknown>[]> {
  const data = await crmWorkspaceFetch(
    recycleBinPath(
      toQuery({
        entityType: entityType.toUpperCase(),
        page: query.page ?? 1,
        limit: Math.min(query.limit ?? 100, 100),
      }),
    ),
  );
  return extractRecords(data);
}

function deletedTime(row: Record<string, unknown>): number {
  const parsed = Date.parse(pickStr(row.deletedAt, row.deleted_at));
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * The API lists one entity type per request, so "all types" is one request
 * per type, merged newest-deleted first. A type that fails is skipped, but
 * if every type fails the error surfaces instead of reading as an empty bin.
 */
export async function listCrmRecycleBin(
  query: CrmRecycleBinQuery = {},
): Promise<RecycleBinItem[]> {
  const types = query.entityType ? [query.entityType] : [...RECYCLE_ENTITY_TYPES];
  const pages = await Promise.allSettled(types.map((type) => fetchRecords(type, query)));
  const loaded = pages.flatMap((page) => (page.status === "fulfilled" ? [page.value] : []));
  if (loaded.length === 0) {
    const failure = pages.find((page) => page.status === "rejected");
    throw failure?.status === "rejected" && failure.reason instanceof Error
      ? failure.reason
      : new Error("Recycle bin unavailable");
  }
  const byKey = new Map<string, Record<string, unknown>>();
  for (const row of loaded.flat()) {
    byKey.set(`${pickStr(row.entityType)}:${pickStr(row.id)}`, row);
  }
  return [...byKey.values()]
    .sort((a, b) => deletedTime(b) - deletedTime(a))
    .map((row, index) => normalizeRecycleBinItem(row, index));
}

function recycleItemPath(entityType: string, id: string): string {
  return recycleBinPath(
    `/${encodeURIComponent(entityType)}/${encodeURIComponent(id)}`,
  );
}

export async function restoreCrmRecycleBinItem(
  entityType: string,
  id: string,
): Promise<void> {
  await crmWorkspaceFetch(`${recycleItemPath(entityType, id)}/restore`, {
    method: "POST",
    body: "{}",
  });
}

export async function purgeCrmRecycleBinItem(
  entityType: string,
  id: string,
): Promise<void> {
  await crmWorkspaceFetch(recycleItemPath(entityType, id), {
    method: "DELETE",
  });
}

/** The API's spelling (LEAD, DEAL, …), which restore and purge require. */
export function recycleEntityTypeOf(item: RecycleBinItem): string {
  return (item.entityType?.trim() || entityTypeFromModule(item.module)).toUpperCase();
}
