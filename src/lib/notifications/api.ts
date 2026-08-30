import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import { formatRulesAt } from "@/lib/rules/storage";
import {
  type AppNotification,
  type NotificationStatus,
  type NotificationType,
  upsertNotification,
} from "@/lib/notifications/types";

export function workspaceNotificationsPath(
  workspaceId: string,
  suffix = "",
): string {
  return `/v1/workspaces/${workspaceId}/notifications${suffix}`;
}

export function globalNotificationsPath(suffix = ""): string {
  return `/v1/notifications${suffix}`;
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
      "notifications",
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

export function mapNotificationType(raw: string): NotificationType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("mention")) return "Mention";
  if (value.includes("task")) return "Task Assigned";
  if (value.includes("deal") && value.includes("won")) return "Deal Won";
  if (value.includes("lead")) return "Lead Assigned";
  if (value.includes("meeting")) return "Meeting Reminder";
  if (value.includes("ticket")) return "Ticket Updated";
  if (value.includes("campaign")) return "Campaign Sent";
  return "System Alert";
}

export function mapNotificationStatus(raw: string): NotificationStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("dismiss") || value.includes("archive")) return "Dismissed";
  if (value.includes("unread") || value.includes("new")) return "Unread";
  return "Read";
}

function relatedHref(relatedType: string, relatedId: string): string {
  const kind = relatedType.toLowerCase();
  if (kind.includes("lead")) return relatedId ? `/sales/leads/${relatedId}` : "/sales/leads";
  if (kind.includes("deal")) return relatedId ? `/sales/deals/${relatedId}` : "/sales/deals";
  if (kind.includes("contact")) return relatedId ? `/sales/contacts/${relatedId}` : "/sales/contacts";
  if (kind.includes("compan")) return relatedId ? `/sales/companies/${relatedId}` : "/sales/companies";
  if (kind.includes("meeting")) return relatedId ? `/activities/meetings/detail/${relatedId}` : "/activities/meetings";
  if (kind.includes("task")) return "/activities/tasks";
  if (kind.includes("ticket")) return "/support";
  if (kind.includes("campaign")) return "/marketing/email";
  return "/notifications";
}

function formatWhen(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return formatRulesAt(new Date(parsed));
}

export function normalizeNotification(
  raw: Record<string, unknown>,
  index: number,
): AppNotification {
  const related =
    raw.relatedTo && typeof raw.relatedTo === "object"
      ? (raw.relatedTo as Record<string, unknown>)
      : null;
  const relatedType = pickStr(raw.relatedType, related && related.type);
  const relatedId = pickStr(raw.relatedId, related && related.id);
  const id = pickStr(raw.id, raw.notificationId, raw.uuid) || `crm-ntf-${index}`;
  return {
    id,
    notificationId: pickStr(raw.code, raw.notificationId, raw.reference, id),
    type: mapNotificationType(pickStr(raw.type, raw.kind, raw.eventType, "SYSTEM")),
    title: pickStr(raw.title, raw.subject, raw.name, "Notification"),
    message: pickStr(raw.message, raw.body, raw.text, raw.content, ""),
    relatedTo:
      pickStr(
        related && pickStr(related.name, related.title, related.label),
        raw.relatedName,
        relatedType && relatedId ? `${relatedType}: ${relatedId}` : "",
        typeof raw.relatedTo === "string" ? raw.relatedTo : "",
      ) || "—",
    relatedHref: relatedHref(relatedType, relatedId),
    recipient: pickStr(raw.recipient, raw.userName, raw.to, "You"),
    status: mapNotificationStatus(pickStr(raw.status, raw.state, "UNREAD")),
    sentAt: formatWhen(raw.sentAt ?? raw.createdAt ?? raw.insertedAt),
    readAt: formatWhen(raw.readAt ?? raw.readDate) || undefined,
  };
}

export function normalizeNotifications(data: unknown): AppNotification[] {
  return extractRecords(data).map((row, index) =>
    normalizeNotification(row, index),
  );
}

function asCount(data: unknown): number {
  if (typeof data === "number" && Number.isFinite(data)) return data;
  if (Array.isArray(data) && data.length === 2 && typeof data[1] === "number") {
    return data[1];
  }
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["count", "unreadCount", "unread", "total"]) {
      if (typeof rec[key] === "number") return rec[key] as number;
    }
    if (rec.data != null && rec.data !== data) return asCount(rec.data);
  }
  return 0;
}

function asNotification(data: unknown): AppNotification | null {
  const items = normalizeNotifications(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeNotification(data as Record<string, unknown>, 0);
  }
  return null;
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
  if (!access) throw new Error("Sign in to manage notifications");
  return run(access, false);
}

function notificationsUrl(
  session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
  scoped: boolean,
  suffix: string,
) {
  return scoped
    ? workspaceNotificationsPath((session as CrmSession).workspaceId, suffix)
    : globalNotificationsPath(suffix);
}

async function notificationsGet(suffix: string, query = ""): Promise<unknown> {
  return withSession((session, scoped) =>
    crmFetch(session, `${notificationsUrl(session, scoped, suffix)}${query}`),
  );
}

async function notificationsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  return withSession((session, scoped) =>
    crmFetch(session, notificationsUrl(session, scoped, suffix), init),
  );
}

export async function listCrmNotifications(): Promise<AppNotification[]> {
  return normalizeNotifications(
    await notificationsGet("", toQuery({ limit: 100 })),
  );
}

export async function getCrmUnreadCount(): Promise<number> {
  return asCount(await notificationsGet("/unread-count"));
}

export async function getCrmNotification(
  id: string,
): Promise<AppNotification | null> {
  return asNotification(await notificationsGet(`/${id}`));
}

export async function markAllCrmNotificationsRead(): Promise<void> {
  try {
    await notificationsMutate("/read-all", { method: "POST", body: "{}" });
  } catch {
    await notificationsMutate("/read-all", { method: "PATCH", body: "{}" });
  }
}

export async function markCrmNotificationRead(
  id: string,
): Promise<AppNotification | null> {
  try {
    return asNotification(
      await notificationsMutate(`/${id}/read`, { method: "POST", body: "{}" }),
    );
  } catch {
    return asNotification(
      await notificationsMutate(`/${id}/read`, { method: "PATCH", body: "{}" }),
    );
  }
}

export async function markCrmNotificationUnread(
  id: string,
): Promise<AppNotification | null> {
  return asNotification(
    await notificationsMutate(`/${id}/unread`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function dismissCrmNotification(
  id: string,
): Promise<AppNotification | null> {
  return asNotification(
    await notificationsMutate(`/${id}/dismiss`, {
      method: "PATCH",
      body: "{}",
    }),
  );
}

export async function clearReadCrmNotifications(): Promise<void> {
  await notificationsMutate("/clear-read", { method: "DELETE" });
}

export async function archiveCrmNotification(id: string): Promise<void> {
  await notificationsMutate(`/${id}`, { method: "DELETE" });
}

export async function tryCrmNotification<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteNotification(row: AppNotification | null) {
  if (row) upsertNotification(row);
  return row;
}

export function isCrmNotificationId(id: string): boolean {
  return isUuid(id);
}
