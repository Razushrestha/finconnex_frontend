import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type { RecycleBinItem } from "@/lib/rules/soft-delete";

export const RECYCLE_ENTITY_TYPES = [
  "lead",
  "contact",
  "company",
  "deal",
  "quote",
  "estimate",
  "invoice",
  "payment",
  "product",
  "email",
  "note",
  "meeting",
  "call",
  "document",
  "ticket",
] as const;

export type RecycleEntityType = (typeof RECYCLE_ENTITY_TYPES)[number];

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

async function fetchList(query: CrmRecycleBinQuery): Promise<RecycleBinItem[]> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load the recycle bin");
  const data = await crmFetch(
    auth,
    recycleBinPath(
      toQuery({
        page: query.page ?? 1,
        limit: query.limit ?? 100,
        entityType: query.entityType,
        type: query.entityType,
      }),
    ),
  );
  return extractRecords(data).map((row, index) =>
    normalizeRecycleBinItem(row, index),
  );
}

export async function listCrmRecycleBin(
  query: CrmRecycleBinQuery = {},
): Promise<RecycleBinItem[]> {
  if (query.entityType) return fetchList(query);
  try {
    return await fetchList(query);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (!/entitytype|type|required|bad request/i.test(message)) throw err;
    const pages = await Promise.allSettled(
      RECYCLE_ENTITY_TYPES.map((entityType) =>
        fetchList({ ...query, entityType }),
      ),
    );
    const byKey = new Map<string, RecycleBinItem>();
    for (const page of pages) {
      if (page.status !== "fulfilled") continue;
      for (const row of page.value) {
        byKey.set(`${row.entityType}:${row.recordId}`, row);
      }
    }
    return Array.from(byKey.values());
  }
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
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to restore this record");
  await crmFetch(auth, `${recycleItemPath(entityType, id)}/restore`, {
    method: "POST",
    body: "{}",
  });
}

export async function purgeCrmRecycleBinItem(
  entityType: string,
  id: string,
): Promise<void> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to permanently delete this record");
  await crmFetch(auth, recycleItemPath(entityType, id), {
    method: "DELETE",
  });
}

export function recycleEntityTypeOf(item: RecycleBinItem): string {
  return item.entityType?.trim() || entityTypeFromModule(item.module);
}
