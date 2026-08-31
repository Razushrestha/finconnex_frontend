/**
 * Work Queue CRM client — GET /v1/workspaces/{workspaceId}/work-queue
 */

import {
  ensureCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type { ActivityNavId } from "@/lib/work-queue/config";
import {
  dueColorForLabel,
  formatDueLabel,
  type QueueRow,
  type WorkQueueTimeFilter,
} from "@/lib/work-queue/live";

export type CrmWorkQueueItemType =
  | "TASK"
  | "CALL"
  | "MEETING"
  | "REMINDER"
  | "MESSAGE"
  | "EMAIL"
  | "CHAT"
  | "CALENDLY_ALERT";

export type CrmWorkQueueUrgency =
  | "FAILED"
  | "OVERDUE"
  | "DUE_NOW"
  | "MENTIONED"
  | "UPCOMING"
  | "UNREAD"
  | "NORMAL";

export type CrmWorkQueueRelatedTo = {
  kind: "LEAD" | "CONTACT" | "COMPANY" | "DEAL";
  id: string;
  name: string;
};

export type CrmWorkQueueItem = {
  id: string;
  type: CrmWorkQueueItemType;
  sourceId: string;
  title: string;
  status: string;
  urgency: CrmWorkQueueUrgency;
  priority: string | null;
  dueAt: string | null;
  createdAt: string;
  assigneeId: string;
  assigneeName?: string | null;
  contactName?: string | null;
  fileHandler?: string | null;
  tag?: string | null;
  createdByName?: string | null;
  modifiedByName?: string | null;
  modifiedAt?: string | null;
  closedAt?: string | null;
  description?: string | null;
  lastActivityAt?: string | null;
  relatedTo?: CrmWorkQueueRelatedTo | null;
  unreadCount?: number;
  mentioned?: boolean;
  deepLink: { resource: string; id: string };
};

export type CrmWorkQueueQuery = {
  page?: number;
  limit?: number;
  type?: CrmWorkQueueItemType;
  status?: string;
  priority?: string;
  assigneeId?: string;
  from?: string;
  to?: string;
  nameById?: Record<string, string>;
};

export type CrmWorkQueuePage = {
  items: QueueRow[];
  total: number;
};

export function workspaceWorkQueuePath(workspaceId: string, query = ""): string {
  return `/v1/workspaces/${workspaceId}/work-queue${query}`;
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

function formatQueueDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString("en-AU");
}

function parseRelatedTo(raw: unknown): CrmWorkQueueRelatedTo | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const kind = pickStr(rec.kind).toUpperCase();
  const id = pickStr(rec.id);
  const name = pickStr(rec.name);
  if (!id || !name) return null;
  if (
    kind !== "LEAD" &&
    kind !== "CONTACT" &&
    kind !== "COMPANY" &&
    kind !== "DEAL"
  ) {
    return null;
  }
  return { kind, id, name };
}

function relatedLabel(
  relatedTo: CrmWorkQueueRelatedTo | null,
  type: string,
): string {
  if (relatedTo?.name) {
    return `${prettyLabel(relatedTo.kind)}: ${relatedTo.name}`;
  }
  return prettyLabel(type);
}

function prettyLabel(raw: string): string {
  if (!raw) return "";
  if (raw.includes(" ") && raw !== raw.toUpperCase()) return raw;
  return raw
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function mondayOfWeek(d: Date) {
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(d), mondayOffset);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Map UI labels like "In Progress" / "High" to API enums. */
export function toWorkQueueApiFilter(label: string | undefined): string | undefined {
  if (!label || label === "all") return undefined;
  return label.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function assigneeIdFromScope(
  scope: string | undefined,
  nameById?: Record<string, string>,
): string | undefined {
  if (!scope) return undefined;
  if (isUuid(scope)) return scope;
  if (!nameById) return undefined;
  const key = scope.trim().toLowerCase();
  for (const [id, name] of Object.entries(nameById)) {
    if (name.trim().toLowerCase() === key && isUuid(id)) return id;
  }
  return undefined;
}

export function rangeForTimeFilter(
  filter: WorkQueueTimeFilter,
  now = new Date(),
  specificDate?: Date,
): { from?: string; to?: string } {
  if (filter === "all") return {};
  if (filter === "today") {
    return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  }
  if (filter === "tomorrow") {
    const day = addDays(startOfDay(now), 1);
    return { from: day.toISOString(), to: endOfDay(day).toISOString() };
  }
  if (filter === "overdue") {
    return {
      from: addDays(startOfDay(now), -3650).toISOString(),
      to: new Date(startOfDay(now).getTime() - 1).toISOString(),
    };
  }
  if (filter === "today-overdue") {
    return {
      from: addDays(startOfDay(now), -3650).toISOString(),
      to: endOfDay(now).toISOString(),
    };
  }
  if (filter === "this-week") {
    const monday = mondayOfWeek(now);
    return {
      from: monday.toISOString(),
      to: endOfDay(addDays(monday, 6)).toISOString(),
    };
  }
  if (filter === "next-week") {
    const next = addDays(mondayOfWeek(now), 7);
    return {
      from: next.toISOString(),
      to: endOfDay(addDays(next, 6)).toISOString(),
    };
  }
  if (filter === "this-month") {
    return {
      from: startOfMonth(now).toISOString(),
      to: endOfMonth(now).toISOString(),
    };
  }
  if (filter === "next-month") {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      from: startOfMonth(next).toISOString(),
      to: endOfMonth(next).toISOString(),
    };
  }
  if (filter === "specific-date") {
    const day = specificDate ?? now;
    return {
      from: startOfDay(day).toISOString(),
      to: endOfDay(day).toISOString(),
    };
  }
  return {};
}

export function navToWorkQueueTypes(
  nav: string,
): CrmWorkQueueItemType[] | null {
  if (nav === "tasks") return ["TASK"];
  if (nav === "calls") return ["CALL"];
  if (nav === "meetings") return ["MEETING", "CALENDLY_ALERT"];
  if (nav === "emails") return ["EMAIL"];
  if (nav === "messages") return ["MESSAGE", "CHAT"];
  if (nav === "reminders") return ["REMINDER"];
  return null;
}

export function hrefFromWorkQueueDeepLink(
  resource: string,
  id: string,
  title?: string,
): string {
  const key = resource.split("/")[0] ?? resource;
  if (key === "meetings") return `/activities/meetings/detail/${id}`;
  if (key === "chat") return "/activities/team-chat";
  if (key === "integrations" || resource.includes("calendly")) {
    return "/activities/calendar";
  }
  const bases: Record<string, string> = {
    tasks: "/activities/tasks",
    calls: "/activities/calls",
    emails: "/activities/emails",
    messages: "/activities/messages",
    reminders: "/activities/reminders",
  };
  const base = bases[key] ?? "/work-queue";
  const params = new URLSearchParams();
  params.set("focus", id);
  if (title) params.set("q", title);
  return `${base}?${params.toString()}`;
}

function dueLabelForItem(item: CrmWorkQueueItem, now: Date): string {
  if (item.dueAt) {
    const due = new Date(item.dueAt);
    if (!Number.isNaN(due.getTime())) return formatDueLabel(due, now);
  }
  if (item.urgency === "OVERDUE" || item.urgency === "FAILED") return "overdue";
  if (item.urgency === "DUE_NOW") return "Today";
  if (item.urgency === "UNREAD") return "Unread";
  if (item.urgency === "MENTIONED") return "Mentioned";
  return "";
}

export function normalizeCrmWorkQueueItem(
  raw: Record<string, unknown>,
  now = new Date(),
  nameById?: Record<string, string>,
): QueueRow {
  const deep =
    raw.deepLink && typeof raw.deepLink === "object"
      ? (raw.deepLink as Record<string, unknown>)
      : {};
  const sourceId = pickStr(raw.sourceId, deep.id, raw.id);
  const resource = pickStr(deep.resource, String(raw.type ?? "").toLowerCase());
  const title = pickStr(raw.title, raw.subject, "Untitled");
  const dueAt = pickStr(raw.dueAt) || null;
  const urgency = pickStr(raw.urgency).toUpperCase() as CrmWorkQueueUrgency;
  const relatedTo = parseRelatedTo(raw.relatedTo);
  const item: CrmWorkQueueItem = {
    id: pickStr(raw.id) || `${raw.type}:${sourceId}`,
    type: (pickStr(raw.type).toUpperCase() || "TASK") as CrmWorkQueueItemType,
    sourceId,
    title,
    status: pickStr(raw.status),
    urgency: urgency || "NORMAL",
    priority: pickStr(raw.priority) || null,
    dueAt,
    createdAt: pickStr(raw.createdAt),
    assigneeId: pickStr(raw.assigneeId),
    assigneeName: pickStr(raw.assigneeName) || null,
    contactName: pickStr(raw.contactName) || null,
    fileHandler: pickStr(raw.fileHandler) || null,
    tag: pickStr(raw.tag) || null,
    createdByName: pickStr(raw.createdByName) || null,
    modifiedByName: pickStr(raw.modifiedByName) || null,
    modifiedAt: pickStr(raw.modifiedAt) || null,
    closedAt: pickStr(raw.closedAt) || null,
    description: pickStr(raw.description) || null,
    lastActivityAt: pickStr(raw.lastActivityAt) || null,
    relatedTo,
    unreadCount:
      typeof raw.unreadCount === "number" ? raw.unreadCount : undefined,
    mentioned: Boolean(raw.mentioned),
    deepLink: { resource, id: pickStr(deep.id, sourceId) },
  };
  const dueLabel = dueLabelForItem(item, now);
  const due = dueAt ? new Date(dueAt) : null;
  const dueMs = due && !Number.isNaN(due.getTime()) ? due.getTime() : Date.now();
  const ownerName =
    item.assigneeName ||
    (item.assigneeId && nameById?.[item.assigneeId]) ||
    item.assigneeId;
  return {
    id: item.sourceId || item.id,
    subject: item.title,
    dueLabel,
    dueColor: dueColorForLabel(dueLabel),
    status: prettyLabel(item.status),
    priority: prettyLabel(item.priority ?? "") || "",
    related: relatedLabel(item.relatedTo ?? null, item.type),
    contactName: item.contactName || undefined,
    fileHandler: item.fileHandler || ownerName || undefined,
    tag: item.tag || undefined,
    taskOwner: ownerName,
    assigneeId: item.assigneeId || undefined,
    createdTime: formatQueueDate(item.createdAt),
    createdBy: item.createdByName || undefined,
    modifiedBy: item.modifiedByName || undefined,
    modifiedTime: formatQueueDate(item.modifiedAt),
    closedTime: formatQueueDate(item.closedAt),
    description: item.description || undefined,
    lastActivityTime: formatQueueDate(item.lastActivityAt),
    unreadCount: item.unreadCount,
    mentioned: item.mentioned,
    sortKey: dueMs,
    href: hrefFromWorkQueueDeepLink(
      item.deepLink.resource,
      item.deepLink.id,
      item.title,
    ),
  };
}

function extractPage(data: unknown): {
  records: Record<string, unknown>[];
  total: number;
} {
  if (!data) return { records: [], total: 0 };
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      const records = (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
      return { records, total: typeof data[1] === "number" ? data[1] : records.length };
    }
    const records = data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
    return { records, total: records.length };
  }
  if (typeof data === "object") {
    const rec = data as {
      items?: unknown;
      data?: unknown;
      metadata?: { totalItems?: number };
    };
    if (Array.isArray(rec.items)) {
      const nested = extractPage(rec.items);
      return {
        records: nested.records,
        total: rec.metadata?.totalItems ?? nested.total,
      };
    }
    if (rec.data != null) return extractPage(rec.data);
  }
  return { records: [], total: 0 };
}

export async function listCrmWorkQueue(
  query: CrmWorkQueueQuery = {},
): Promise<CrmWorkQueuePage> {
  const session: CrmSession | null = await ensureCrmSession();
  if (!session) throw new Error("Sign in with a workspace to load the work queue");
  const path = workspaceWorkQueuePath(
    session.workspaceId,
    toQuery({
      page: query.page ?? 1,
      limit: query.limit ?? 50,
      type: query.type,
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId && isUuid(query.assigneeId)
        ? query.assigneeId
        : undefined,
      from: query.from,
      to: query.to,
    }),
  );
  const data = await crmFetch(session, path);
  const page = extractPage(data);
  const now = new Date();
  return {
    items: page.records.map((row) =>
      normalizeCrmWorkQueueItem(row, now, query.nameById),
    ),
    total: page.total,
  };
}

export async function listCrmWorkQueueForNav(
  nav: ActivityNavId,
  opts: {
    scope?: string;
    timeFilter?: WorkQueueTimeFilter;
    specificDate?: Date;
    status?: string;
    priority?: string;
    nameById?: Record<string, string>;
  } = {},
): Promise<CrmWorkQueuePage> {
  const types = navToWorkQueueTypes(nav);
  if (!types) return { items: [], total: 0 };
  const range = rangeForTimeFilter(
    opts.timeFilter ?? "today-overdue",
    new Date(),
    opts.specificDate,
  );
  const pages = await Promise.all(
    types.map((type) =>
      listCrmWorkQueue({
        type,
        limit: 50,
        page: 1,
        status: toWorkQueueApiFilter(opts.status),
        priority: toWorkQueueApiFilter(opts.priority),
        assigneeId: assigneeIdFromScope(opts.scope, opts.nameById),
        from: range.from,
        to: range.to,
        nameById: opts.nameById,
      }),
    ),
  );
  const byId = new Map<string, QueueRow>();
  for (const page of pages) {
    for (const row of page.items) byId.set(row.id, row);
  }
  const items = Array.from(byId.values());
  return { items, total: items.length };
}

export async function tryCrmWorkQueue<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
