/**
 * Workspace Calendly meeting APIs (`/v1/workspaces/:id/calendly/...`).
 */

import {
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import type { RelatedEntityKind } from "@/lib/activities/shared";
import type { BookingPage } from "@/lib/booking/types";
import { WEEKDAYS } from "@/lib/booking/types";

export type CalendlyHost = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  isConsultant: boolean;
  isHomeConsultant: boolean;
  crmUserId: string;
};

export type CalendlyEventType = {
  id: string;
  name: string;
  durationMinutes: number;
  active: boolean;
  hostId: string;
  schedulingUrl: string;
};

export type CalendlyAvailableTime = {
  startTime: string;
  status: string;
};

export type CalendlyBusyTime = {
  startTime: string;
  endTime: string;
};

export type CalendlySchedule = {
  id: string;
  name: string;
  timezone: string;
  raw: Record<string, unknown>;
};

export type CalendlySchedulingLink = {
  url: string;
  reusable: boolean;
};

export type CalendlyBookingResult = {
  meetingId: string;
  inviteeId: string;
  startTime: string;
  raw: Record<string, unknown>;
};

export type CalendlySummary = {
  from: string;
  to: string;
  booked: number;
  cancelled: number;
  noShows: number;
  completed: number;
  raw: Record<string, unknown>;
};

export type CalendlyHostFilters = {
  active?: boolean;
  consultant?: boolean;
  homeConsultant?: boolean;
  crmLinked?: boolean;
  name?: string;
  eventTypeId?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickBool(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return false;
}

function pickNum(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return extractRecords(data[0]);
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  const rec = asRecord(data);
  if (!rec) return [];
  for (const key of [
    "items",
    "hosts",
    "eventTypes",
    "event_types",
    "collection",
    "availableTimes",
    "available_times",
    "busyTimes",
    "busy_times",
    "schedules",
    "records",
    "rows",
    "result",
  ]) {
    if (Array.isArray(rec[key])) return extractRecords(rec[key]);
  }
  if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  return [rec];
}

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function workspaceCalendlyPath(workspaceId: string, suffix = ""): string {
  return `/v1/workspaces/${workspaceId}/calendly${suffix}`;
}

async function withSession<T>(fn: (session: CrmSession) => Promise<T>): Promise<T> {
  const session = await ensureCrmSession();
  if (!session) throw new Error("Sign in to use Calendly booking");
  return fn(session);
}

async function calendlyCall(suffix: string, init?: RequestInit): Promise<unknown> {
  const scoped = await ensureCrmSession();
  if (!scoped?.workspaceId) throw new Error("Sign in to use Calendly booking");
  const path = workspaceCalendlyPath(scoped.workspaceId, suffix);
  if (isBoundCrmSession()) {
    return withSession((session) => crmFetch(session, path, init));
  }
  return crmBffFetch(path, init);
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  };
}

export function normalizeCalendlyHost(
  row: Record<string, unknown>,
  index = 0,
): CalendlyHost {
  return {
    id: pickStr(row.id, row.hostId, row.host_id) || `host-${index}`,
    name: pickStr(row.name, row.displayName, row.display_name, row.email) || "Host",
    email: pickStr(row.email),
    active: pickBool(row.active, row.isActive, row.is_active) || row.active !== false,
    isConsultant: pickBool(row.isConsultant, row.is_consultant, row.consultant),
    isHomeConsultant: pickBool(
      row.isHomeConsultant,
      row.is_home_consultant,
      row.homeConsultant,
    ),
    crmUserId: pickStr(row.crmUserId, row.crm_user_id, row.userId, row.user_id),
  };
}

export function normalizeCalendlyEventType(
  row: Record<string, unknown>,
  index = 0,
): CalendlyEventType {
  return {
    id: pickStr(row.id, row.eventTypeId, row.event_type_id) || `et-${index}`,
    name: pickStr(row.name, row.title, row.slug) || "Event type",
    durationMinutes: pickNum(
      row.durationMinutes,
      row.duration_minutes,
      row.duration,
    ),
    active: pickBool(row.active, row.isActive, row.is_active) || row.active !== false,
    hostId: pickStr(row.hostId, row.host_id, row.ownerId, row.owner_id),
    schedulingUrl: pickStr(
      row.schedulingUrl,
      row.scheduling_url,
      row.bookingUrl,
      row.booking_url,
      row.url,
    ),
  };
}

export function normalizeCalendlyAvailableTime(
  row: Record<string, unknown>,
): CalendlyAvailableTime | null {
  const startTime = pickStr(
    row.startTime,
    row.start_time,
    row.start,
    row.time,
  );
  if (!startTime) return null;
  return {
    startTime,
    status: pickStr(row.status) || "available",
  };
}

export function listCalendlyHosts(filters: CalendlyHostFilters = {}): Promise<CalendlyHost[]> {
  return calendlyCall(
    `/hosts${toQuery({
      active: filters.active,
      consultant: filters.consultant,
      homeConsultant: filters.homeConsultant,
      crmLinked: filters.crmLinked,
      name: filters.name,
      eventTypeId: filters.eventTypeId,
    })}`,
  ).then((data) => extractRecords(data).map(normalizeCalendlyHost));
}

export function updateCalendlyHost(
  id: string,
  body: { crmUserId?: string; isConsultant?: boolean; isHomeConsultant?: boolean },
): Promise<CalendlyHost> {
  return calendlyCall(`/hosts/${id}`, jsonInit("PATCH", body)).then((data) =>
    normalizeCalendlyHost(asRecord(data) ?? extractRecords(data)[0] ?? {}),
  );
}

export function listCalendlyEventTypes(hostId?: string): Promise<CalendlyEventType[]> {
  return calendlyCall(`/event-types${toQuery({ hostId })}`).then((data) =>
    extractRecords(data).map(normalizeCalendlyEventType),
  );
}

export function listCalendlyAvailableTimes(input: {
  eventTypeId: string;
  from: string;
  to: string;
}): Promise<CalendlyAvailableTime[]> {
  return calendlyCall(
    `/available-times${toQuery({
      eventTypeId: input.eventTypeId,
      from: input.from,
      to: input.to,
    })}`,
  ).then((data) =>
    extractRecords(data)
      .map(normalizeCalendlyAvailableTime)
      .filter((row): row is CalendlyAvailableTime => !!row),
  );
}

export function listCalendlyBusyTimes(
  hostId: string,
  range: { from: string; to: string },
): Promise<CalendlyBusyTime[]> {
  return calendlyCall(
    `/hosts/${hostId}/busy-times${toQuery(range)}`,
  ).then((data) =>
    extractRecords(data).map((row) => ({
      startTime: pickStr(row.startTime, row.start_time, row.start),
      endTime: pickStr(row.endTime, row.end_time, row.end),
    })),
  );
}

export function listCalendlyAvailabilitySchedules(
  hostId: string,
): Promise<CalendlySchedule[]> {
  return calendlyCall(`/hosts/${hostId}/availability-schedules`).then((data) =>
    extractRecords(data).map((row, index) => ({
      id: pickStr(row.id) || `sched-${index}`,
      name: pickStr(row.name, row.timezone) || "Schedule",
      timezone: pickStr(row.timezone),
      raw: row,
    })),
  );
}

export function createCalendlySchedulingLink(input: {
  eventTypeId: string;
  reusable?: boolean;
}): Promise<CalendlySchedulingLink> {
  return calendlyCall("/scheduling-links", jsonInit("POST", input)).then((data) => {
    const rec = asRecord(data) ?? extractRecords(data)[0] ?? {};
    return {
      url: pickStr(
        rec.url,
        rec.bookingUrl,
        rec.booking_url,
        rec.schedulingUrl,
        rec.scheduling_url,
      ),
      reusable: input.reusable !== false,
    };
  });
}

export function createCalendlyBooking(input: {
  idempotencyKey: string;
  eventTypeId: string;
  startTime: string;
  name: string;
  email: string;
  timezone: string;
  leadId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
}): Promise<CalendlyBookingResult> {
  return calendlyCall("/bookings", jsonInit("POST", input)).then((data) => {
    const rec = asRecord(data) ?? extractRecords(data)[0] ?? {};
    const nested = asRecord(rec.meeting) ?? asRecord(rec.invitee) ?? {};
    return {
      meetingId: pickStr(
        rec.meetingId,
        rec.meeting_id,
        rec.id,
        nested.id,
      ),
      inviteeId: pickStr(
        rec.inviteeId,
        rec.invitee_id,
        nested.inviteeId,
        asRecord(rec.invitee)?.id,
      ),
      startTime: pickStr(rec.startTime, rec.start_time, input.startTime),
      raw: rec,
    };
  });
}

export function cancelCalendlyMeeting(
  meetingId: string,
  reason?: string,
): Promise<unknown> {
  return calendlyCall(
    `/meetings/${meetingId}/cancel`,
    jsonInit("POST", reason ? { reason } : {}),
  );
}

export function getCalendlyRescheduleLink(
  meetingId: string,
  inviteeId?: string,
): Promise<string> {
  return calendlyCall(
    `/meetings/${meetingId}/reschedule-link${toQuery({ inviteeId })}`,
  ).then((data) => {
    const rec = asRecord(data) ?? extractRecords(data)[0] ?? {};
    return pickStr(
      rec.url,
      rec.rescheduleUrl,
      rec.reschedule_url,
      rec.bookingUrl,
    );
  });
}

export function markCalendlyNoShow(inviteeId: string): Promise<unknown> {
  return calendlyCall(`/invitees/${inviteeId}/no-show`, jsonInit("POST", {}));
}

export function removeCalendlyNoShow(inviteeId: string): Promise<unknown> {
  return calendlyCall(`/invitees/${inviteeId}/no-show`, { method: "DELETE" });
}

export function linkCalendlyMeetingCrm(
  meetingId: string,
  body: {
    leadId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    dealId?: string | null;
  },
): Promise<unknown> {
  return calendlyCall(`/meetings/${meetingId}/crm-link`, jsonInit("PATCH", body));
}

export function getCalendlySummary(range: {
  from: string;
  to: string;
}): Promise<CalendlySummary> {
  return calendlyCall(`/summary${toQuery(range)}`).then((data) => {
    const rec = asRecord(data) ?? {};
    const counts = asRecord(rec.counts) ?? asRecord(rec.byStatus) ?? rec;
    return {
      from: range.from,
      to: range.to,
      booked: pickNum(
        counts.booked,
        counts.scheduled,
        counts.confirmed,
        rec.booked,
      ),
      cancelled: pickNum(counts.cancelled, counts.canceled, rec.cancelled),
      noShows: pickNum(counts.noShows, counts.no_shows, rec.noShows),
      completed: pickNum(counts.completed, rec.completed),
      raw: rec,
    };
  });
}

export function calendlyCrmLinkFromRelated(
  kind: RelatedEntityKind | "" | undefined,
  recordId: string | undefined,
): {
  leadId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
} {
  if (!kind || !isUuid(recordId)) return {};
  if (kind === "Lead") return { leadId: recordId };
  if (kind === "Contact") return { contactId: recordId };
  if (kind === "Company") return { companyId: recordId };
  if (kind === "Deal") return { dealId: recordId };
  return {};
}

export async function resolveCalendlyEventType(
  page?: Pick<BookingPage, "calendlyEventTypeId" | "title" | "durationMinutes"> | null,
  hostId?: string,
): Promise<CalendlyEventType | null> {
  if (page?.calendlyEventTypeId && isUuid(page.calendlyEventTypeId)) {
    const types = await listCalendlyEventTypes(hostId);
    return types.find((item) => item.id === page.calendlyEventTypeId) ?? types[0] ?? null;
  }
  const types = await listCalendlyEventTypes(hostId);
  if (!page) return types.find((item) => item.active) ?? types[0] ?? null;
  const title = page.title.trim().toLowerCase();
  const byName = types.find((item) => item.name.trim().toLowerCase() === title);
  if (byName) return byName;
  if (page.durationMinutes) {
    const byDuration = types.find(
      (item) => item.durationMinutes === page.durationMinutes,
    );
    if (byDuration) return byDuration;
  }
  return types.find((item) => item.active) ?? types[0] ?? null;
}

export function localHHmmFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    const match = iso.match(/T(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "09:00";
  }
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function dateRangeIso(from: Date, to: Date) {
  return { from: from.toISOString(), to: to.toISOString() };
}

export function newCalendlyIdempotencyKey() {
  return crypto.randomUUID();
}

export function calendlyEventTypeToBookingPage(
  eventType: CalendlyEventType,
  hostName = "",
): BookingPage {
  const slug =
    eventType.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || eventType.id.slice(0, 8);
  return {
    id: eventType.id,
    title: eventType.name,
    slug,
    owner: hostName,
    eventType: "Consultation",
    durationMinutes: eventType.durationMinutes || 30,
    bufferMinutes: 0,
    timezone: "Australia/Sydney",
    description: "",
    availability: WEEKDAYS.map((day) => ({
      day,
      enabled: false,
      start: "09:00",
      end: "17:00",
    })),
    questions: [],
    confirmationTemplate: "",
    reminderTemplate: "",
    status: eventType.active ? "Live" : "Draft",
    views: 0,
    bookingsCount: 0,
    cancelRate: 0,
    createdAt: "",
    calendlyEventTypeId: eventType.id,
    calendlyHostId: eventType.hostId,
    videoLink: eventType.schedulingUrl || undefined,
  };
}

export async function attachCalendlyEventTypeToPage(
  page: BookingPage,
): Promise<BookingPage> {
  try {
    const eventType = await resolveCalendlyEventType(page);
    if (!eventType) return page;
    return {
      ...page,
      calendlyEventTypeId: eventType.id,
      calendlyHostId: eventType.hostId || page.calendlyHostId,
    };
  } catch {
    return page;
  }
}
