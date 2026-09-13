import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";

export type AuditLogRow = {
  id: string;
  action: string;
  actor: string;
  entityType: string;
  entityId: string;
  summary: string;
  ip: string;
  createdAt: string;
};

export type AuditLogPage = {
  items: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
};

export type AuditLogQuery = {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entityType?: string;
};

type Paginated<T> = {
  items?: T[];
  metadata?: {
    currentPage?: number;
    itemsPerPage?: number;
    totalItems?: number;
  };
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asItems(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return data[0] as Record<string, unknown>[];
    }
    return data as Record<string, unknown>[];
  }
  if (typeof data === "object" && data !== null && "items" in data) {
    const items = (data as Paginated<Record<string, unknown>>).items;
    return Array.isArray(items) ? items : [];
  }
  return [];
}

function asTotal(data: unknown, fallback: number): number {
  if (Array.isArray(data) && data.length === 2 && typeof data[1] === "number") {
    return data[1];
  }
  if (data && typeof data === "object" && "metadata" in data) {
    const total = (data as Paginated<unknown>).metadata?.totalItems;
    if (typeof total === "number") return total;
  }
  return fallback;
}

export function normalizeAuditLog(raw: Record<string, unknown>, index: number): AuditLogRow {
  return {
    id: pickStr(raw.id, raw.uuid) || `audit-${index}`,
    action: pickStr(raw.action, raw.event, raw.type, raw.operation, "—"),
    actor: pickStr(
      raw.actorEmail,
      raw.actorName,
      raw.userEmail,
      raw.actor,
      raw.user,
      raw.actorId,
      raw.userId,
      "—",
    ),
    entityType: pickStr(
      raw.entityType,
      raw.resource,
      raw.module,
      raw.targetType,
      "—",
    ),
    entityId: pickStr(raw.entityId, raw.resourceId, raw.targetId, raw.recordId),
    summary: pickStr(raw.summary, raw.description, raw.message, raw.action),
    ip: pickStr(raw.ip, raw.ipAddress, raw.ipHash),
    createdAt: pickStr(
      raw.createdAt,
      raw.occurredAt,
      raw.timestamp,
      raw.at,
    ),
  };
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

export async function listAuditLogs(
  query: AuditLogQuery = {},
): Promise<AuditLogPage> {
  const auth = await resolveAuth();
  if (!auth) {
    throw new Error("Sign in to load audit logs");
  }

  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 50));
  if (query.entityType?.trim()) params.set("entityType", query.entityType.trim());

  const path = `/v1/audit-logs?${params.toString()}`;
  const data = isBoundCrmSession()
    ? await crmFetch<unknown>(auth, path)
    : await crmBffFetch<unknown>(path);
  const rawItems = asItems(data);
  let items = rawItems.map((row, index) => normalizeAuditLog(row, index));
  const needle = query.search?.trim().toLowerCase();
  if (needle) {
    items = items.filter((row) =>
      [row.action, row.actor, row.entityType, row.summary]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }
  return {
    items,
    total: needle ? items.length : asTotal(data, items.length),
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  };
}

export async function listAuthSecurityEvents(
  query: { page?: number; limit?: number } = {},
): Promise<AuditLogPage> {
  const auth = await resolveAuth();
  if (!auth) {
    throw new Error("Sign in to load login history");
  }

  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 20));
  const path = `/v1/audit-logs/auth-security-events?${params.toString()}`;
  const data = isBoundCrmSession()
    ? await crmFetch<unknown>(auth, path)
    : await crmBffFetch<unknown>(path);
  const rawItems = asItems(data);
  const items = rawItems.map((row, index) =>
    normalizeAuditLog(
      {
        ...row,
        action: pickStr(row.event, row.action, "AUTH"),
        summary: pickStr(row.event, row.summary, "Authentication event"),
        ip: pickStr(row.ipHash, row.ip),
        actor: pickStr(row.userId, row.identityHash, "—"),
      },
      index,
    ),
  );
  return {
    items,
    total: asTotal(data, items.length),
    page: query.page ?? 1,
    limit: query.limit ?? 20,
  };
}
