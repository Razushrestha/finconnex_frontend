import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import {
  type NotificationMethod,
  type Reminder,
  type ReminderStatus,
  type ReminderType,
} from "@/lib/reminders/types";
import { upsertReminder } from "@/lib/reminders/store";

export type CrmReminderQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type ReminderCapabilities = {
  channels: string[];
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

export function workspaceRemindersPath(
  workspaceId: string,
  suffix = "",
): string {
  return `/v1/workspaces/${workspaceId}/reminders${suffix}`;
}

export function globalRemindersPath(suffix = ""): string {
  return `/v1/reminders${suffix}`;
}

export function relatedRemindersPath(
  workspaceId: string,
  parentType: string,
  parentId: string,
): string {
  return `/v1/workspaces/${workspaceId}/${parentType}/${parentId}/reminders`;
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
    for (const key of ["items", "reminders", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function mapReminderStatus(raw: string): ReminderStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("snooze")) return "Snoozed";
  if (value.includes("dismiss") || value.includes("cancel")) return "Dismissed";
  if (
    value.includes("trigger") ||
    value.includes("complete") ||
    value.includes("sent") ||
    value.includes("fired")
  ) {
    return "Triggered";
  }
  return "Pending";
}

export function mapReminderType(raw: string): ReminderType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("task")) return "Task Due";
  if (value.includes("meeting")) return "Meeting Start";
  if (value.includes("follow")) return "Follow-up";
  return "Custom";
}

export function mapNotificationMethod(raw: string): NotificationMethod {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("email")) return "Email";
  if (value.includes("sms") || value.includes("text")) return "SMS";
  if (value.includes("push") || value.includes("web")) return "Web Push";
  return "In-app";
}

function formatWhen(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function normalizeReminder(
  raw: Record<string, unknown>,
  index: number,
): Reminder {
  const related =
    raw.related && typeof raw.related === "object"
      ? (raw.related as Record<string, unknown>)
      : null;
  const owner =
    raw.owner && typeof raw.owner === "object"
      ? (raw.owner as Record<string, unknown>)
      : null;
  const channel = pickStr(
    raw.notificationMethod,
    raw.channel,
    Array.isArray(raw.channels) ? String(raw.channels[0] ?? "") : "",
    "IN_APP",
  );
  return {
    id: pickStr(raw.id, raw.uuid, raw.reminderId) || `crm-rem-${index}`,
    title: pickStr(raw.title, raw.subject, raw.name, "Reminder"),
    relatedTo:
      pickStr(
        raw.relatedTo,
        related && pickStr(related.name, related.title, related.label),
      ) || undefined,
    dateTime: formatWhen(
      raw.dueAt ?? raw.remindAt ?? raw.scheduledAt ?? raw.dateTime ?? raw.when,
    ),
    type: mapReminderType(pickStr(raw.type, raw.kind, "CUSTOM")),
    status: mapReminderStatus(pickStr(raw.status, raw.state, "PENDING")),
    notificationMethod: mapNotificationMethod(channel),
    owner: pickStr(
      owner && pickStr(owner.name, owner.fullName, owner.email),
      raw.ownerName,
      raw.createdBy,
      "—",
    ),
  };
}

export function normalizeReminders(data: unknown): Reminder[] {
  return extractRecords(data).map((row, index) => normalizeReminder(row, index));
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
  if (!access) throw new Error("Sign in to manage reminders");
  return run(access, false);
}

function remindersUrl(
  session: CrmSession | Pick<CrmSession, "baseUrl" | "accessToken">,
  scoped: boolean,
  suffix: string,
) {
  return scoped
    ? workspaceRemindersPath((session as CrmSession).workspaceId, suffix)
    : globalRemindersPath(suffix);
}

async function remindersGet(suffix: string, query = ""): Promise<unknown> {
  return withSession((session, scoped) =>
    crmFetch(session, `${remindersUrl(session, scoped, suffix)}${query}`),
  );
}

async function remindersMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  return withSession((session, scoped) =>
    crmFetch(session, remindersUrl(session, scoped, suffix), init),
  );
}

function asReminder(data: unknown): Reminder | null {
  const items = normalizeReminders(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeReminder(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmReminders(
  query: CrmReminderQuery = {},
): Promise<Reminder[]> {
  return normalizeReminders(
    await remindersGet(
      "",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
      }),
    ),
  );
}

export async function listCrmMyReminders(
  query: CrmReminderQuery = {},
): Promise<Reminder[]> {
  return normalizeReminders(
    await remindersGet(
      "/my",
      toQuery({ page: query.page, limit: query.limit ?? 100 }),
    ),
  );
}

export async function listCrmUpcomingReminders(): Promise<Reminder[]> {
  return normalizeReminders(await remindersGet("/upcoming"));
}

export async function listCrmOverdueReminders(): Promise<Reminder[]> {
  return normalizeReminders(await remindersGet("/overdue"));
}

export async function getCrmReminderCapabilities(): Promise<ReminderCapabilities> {
  const data = await remindersGet("/capabilities");
  const rec =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const channels = Array.isArray(rec.channels)
    ? rec.channels.map(String)
    : Array.isArray(rec.methods)
      ? rec.methods.map(String)
      : [];
  return { channels };
}

export async function getCrmReminder(id: string): Promise<Reminder | null> {
  return asReminder(await remindersGet(`/${id}`));
}

export function toCreateReminderBody(input: {
  title: string;
  notes?: string;
  dueAt: string;
  type?: ReminderType;
  notificationMethod?: NotificationMethod;
  relatedTo?: string;
  relatedType?: string;
  relatedId?: string;
  owner?: string;
}): Record<string, unknown> {
  const channel = (input.notificationMethod ?? "In-app")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  const type = (input.type ?? "Custom").toUpperCase().replace(/[\s-]+/g, "_");
  const relatedId =
    input.relatedId && isUuid(input.relatedId) ? input.relatedId : undefined;
  return {
    title: input.title,
    subject: input.title,
    notes: input.notes,
    description: input.notes,
    dueAt: input.dueAt,
    remindAt: input.dueAt,
    scheduledAt: input.dueAt,
    type,
    notificationMethod: channel,
    channel,
    channels: [channel],
    relatedTo: input.relatedTo,
    relatedType: input.relatedType,
    relatedId,
    ownerName: input.owner,
  };
}

export async function createCrmReminder(
  body: Record<string, unknown>,
): Promise<Reminder | null> {
  return asReminder(
    await remindersMutate("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmReminder(
  id: string,
  patch: Record<string, unknown>,
): Promise<Reminder | null> {
  return asReminder(
    await remindersMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function dismissCrmReminder(id: string): Promise<void> {
  await remindersMutate(`/${id}`, { method: "DELETE" });
}

export async function snoozeCrmReminder(
  id: string,
  until?: string,
): Promise<Reminder | null> {
  return asReminder(
    await remindersMutate(`/${id}/snooze`, {
      method: "POST",
      body: JSON.stringify({
        until,
        snoozeUntil: until,
        minutes: until ? undefined : 60,
      }),
    }),
  );
}

export async function rescheduleCrmReminder(
  id: string,
  dueAt: string,
): Promise<Reminder | null> {
  return asReminder(
    await remindersMutate(`/${id}/reschedule`, {
      method: "POST",
      body: JSON.stringify({ dueAt, remindAt: dueAt, scheduledAt: dueAt }),
    }),
  );
}

export async function completeCrmReminder(id: string): Promise<Reminder | null> {
  return asReminder(
    await remindersMutate(`/${id}/complete`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function cancelCrmReminder(id: string): Promise<Reminder | null> {
  return asReminder(
    await remindersMutate(`/${id}/cancel`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function listRelatedCrmReminders(
  parentType: string,
  parentId: string,
): Promise<Reminder[]> {
  const scoped = await ensureCrmSession();
  if (!scoped) throw new Error("Sign in to load related reminders");
  return normalizeReminders(
    await crmFetch(
      scoped,
      relatedRemindersPath(scoped.workspaceId, parentType, parentId),
    ),
  );
}

export async function createRelatedCrmReminder(
  parentType: string,
  parentId: string,
  body: Record<string, unknown>,
): Promise<Reminder | null> {
  const scoped = await ensureCrmSession();
  if (!scoped) throw new Error("Sign in to create a related reminder");
  return asReminder(
    await crmFetch(
      scoped,
      relatedRemindersPath(scoped.workspaceId, parentType, parentId),
      { method: "POST", body: JSON.stringify(body) },
    ),
  );
}

export async function tryCrmReminder<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteReminder(row: Reminder | null) {
  if (row) upsertReminder(row);
  return row;
}

export function isCrmReminderId(id: string): boolean {
  return isUuid(id);
}
