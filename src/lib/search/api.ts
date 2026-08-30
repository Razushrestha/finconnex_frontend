/**
 * Workspace record search — GET /v1/workspaces/{workspaceId}/search/records
 */

import { ensureCrmSession, type CrmSession } from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";

export type CrmRecordSearchHit = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type CrmRecordSearchQuery = {
  q: string;
  page?: number;
  limit?: number;
  type?: string;
};

export function workspaceRecordSearchPath(
  workspaceId: string,
  query = "",
): string {
  return `/v1/workspaces/${workspaceId}/search/records${query}`;
}

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

export function hrefForRecordType(type: string, id: string): string {
  const key = type.toLowerCase().replace(/[_-]+/g, "");
  if (key.includes("lead")) return `/sales/leads/detail/${id}`;
  if (key.includes("contact")) return `/sales/contacts/detail/${id}`;
  if (key.includes("compan")) return `/sales/companies?focus=${id}`;
  if (key.includes("deal") || key.includes("opportunit")) {
    return `/sales/deals/detail/${id}`;
  }
  if (key.includes("quote") || key.includes("quotation")) {
    return `/finance/quotations/${id}`;
  }
  if (key.includes("estimate")) return `/finance/estimates/${id}`;
  if (key.includes("invoice")) return `/finance/invoices/${id}`;
  if (key.includes("payment")) return `/finance/payments/${id}`;
  if (key.includes("credit")) return `/finance/credit-notes/${id}`;
  if (key.includes("product")) return `/finance/products`;
  if (key.includes("email")) return `/activities/emails/detail/${id}`;
  if (key.includes("note")) return `/activities/notes/detail/${id}`;
  if (key.includes("meeting")) return `/activities/meetings/detail/${id}`;
  if (key.includes("call")) return `/activities/calls/detail/${id}`;
  if (key.includes("task")) return `/activities/tasks/detail/${id}`;
  if (key.includes("message")) return `/activities/messages`;
  if (key.includes("documentrequest")) return `/documents/requests`;
  if (key.includes("document")) return `/documents/library`;
  if (key.includes("ticket")) return `/support`;
  return `/`;
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
      "records",
      "results",
      "hits",
      "rows",
      "summaries",
    ]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function normalizeRecordSearchHit(
  raw: Record<string, unknown>,
  index: number,
): CrmRecordSearchHit {
  const type = pickStr(raw.type, raw.entity, raw.resource, raw.kind, "record");
  const id = pickStr(raw.id, raw.recordId, raw.uuid, raw.sourceId) || `hit-${index}`;
  const title = pickStr(raw.title, raw.name, raw.subject, raw.label, "Untitled");
  const subtitle = pickStr(
    raw.subtitle,
    raw.summary,
    raw.email,
    raw.clientName,
    raw.description,
  );
  const href =
    pickStr(raw.href, raw.url, raw.path) || hrefForRecordType(type, id);
  return { id, type, title, subtitle: subtitle || undefined, href };
}

export async function searchCrmRecords(
  query: CrmRecordSearchQuery,
): Promise<CrmRecordSearchHit[]> {
  const q = query.q.trim();
  if (!q) return [];
  const session: CrmSession | null = await ensureCrmSession();
  if (!session) throw new Error("Sign in with a workspace to search records");
  const path = workspaceRecordSearchPath(
    session.workspaceId,
    toQuery({
      q,
      query: q,
      search: q,
      page: query.page ?? 1,
      limit: query.limit ?? 12,
      type: query.type,
    }),
  );
  const data = await crmFetch(session, path);
  return extractRecords(data).map((row, index) =>
    normalizeRecordSearchHit(row, index),
  );
}
