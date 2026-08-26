import {
  ensureCrmAccess,
  ensureCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type { CalendarItem, CalendarItemType } from "@/lib/calendar/types";

export type CalendarViewKind = "Day" | "Week" | "Month" | "Agenda";

export type CalendarDataSource = "api" | "demo" | "mixed";

export const CALENDAR_SUFFIXES = [
  "",
  "/events",
  "/day",
  "/week",
  "/month",
  "/upcoming",
  "/conflicts",
] as const;

export type CalendarSuffix = (typeof CALENDAR_SUFFIXES)[number];

type NestedList<T> = {
  items?: T[];
  events?: T[];
  conflicts?: T[];
  overlaps?: T[];
  days?: Array<{ events?: T[]; items?: T[] }>;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function calendarTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday-to-Sunday week used by CalendarController_getWeek. */
export function startOfMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDaysLocal(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function toQuery(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function workspaceCalendarPath(
  workspaceId: string,
  suffix: CalendarSuffix = "",
): string {
  return `/v1/workspaces/${workspaceId}/calendar${suffix}`;
}

export function globalCalendarPath(suffix: CalendarSuffix = ""): string {
  return `/v1/calendar${suffix}`;
}

function colorForType(type: CalendarItemType): string {
  if (type === "Task") return "bg-amber-500";
  if (type === "Meeting") return "bg-sky-500";
  if (type === "Reminder") return "bg-rose-500";
  return "bg-violet-500";
}

function mapType(raw: string): CalendarItemType {
  const value = raw.trim().toLowerCase();
  if (value.includes("task")) return "Task";
  if (
    value.includes("meet") ||
    value.includes("call") ||
    value.includes("video")
  ) {
    return "Meeting";
  }
  if (value.includes("remind") || value.includes("follow")) return "Reminder";
  return "Event";
}

function isCancelled(raw: Record<string, unknown>): boolean {
  const status = pickStr(raw.status, raw.state).toLowerCase();
  if (status.includes("cancel")) return true;
  if (raw.cancelled === true || raw.isCancelled === true) return true;
  return false;
}

function asIsoish(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 16);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T09:00`;
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return trimmed;
  const d = new Date(parsed);
  return `${isoDateLocal(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function normalizeCalendarItem(
  raw: Record<string, unknown>,
  index: number,
): CalendarItem | null {
  if (isCancelled(raw)) return null;
  const nestedRelated =
    raw.relatedTo && typeof raw.relatedTo === "object"
      ? (raw.relatedTo as Record<string, unknown>)
      : null;
  const nestedOwner =
    raw.owner && typeof raw.owner === "object"
      ? (raw.owner as Record<string, unknown>)
      : null;

  const title = pickStr(
    raw.title,
    raw.subject,
    raw.name,
    raw.summary,
    "Untitled",
  );
  const start = asIsoish(
    raw.start ??
      raw.startAt ??
      raw.startsAt ??
      raw.startDate ??
      raw.startDateTime ??
      raw.from ??
      raw.beginsAt,
  );
  if (!start) return null;
  const endRaw = asIsoish(
    raw.end ??
      raw.endAt ??
      raw.endsAt ??
      raw.endDate ??
      raw.endDateTime ??
      raw.to,
  );
  const type = mapType(
    pickStr(raw.type, raw.kind, raw.eventType, raw.calendarType, "Event"),
  );
  const owner = pickStr(
    nestedOwner && pickStr(nestedOwner.name, nestedOwner.email, nestedOwner.id),
    raw.ownerName,
    raw.assignedTo,
    raw.assignee,
    raw.createdBy,
    typeof raw.owner === "string" ? raw.owner : "",
    "—",
  );
  const relatedTo = pickStr(
    nestedRelated &&
      pickStr(nestedRelated.name, nestedRelated.title, nestedRelated.label),
    raw.relatedName,
    raw.entityLabel,
    raw.relatedType && raw.relatedId
      ? `${raw.relatedType}: ${raw.relatedId}`
      : "",
    typeof raw.relatedTo === "string" ? raw.relatedTo : "",
  );

  return {
    id: pickStr(raw.id, raw.uuid, raw.eventId) || `crm-cal-${index}`,
    title,
    type,
    start,
    end: endRaw || undefined,
    owner,
    relatedTo: relatedTo || undefined,
    colorClass: colorForType(type),
  };
}

function pushRecords(out: Record<string, unknown>[], value: unknown) {
  if (!value) return;
  if (Array.isArray(value)) {
    if (
      value.length === 2 &&
      Array.isArray(value[0]) &&
      (typeof value[1] === "number" || value[1] == null)
    ) {
      pushRecords(out, value[0]);
      return;
    }
    for (const entry of value) {
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const rec = entry as Record<string, unknown>;
        if (Array.isArray(rec.events) || Array.isArray(rec.items)) {
          pushRecords(out, rec.events);
          pushRecords(out, rec.items);
        } else {
          out.push(rec);
        }
      }
    }
    return;
  }
  if (typeof value === "object") {
    const rec = value as NestedList<Record<string, unknown>>;
    pushRecords(out, rec.items);
    pushRecords(out, rec.events);
    pushRecords(out, rec.conflicts);
    pushRecords(out, rec.overlaps);
    pushRecords(out, rec.days);
  }
}

export function extractCalendarRecords(
  data: unknown,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  pushRecords(out, data);
  return out;
}

export function normalizeCalendarItems(data: unknown): CalendarItem[] {
  return extractCalendarRecords(data)
    .map((raw, index) => normalizeCalendarItem(raw, index))
    .filter((item): item is CalendarItem => item != null);
}

export function mergeCalendarItems(
  local: CalendarItem[],
  remote: CalendarItem[],
): CalendarItem[] {
  const byId = new Map<string, CalendarItem>();
  for (const item of local) byId.set(item.id, item);
  for (const item of remote) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => a.start.localeCompare(b.start));
}

async function calendarGet(
  suffix: CalendarSuffix,
  query = "",
): Promise<unknown> {
  const scoped = await ensureCrmSession();
  if (scoped) {
    return crmFetch(
      scoped,
      `${workspaceCalendarPath(scoped.workspaceId, suffix)}${query}`,
    );
  }
  const access = await ensureCrmAccess();
  if (!access) {
    throw new Error("Sign in to load calendar");
  }
  return crmFetch(
    access as Pick<CrmSession, "baseUrl" | "accessToken">,
    `${globalCalendarPath(suffix)}${query}`,
  );
}

export type CalendarRangeQuery = {
  from: string;
  to: string;
  timezone?: string;
};

function rangeQuery(query: CalendarRangeQuery): string {
  return toQuery({
    from: query.from,
    to: query.to,
    timezone: query.timezone ?? calendarTimezone(),
  });
}

export async function fetchCalendarRange(
  query: CalendarRangeQuery,
): Promise<CalendarItem[]> {
  return normalizeCalendarItems(await calendarGet("", rangeQuery(query)));
}

export async function fetchCalendarEvents(
  query: CalendarRangeQuery,
): Promise<CalendarItem[]> {
  return normalizeCalendarItems(
    await calendarGet("/events", rangeQuery(query)),
  );
}

export async function fetchCalendarDay(
  date: string,
  timezone = calendarTimezone(),
): Promise<CalendarItem[]> {
  return normalizeCalendarItems(
    await calendarGet("/day", toQuery({ date, timezone })),
  );
}

export async function fetchCalendarWeek(
  date: string,
  timezone = calendarTimezone(),
): Promise<CalendarItem[]> {
  return normalizeCalendarItems(
    await calendarGet("/week", toQuery({ date, timezone })),
  );
}

export async function fetchCalendarMonth(
  year: number,
  month: number,
  timezone = calendarTimezone(),
): Promise<CalendarItem[]> {
  return normalizeCalendarItems(
    await calendarGet(
      "/month",
      toQuery({
        year,
        month,
        date: `${year}-${String(month).padStart(2, "0")}-01`,
        timezone,
      }),
    ),
  );
}

export async function fetchCalendarUpcoming(
  timezone = calendarTimezone(),
): Promise<CalendarItem[]> {
  return normalizeCalendarItems(
    await calendarGet("/upcoming", toQuery({ timezone })),
  );
}

export async function fetchCalendarConflicts(
  query: CalendarRangeQuery,
): Promise<CalendarItem[]> {
  return normalizeCalendarItems(
    await calendarGet("/conflicts", rangeQuery(query)),
  );
}

export function visibleRange(
  view: CalendarViewKind,
  anchor: Date,
): CalendarRangeQuery {
  const timezone = calendarTimezone();
  if (view === "Day") {
    const day = isoDateLocal(anchor);
    return { from: day, to: day, timezone };
  }
  if (view === "Week") {
    const monday = startOfMonday(anchor);
    return {
      from: isoDateLocal(monday),
      to: isoDateLocal(addDaysLocal(monday, 6)),
      timezone,
    };
  }
  if (view === "Month") {
    const from = isoDateLocal(
      new Date(anchor.getFullYear(), anchor.getMonth(), 1),
    );
    const to = isoDateLocal(
      new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0),
    );
    return { from, to, timezone };
  }
  const from = isoDateLocal(anchor);
  return {
    from,
    to: isoDateLocal(addDaysLocal(anchor, 30)),
    timezone,
  };
}

export async function fetchCalendarForView(
  view: CalendarViewKind,
  anchor: Date,
): Promise<CalendarItem[]> {
  const tz = calendarTimezone();
  if (view === "Day") return fetchCalendarDay(isoDateLocal(anchor), tz);
  if (view === "Week") {
    return fetchCalendarWeek(isoDateLocal(startOfMonday(anchor)), tz);
  }
  if (view === "Month") {
    return fetchCalendarMonth(
      anchor.getFullYear(),
      anchor.getMonth() + 1,
      tz,
    );
  }
  return fetchCalendarUpcoming(tz);
}

export async function fetchCalendarViewBundle(
  view: CalendarViewKind,
  anchor: Date,
): Promise<{ items: CalendarItem[]; conflicts: CalendarItem[] }> {
  const range = visibleRange(view, anchor);
  const [items, conflicts] = await Promise.all([
    fetchCalendarForView(view, anchor),
    fetchCalendarConflicts(range),
  ]);
  return { items, conflicts };
}
