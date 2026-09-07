import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import { formatRulesAt } from "@/lib/rules/storage";
import { upsertMeeting } from "@/lib/meetings/store";
import { meetingRelatedApiFields } from "@/lib/meetings/invite-related";
import type { RelatedEntityKind } from "@/lib/activities/shared";
import type {
  Attendee,
  Meeting,
  MeetingStatus,
  MeetingType,
} from "@/lib/meetings/types";

export type CrmMeetingQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
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

export function workspaceMeetingsPath(workspaceId: string, suffix = ""): string {
  return `/v1/workspaces/${workspaceId}/meetings${suffix}`;
}

export function globalMeetingsPath(suffix = ""): string {
  return `/v1/meetings${suffix}`;
}

export function relatedMeetingsPath(
  workspaceId: string,
  relatedType: string,
  relatedId: string,
): string {
  return `/v1/workspaces/${workspaceId}/${relatedType}/${relatedId}/meetings`;
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
    for (const key of ["items", "meetings", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function mapMeetingType(raw: string): MeetingType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("phone")) return "Phone Call";
  if (value.includes("conference")) return "Conference";
  if (value.includes("person") || value.includes("onsite") || value.includes("in person")) {
    return "In-person";
  }
  return "Video Call";
}

function apiMeetingType(type: MeetingType): string {
  if (type === "Phone Call") return "PHONE_CALL";
  if (type === "Conference") return "CONFERENCE";
  if (type === "In-person") return "IN_PERSON";
  return "VIDEO_CALL";
}

export function mapMeetingStatus(raw: string): MeetingStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("progress") || value.includes("start")) return "In Progress";
  if (value.includes("complete") || value.includes("done")) return "Completed";
  if (value.includes("cancel")) return "Cancelled";
  if (value.includes("reschedul")) return "Rescheduled";
  return "Scheduled";
}

function formatWhen(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return formatRulesAt(new Date(parsed));
}

export function toMeetingIso(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  const au = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?:\s*([ap]m))?/i,
  );
  if (au) {
    const day = Number(au[1]);
    const month = Number(au[2]);
    const year = Number(au[3]);
    let hour = Number(au[4]);
    const minute = Number(au[5]);
    const mer = au[6]?.toLowerCase();
    if (mer === "pm" && hour < 12) hour += 12;
    if (mer === "am" && hour === 12) hour = 0;
    const d = new Date(year, month - 1, day, hour, minute);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return value;
}

function mapAttendees(raw: unknown): Attendee[] {
  return extractRecords(raw).map((row, index) => ({
    id: pickStr(row.id, row.userId, row.uuid) || `att-${index}`,
    name: pickStr(row.name, row.fullName, row.displayName, row.email, "Attendee"),
    email: pickStr(row.email, ""),
  }));
}

export function normalizeMeeting(
  raw: Record<string, unknown>,
  index: number,
): Meeting {
  const related =
    raw.relatedTo && typeof raw.relatedTo === "object"
      ? (raw.relatedTo as Record<string, unknown>)
      : null;
  const organizer =
    raw.organizer && typeof raw.organizer === "object"
      ? (raw.organizer as Record<string, unknown>)
      : null;
  return {
    id: pickStr(raw.id, raw.uuid, raw.meetingId) || `crm-meet-${index}`,
    title: pickStr(raw.title, raw.subject, raw.name, "Untitled meeting"),
    relatedTo:
      pickStr(
        related && pickStr(related.name, related.title, related.label),
        raw.relatedName,
        raw.relatedType && raw.relatedId
          ? `${raw.relatedType}: ${raw.relatedId}`
          : "",
        typeof raw.relatedTo === "string" ? raw.relatedTo : "",
      ) || undefined,
    type: mapMeetingType(pickStr(raw.type, raw.meetingType, "VIDEO")),
    startDateTime: formatWhen(
      raw.startAt ?? raw.startDateTime ?? raw.scheduledAt ?? raw.startsAt,
    ),
    endDateTime: formatWhen(
      raw.endAt ?? raw.endDateTime ?? raw.endsAt ?? raw.scheduledEndAt,
    ),
    location: pickStr(raw.location, raw.venue) || undefined,
    meetingLink: pickStr(raw.meetingLink, raw.meetingUrl, raw.url, raw.joinUrl) || undefined,
    attendees: mapAttendees(raw.attendees ?? raw.participants),
    organizer: pickStr(
      organizer && pickStr(organizer.name, organizer.email),
      raw.organizerName,
      raw.organizer,
      raw.createdBy,
      "—",
    ),
    status: mapMeetingStatus(pickStr(raw.status, raw.state, "SCHEDULED")),
    agenda: pickStr(raw.agenda, raw.description) || undefined,
    notes: pickStr(raw.notes) || undefined,
  };
}

export function normalizeMeetings(data: unknown): Meeting[] {
  return extractRecords(data).map((row, index) => normalizeMeeting(row, index));
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
  if (!access) throw new Error("Sign in to manage meetings");
  return run(access, false);
}

function isMissingCrmRoute(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /\(404\)|not found/i.test(message);
}

async function meetingsCall(
  suffix: string,
  query = "",
  init?: RequestInit,
): Promise<unknown> {
  const scoped = await ensureCrmSession();
  const paths = [
    ...(scoped?.workspaceId
      ? [`${workspaceMeetingsPath(scoped.workspaceId, suffix)}${query}`]
      : []),
    `${globalMeetingsPath(suffix)}${query}`,
  ].filter((path, index, all) => all.indexOf(path) === index);

  let lastError: unknown;
  for (let i = 0; i < paths.length; i += 1) {
    try {
      if (isBoundCrmSession()) {
        return await withSession((session) => crmFetch(session, paths[i], init));
      }
      return await crmBffFetch(paths[i], init);
    } catch (err) {
      lastError = err;
      if (i < paths.length - 1 && isMissingCrmRoute(err)) continue;
      throw err;
    }
  }
  throw lastError;
}

async function meetingsGet(suffix: string, query = ""): Promise<unknown> {
  return meetingsCall(suffix, query);
}

async function meetingsMutate(suffix: string, init: RequestInit): Promise<unknown> {
  return meetingsCall(suffix, "", init);
}

function asMeeting(data: unknown): Meeting | null {
  const items = normalizeMeetings(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeMeeting(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmMeetings(
  query: CrmMeetingQuery = {},
): Promise<Meeting[]> {
  const limit = Math.min(100, Math.max(1, query.limit ?? 100));
  const startPage = query.page != null ? Math.max(1, query.page) : 1;
  const maxPages = query.page != null ? 1 : 20;
  const all: Meeting[] = [];
  for (let i = 0; i < maxPages; i += 1) {
    const batch = normalizeMeetings(
      await meetingsGet(
        "",
        toQuery({
          page: startPage + i,
          limit,
          search: query.search,
          status: query.status,
        }),
      ),
    );
    all.push(...batch);
    if (batch.length < limit) break;
  }
  return all;
}

export async function listUpcomingCrmMeetings(): Promise<Meeting[]> {
  return normalizeMeetings(await meetingsGet("/upcoming"));
}

export async function getCrmMeeting(id: string): Promise<Meeting | null> {
  return asMeeting(await meetingsGet(`/${id}`));
}

export async function listRelatedCrmMeetings(
  relatedType: string,
  relatedId: string,
): Promise<Meeting[]> {
  const scoped = await ensureCrmSession();
  if (!scoped) throw new Error("Sign in to load related meetings");
  const path = relatedMeetingsPath(scoped.workspaceId, relatedType, relatedId);
  const data = isBoundCrmSession()
    ? await crmFetch(scoped, path)
    : await crmBffFetch(path);
  return normalizeMeetings(data);
}

export function toCreateMeetingBody(input: {
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  startDateTime: string;
  endDateTime: string;
  organizer: string;
  relatedTo?: string;
  relatedKind?: RelatedEntityKind | "";
  relatedId?: string;
  location?: string;
  meetingLink?: string;
  agenda?: string;
  notes?: string;
  timezone?: string;
  externalAttendees?: Array<{ email: string; name?: string }>;
}): Record<string, unknown> {
  const startAt = toMeetingIso(input.startDateTime);
  const endAt = toMeetingIso(input.endDateTime);
  const httpsLink =
    input.meetingLink && /^https:\/\//i.test(input.meetingLink.trim())
      ? input.meetingLink.trim()
      : undefined;
  const timezoneMatch = input.timezone?.match(/([A-Za-z]+\/[A-Za-z_]+)/);
  const related = meetingRelatedApiFields(input.relatedKind, input.relatedId);
  const body: Record<string, unknown> = {
    title: input.title,
    startAt,
    endAt,
    meetingType: apiMeetingType(input.type),
    ...related,
  };
  const location = input.location?.trim() ?? "";
  if (location && location.length <= 500 && !/^https:\/\//i.test(location)) {
    body.location = location;
  }
  if (httpsLink) body.meetingLink = httpsLink;
  else {
    const fromLocation = location.match(/https:\/\/[^\s]+/i)?.[0];
    if (fromLocation && fromLocation.length <= 2048) body.meetingLink = fromLocation;
  }
  const agenda = (input.agenda || input.notes || "").trim();
  if (agenda) body.agenda = agenda;
  const timezone = timezoneMatch?.[1];
  if (timezone) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
      body.timezone = timezone;
    } catch {
      /* omit invalid IANA labels from the booking dropdown */
    }
  }
  if (input.externalAttendees?.length) {
    body.externalAttendees = input.externalAttendees;
  }
  return body;
}

export async function createCrmMeeting(
  input: Parameters<typeof toCreateMeetingBody>[0],
): Promise<Meeting | null> {
  return asMeeting(
    await meetingsMutate("", {
      method: "POST",
      body: JSON.stringify(toCreateMeetingBody(input)),
    }),
  );
}

export async function updateCrmMeeting(
  id: string,
  patch: Partial<Meeting>,
): Promise<Meeting | null> {
  const httpsLink =
    patch.meetingLink && /^https:\/\//i.test(patch.meetingLink.trim())
      ? patch.meetingLink.trim()
      : undefined;
  const body: Record<string, unknown> = {};
  if (patch.title) body.title = patch.title;
  if (patch.type) body.meetingType = apiMeetingType(patch.type);
  if (patch.startDateTime) body.startAt = toMeetingIso(patch.startDateTime);
  if (patch.endDateTime) body.endAt = toMeetingIso(patch.endDateTime);
  if (patch.location != null) body.location = patch.location;
  if (httpsLink) body.meetingLink = httpsLink;
  if (patch.agenda != null) body.agenda = patch.agenda;
  return asMeeting(
    await meetingsMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteCrmMeeting(id: string): Promise<void> {
  await meetingsMutate(`/${id}`, { method: "DELETE" });
}

export async function cancelCrmMeeting(
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Meeting | null> {
  return asMeeting(
    await meetingsMutate(`/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(extra),
    }),
  );
}

export async function startCrmMeeting(id: string): Promise<Meeting | null> {
  return asMeeting(
    await meetingsMutate(`/${id}/start`, { method: "POST", body: "{}" }),
  );
}

export async function completeCrmMeeting(
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Meeting | null> {
  const outcome =
    typeof extra.outcome === "string" && extra.outcome.trim()
      ? extra.outcome.trim()
      : "Completed";
  return asMeeting(
    await meetingsMutate(`/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
    }),
  );
}

export async function rescheduleCrmMeeting(
  id: string,
  startDateTime: string,
  endDateTime?: string,
): Promise<Meeting | null> {
  const startAt = toMeetingIso(startDateTime);
  const endAt = endDateTime ? toMeetingIso(endDateTime) : undefined;
  return asMeeting(
    await meetingsMutate(`/${id}/reschedule`, {
      method: "POST",
      body: JSON.stringify({
        startAt,
        ...(endAt ? { endAt } : {}),
      }),
    }),
  );
}

export async function addCrmMeetingAttendee(
  id: string,
  userId: string,
): Promise<Meeting | null> {
  return asMeeting(
    await meetingsMutate(`/${id}/attendees/${userId}`, { method: "POST", body: "{}" }),
  );
}

export async function removeCrmMeetingAttendee(
  id: string,
  userId: string,
): Promise<Meeting | null> {
  return asMeeting(
    await meetingsMutate(`/${id}/attendees/${userId}`, { method: "DELETE" }),
  );
}

export async function replaceCrmMeetingAttendees(
  id: string,
  userIds: string[],
): Promise<Meeting | null> {
  return asMeeting(
    await meetingsMutate(`/${id}/attendees`, {
      method: "PUT",
      body: JSON.stringify({ userIds }),
    }),
  );
}

export async function setCrmMeetingReminders(
  id: string,
  minutesBefore: number[],
): Promise<Meeting | null> {
  const minutes = minutesBefore.find((value) => value > 0) ?? 15;
  const reminderAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  return asMeeting(
    await meetingsMutate(`/${id}/reminders`, {
      method: "POST",
      body: JSON.stringify({ reminderAt }),
    }),
  );
}

export async function syncMeetingStatus(
  id: string,
  status: MeetingStatus,
  times?: { startDateTime?: string; endDateTime?: string },
): Promise<Meeting | null> {
  if (status === "In Progress") return startCrmMeeting(id);
  if (status === "Completed") return completeCrmMeeting(id);
  if (status === "Cancelled") return cancelCrmMeeting(id);
  if (status === "Rescheduled") {
    if (times?.startDateTime) {
      return rescheduleCrmMeeting(id, times.startDateTime, times.endDateTime);
    }
    return updateCrmMeeting(id, { status });
  }
  return updateCrmMeeting(id, { status });
}

export async function tryCrmMeeting<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteMeeting(row: Meeting | null) {
  if (row) upsertMeeting(row);
  return row;
}

export function isCrmMeetingId(id: string): boolean {
  return isUuid(id);
}
