import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import { formatRulesAt } from "@/lib/rules/storage";
import { upsertMeeting } from "@/lib/meetings/store";
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
  if (type === "Phone Call") return "PHONE";
  if (type === "Conference") return "CONFERENCE";
  if (type === "In-person") return "IN_PERSON";
  return "VIDEO";
}

export function mapMeetingStatus(raw: string): MeetingStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("progress") || value.includes("start")) return "In Progress";
  if (value.includes("complete") || value.includes("done")) return "Completed";
  if (value.includes("cancel")) return "Cancelled";
  if (value.includes("reschedul")) return "Rescheduled";
  return "Scheduled";
}

function apiMeetingStatus(status: MeetingStatus): string {
  if (status === "In Progress") return "IN_PROGRESS";
  if (status === "Completed") return "COMPLETED";
  if (status === "Cancelled") return "CANCELLED";
  if (status === "Rescheduled") return "RESCHEDULED";
  return "SCHEDULED";
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

async function meetingsGet(suffix: string, query = ""): Promise<unknown> {
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceMeetingsPath((session as CrmSession).workspaceId, suffix)
      : globalMeetingsPath(suffix);
    return crmFetch(session, `${path}${query}`);
  });
}

async function meetingsMutate(suffix: string, init: RequestInit): Promise<unknown> {
  return withSession((session, scoped) => {
    const path = scoped
      ? workspaceMeetingsPath((session as CrmSession).workspaceId, suffix)
      : globalMeetingsPath(suffix);
    return crmFetch(session, path, init);
  });
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
  return normalizeMeetings(
    await meetingsGet(
      "",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
      }),
    ),
  );
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
  return normalizeMeetings(
    await crmFetch(
      scoped,
      relatedMeetingsPath(scoped.workspaceId, relatedType, relatedId),
    ),
  );
}

export function toCreateMeetingBody(input: {
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  startDateTime: string;
  endDateTime: string;
  organizer: string;
  relatedTo?: string;
  location?: string;
  meetingLink?: string;
  agenda?: string;
  notes?: string;
}): Record<string, unknown> {
  const startAt = toMeetingIso(input.startDateTime);
  const endAt = toMeetingIso(input.endDateTime);
  return {
    title: input.title,
    subject: input.title,
    type: apiMeetingType(input.type),
    meetingType: apiMeetingType(input.type),
    status: apiMeetingStatus(input.status),
    startAt,
    startDateTime: startAt,
    scheduledAt: startAt,
    endAt,
    endDateTime: endAt,
    organizerName: input.organizer,
    organizer: input.organizer,
    relatedTo: input.relatedTo,
    location: input.location,
    meetingLink: input.meetingLink,
    meetingUrl: input.meetingLink,
    agenda: input.agenda,
    notes: input.notes,
  };
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
  const body: Record<string, unknown> = {};
  if (patch.title) body.title = patch.title;
  if (patch.type) body.type = apiMeetingType(patch.type);
  if (patch.status) body.status = apiMeetingStatus(patch.status);
  if (patch.startDateTime) {
    const startAt = toMeetingIso(patch.startDateTime);
    body.startAt = startAt;
    body.scheduledAt = startAt;
  }
  if (patch.endDateTime) body.endAt = toMeetingIso(patch.endDateTime);
  if (patch.location != null) body.location = patch.location;
  if (patch.meetingLink != null) {
    body.meetingLink = patch.meetingLink;
    body.meetingUrl = patch.meetingLink;
  }
  if (patch.agenda != null) body.agenda = patch.agenda;
  if (patch.notes != null) body.notes = patch.notes;
  if (patch.organizer) body.organizerName = patch.organizer;
  if (patch.relatedTo != null) body.relatedTo = patch.relatedTo;
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
  return asMeeting(
    await meetingsMutate(`/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(extra),
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
        scheduledAt: startAt,
        startDateTime: startAt,
        ...(endAt ? { endAt, endDateTime: endAt } : {}),
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
      body: JSON.stringify({ userIds, attendeeIds: userIds }),
    }),
  );
}

export async function setCrmMeetingReminders(
  id: string,
  minutesBefore: number[],
): Promise<Meeting | null> {
  return asMeeting(
    await meetingsMutate(`/${id}/reminders`, {
      method: "POST",
      body: JSON.stringify({
        minutesBefore,
        reminders: minutesBefore.map((minutes) => ({ minutesBefore: minutes })),
      }),
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
