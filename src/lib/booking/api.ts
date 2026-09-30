/**
 * Native workspace booking APIs (`/v1/workspaces/:id/booking/...`).
 */

import {
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import type { RelatedEntityKind } from "@/lib/activities/shared";
import {
  WEEKDAYS,
  type BookingPage,
  type BookingPageStatus,
  type MeetingVia,
} from "@/lib/booking/types";
import {
  eventTypeLocationPayload,
  platformLabelFromLocationType,
  type EventTypeLocationType,
} from "@/lib/booking/meeting-platforms";

export type CrmBookingHost = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  isConsultant: boolean;
  isHomeConsultant: boolean;
  crmUserId: string;
  timezone?: string;
  dailyBookingLimit?: number | null;
};

export type CrmAvailabilityWindow = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type CrmAvailabilityOverride = {
  id: string;
  date: string;
  isUnavailable: boolean;
  reason: string;
};

export type CrmAvailabilitySchedule = {
  id: string;
  hostId: string;
  name: string;
  timezone: string;
  isDefault: boolean;
  rules: CrmAvailabilityWindow[];
  overrides: CrmAvailabilityOverride[];
};

export type CrmEventType = {
  id: string;
  name: string;
  slug: string;
  durationMinutes: number;
  timezone: string;
  description: string;
  active: boolean;
  hostId: string;
  locationType?: string;
  location?: string;
};

export type CrmAvailableSlot = {
  startTime: string;
  endTime?: string;
  hostId?: string;
};

export type CrmBookingRecord = {
  id: string;
  eventTypeId: string;
  hostId: string;
  guestName: string;
  guestEmail: string;
  startTime: string;
  endTime: string;
  status: string;
  leadId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  raw: Record<string, unknown>;
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
    "eventTypes",
    "event_types",
    "bookings",
    "hosts",
    "consultants",
    "schedules",
    "overrides",
    "slots",
    "availableSlots",
    "available_slots",
    "records",
    "rows",
    "result",
    "collection",
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

export function workspaceBookingPath(workspaceId: string, suffix = ""): string {
  return `/v1/workspaces/${workspaceId}/booking${suffix}`;
}

async function withSession<T>(fn: (session: CrmSession) => Promise<T>): Promise<T> {
  const session = await ensureCrmSession();
  if (!session) throw new Error("Sign in to use booking");
  return fn(session);
}

async function bookingCall(suffix: string, init?: RequestInit): Promise<unknown> {
  const scoped = await ensureCrmSession();
  if (!scoped?.workspaceId) throw new Error("Sign in to use booking");
  const path = workspaceBookingPath(scoped.workspaceId, suffix);
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

export async function tryCrmBooking<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function normalizeCrmBookingHost(
  row: Record<string, unknown>,
  index = 0,
): CrmBookingHost {
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
    timezone: pickStr(row.timezone, row.timeZone, row.time_zone) || undefined,
    dailyBookingLimit:
      row.dailyBookingLimit === null || row.daily_booking_limit === null
        ? null
        : pickNum(row.dailyBookingLimit, row.daily_booking_limit) || undefined,
  };
}

function normalizeCrmAvailabilityWindow(row: Record<string, unknown>): CrmAvailabilityWindow | null {
  const dayOfWeek = pickNum(row.dayOfWeek, row.day_of_week);
  const startMinute = pickNum(row.startMinute, row.start_minute);
  const endMinute = pickNum(row.endMinute, row.end_minute);
  if (endMinute <= startMinute) return null;
  return { dayOfWeek, startMinute, endMinute };
}

function normalizeCrmAvailabilitySchedule(
  row: Record<string, unknown>,
): CrmAvailabilitySchedule {
  const rules = Array.isArray(row.rules)
    ? row.rules
        .map((rule) => normalizeCrmAvailabilityWindow(asRecord(rule) ?? {}))
        .filter((rule): rule is CrmAvailabilityWindow => !!rule)
    : [];
  const overrides = Array.isArray(row.overrides)
    ? row.overrides
        .map((item) => {
          const override = asRecord(item);
          if (!override) return null;
          const date = pickStr(override.date).slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
          return {
            id: pickStr(override.id),
            date,
            isUnavailable: pickBool(override.isUnavailable, override.is_unavailable),
            reason: pickStr(override.reason),
          };
        })
        .filter((item): item is CrmAvailabilityOverride => !!item)
    : [];
  return {
    id: pickStr(row.id),
    hostId: pickStr(row.hostId, row.host_id),
    name: pickStr(row.name) || "Working hours",
    timezone: pickStr(row.timezone) || "Australia/Sydney",
    isDefault: pickBool(row.isDefault, row.is_default),
    rules,
    overrides,
  };
}

export function normalizeCrmEventType(
  row: Record<string, unknown>,
  index = 0,
): CrmEventType {
  const name = pickStr(row.name, row.title, row.slug) || "Event type";
  const slug =
    pickStr(row.slug) ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) ||
    `event-${index}`;
  const status = pickStr(row.status, row.state).toLowerCase();
  const active =
    pickBool(row.active, row.isActive, row.is_active, row.live) ||
    (status ? !status.includes("draft") && !status.includes("inactiv") : true);
  const locationType = pickStr(
    row.locationType,
    row.location_type,
    row.meetingProvider,
    row.meeting_provider,
    row.conferencing,
  );
  const location = pickStr(row.location, row.locationDetail, row.location_detail);
  return {
    id: pickStr(row.id, row.eventTypeId, row.event_type_id) || `et-${index}`,
    name,
    slug,
    durationMinutes:
      pickNum(row.durationMinutes, row.duration_minutes, row.duration) || 30,
    timezone: pickStr(row.timezone, row.timeZone, row.time_zone) || "Australia/Sydney",
    description: pickStr(row.description, row.details),
    active: row.active === false ? false : active,
    hostId: pickStr(row.hostId, row.host_id, row.ownerId, row.owner_id),
    locationType: locationType || undefined,
    location: location || undefined,
  };
}

function meetingViaFromLocationType(raw?: string): MeetingVia | undefined {
  if (!raw) return undefined;
  const value = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if (value.includes("PHONE")) return "phone";
  if (
    value.includes("PERSON") ||
    value.includes("OFFLINE") ||
    value.includes("ADDRESS")
  ) {
    return "in_person";
  }
  if (
    value.includes("ZOOM") ||
    value.includes("GOOGLE") ||
    value.includes("TEAM") ||
    value.includes("VIDEO") ||
    value.includes("ONLINE")
  ) {
    return "video";
  }
  return undefined;
}

export function normalizeCrmAvailableSlot(
  row: Record<string, unknown>,
): CrmAvailableSlot | null {
  const startTime = pickStr(
    row.startTime,
    row.start_time,
    row.start,
    row.time,
    row.slot,
  );
  if (!startTime) return null;
  return {
    startTime,
    endTime: pickStr(row.endTime, row.end_time, row.end) || undefined,
    hostId: pickStr(row.hostId, row.host_id) || undefined,
  };
}

export function normalizeCrmBooking(
  row: Record<string, unknown>,
  index = 0,
): CrmBookingRecord {
  const guest =
    asRecord(row.guest) ??
    asRecord(row.invitee) ??
    asRecord(row.attendee) ??
    {};
  return {
    id: pickStr(row.id, row.bookingId, row.booking_id) || `bk-${index}`,
    eventTypeId: pickStr(
      row.eventTypeId,
      row.event_type_id,
      asRecord(row.eventType)?.id,
    ),
    hostId: pickStr(row.hostId, row.host_id, asRecord(row.host)?.id),
    guestName: pickStr(
      row.guestName,
      row.guest_name,
      row.name,
      guest.name,
      guest.fullName,
    ) || "Guest",
    guestEmail: pickStr(row.guestEmail, row.guest_email, row.email, guest.email),
    startTime: pickStr(row.startTime, row.start_time, row.startAt, row.start_at),
    endTime: pickStr(row.endTime, row.end_time, row.endAt, row.end_at),
    status: pickStr(row.status, row.state) || "Scheduled",
    leadId: pickStr(row.leadId, row.lead_id) || undefined,
    contactId: pickStr(row.contactId, row.contact_id) || undefined,
    companyId: pickStr(row.companyId, row.company_id) || undefined,
    dealId: pickStr(row.dealId, row.deal_id) || undefined,
    raw: row,
  };
}

export function crmEventTypeToBookingPage(
  eventType: CrmEventType,
  hostName = "",
): BookingPage {
  const status: BookingPageStatus = eventType.active ? "Live" : "Draft";
  const meetingVia = meetingViaFromLocationType(eventType.locationType);
  const meetingViaDetail = eventType.locationType
    ? platformLabelFromLocationType(eventType.locationType)
    : eventType.location;
  return {
    id: eventType.id,
    title: eventType.name,
    slug: eventType.slug,
    owner: hostName,
    eventType: "Consultation",
    durationMinutes: eventType.durationMinutes || 30,
    bufferMinutes: 0,
    timezone: eventType.timezone || "Australia/Sydney",
    description: eventType.description,
    availability: WEEKDAYS.map((day) => ({
      day,
      enabled: day !== "Saturday" && day !== "Sunday",
      start: "09:00",
      end: "17:00",
    })),
    questions: [],
    confirmationTemplate: "",
    reminderTemplate: "",
    status,
    views: 0,
    bookingsCount: 0,
    cancelRate: 0,
    createdAt: "",
    consultationMode: "one_to_one",
    crmEventTypeId: eventType.id,
    meetingVia,
    meetingViaDetail: meetingViaDetail || undefined,
    location: meetingVia === "in_person" ? eventType.location : undefined,
    videoLink: meetingVia === "video" ? eventType.location : undefined,
  };
}

export function mergeCrmEventTypePages(
  local: BookingPage[],
  remote: BookingPage[],
): BookingPage[] {
  const byKey = new Map<string, BookingPage>();
  const take = (page: BookingPage) => {
    const key = page.crmEventTypeId || page.id;
    const existing = byKey.get(key) ?? byKey.get(page.id);
    if (existing) {
      const status: BookingPage["status"] =
        existing.status === "Live" || page.status === "Live"
          ? "Live"
          : page.status;
      const merged: BookingPage = {
        ...existing,
        ...page,
        id: existing.id,
        slug: existing.slug || page.slug,
        status,
        crmEventTypeId: page.crmEventTypeId || existing.crmEventTypeId,
      };
      byKey.set(merged.crmEventTypeId || merged.id, merged);
      byKey.set(merged.id, merged);
      return;
    }
    byKey.set(key, page);
    byKey.set(page.id, page);
  };
  for (const page of local) take(page);
  for (const page of remote) take(page);
  const unique = new Map<string, BookingPage>();
  for (const page of byKey.values()) unique.set(page.id, page);
  return [...unique.values()];
}

export function bookingCrmLinkFromRelated(
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

export function listCrmEventTypes(): Promise<CrmEventType[]> {
  return bookingCall("/event-types").then((data) =>
    extractRecords(data).map(normalizeCrmEventType),
  );
}

const EVENT_TYPE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCATION_TYPES = new Set([
  "GOOGLE_MEET",
  "ZOOM",
  "IN_PERSON",
  "PHONE",
  "CUSTOM",
]);

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function toCreateEventTypeBody(input: {
  name: string;
  slug?: string;
  durationMinutes?: number;
  timezone?: string;
  description?: string;
  active?: boolean;
  locationType?: EventTypeLocationType | string;
  location?: string;
  customLocationUrl?: string;
  meetingPlace?: "online" | "offline" | "phone";
  platform?: string;
  locationDetail?: string;
  hostIds?: string[];
  ownerHostId?: string;
  meetingType?: string;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  minimumNoticeMinutes?: number;
  maxDaysInFuture?: number;
}): Record<string, unknown> {
  const fromPlace =
    input.meetingPlace != null
      ? eventTypeLocationPayload({
          meetingPlace: input.meetingPlace,
          platform: input.platform,
          locationDetail: input.locationDetail,
        })
      : null;
  const rawType = String(input.locationType || fromPlace?.locationType || "ZOOM")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  const locationType = LOCATION_TYPES.has(rawType) ? rawType : "CUSTOM";
  const location = (input.location || fromPlace?.location || "").trim();
  const customLocationUrl = (
    input.customLocationUrl ||
    fromPlace?.customLocationUrl ||
    ""
  ).trim();
  const meetingType =
    input.meetingType ||
    (input.meetingPlace === "offline"
      ? "IN_PERSON"
      : input.meetingPlace === "phone"
        ? "PHONE_CALL"
        : "CONSULTATION");
  const hostIds = (input.hostIds ?? []).filter((id) => isUuid(id));
  const ownerHostId = isUuid(input.ownerHostId || "")
    ? input.ownerHostId
    : hostIds[0];

  const body: Record<string, unknown> = {
    name: input.name.trim(),
    durationMinutes: clampInt(input.durationMinutes, 5, 1440, 30),
    meetingType,
    locationType,
    isActive: input.active !== false,
    isPublic: true,
  };
  const slug = input.slug?.trim().toLowerCase();
  if (slug && EVENT_TYPE_SLUG.test(slug) && slug.length <= 80) body.slug = slug;
  const description = input.description?.trim();
  if (description) body.description = description.slice(0, 5000);
  if (location) body.location = location.slice(0, 500);
  if (locationType === "CUSTOM") {
    body.customLocationUrl =
      /^https?:\/\//i.test(customLocationUrl)
        ? customLocationUrl.slice(0, 2048)
        : "https://meet.google.com";
  }
  if (input.bufferBeforeMinutes != null) {
    body.bufferBeforeMinutes = clampInt(input.bufferBeforeMinutes, 0, 480, 0);
  }
  if (input.bufferAfterMinutes != null) {
    body.bufferAfterMinutes = clampInt(input.bufferAfterMinutes, 0, 480, 0);
  }
  if (input.minimumNoticeMinutes != null) {
    body.minimumNoticeMinutes = clampInt(
      input.minimumNoticeMinutes,
      0,
      20160,
      60,
    );
  }
  if (input.maxDaysInFuture != null) {
    body.maxDaysInFuture = clampInt(input.maxDaysInFuture, 1, 365, 60);
  }
  if (hostIds.length) {
    body.hostIds = hostIds;
    if (ownerHostId) body.ownerHostId = ownerHostId;
  }
  return body;
}

function isWhitelistRejection(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /property |should not exist|whitelist|unknown property/i.test(message);
}

export async function createCrmEventType(input: {
  name: string;
  slug?: string;
  durationMinutes?: number;
  timezone?: string;
  description?: string;
  active?: boolean;
  locationType?: EventTypeLocationType | string;
  location?: string;
  customLocationUrl?: string;
  meetingPlace?: "online" | "offline" | "phone";
  platform?: string;
  locationDetail?: string;
  hostIds?: string[];
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  minimumNoticeMinutes?: number;
  maxDaysInFuture?: number;
}): Promise<CrmEventType> {
  const full = toCreateEventTypeBody(input);
  try {
    const data = await bookingCall("/event-types", jsonInit("POST", full));
    return normalizeCrmEventType(asRecord(data) ?? extractRecords(data)[0] ?? {});
  } catch (err) {
    if (!isWhitelistRejection(err)) throw err;
    const message = err instanceof Error ? err.message : String(err ?? "");
    const slim = { ...full };
    if (/hostIds|ownerHostId/i.test(message)) {
      delete slim.hostIds;
      delete slim.ownerHostId;
    } else if (/customLocationUrl/i.test(message)) {
      delete slim.customLocationUrl;
    } else if (/locationType|location/i.test(message)) {
      delete slim.locationType;
      delete slim.location;
      delete slim.customLocationUrl;
    } else if (/meetingType/i.test(message)) {
      delete slim.meetingType;
    } else {
      throw err;
    }
    const data = await bookingCall("/event-types", jsonInit("POST", slim));
    return normalizeCrmEventType(asRecord(data) ?? extractRecords(data)[0] ?? {});
  }
}

export function crmEventTypeIdOf(page: {
  crmEventTypeId?: string;
  id?: string;
}): string {
  const id = page.crmEventTypeId?.trim() || page.id?.trim() || "";
  return isUuid(id) ? id : "";
}

export function listCrmAvailableSlots(input: {
  eventTypeId: string;
  from: string;
  to: string;
  hostId?: string;
  timezone?: string;
}): Promise<CrmAvailableSlot[]> {
  return bookingCall(
    `/event-types/${input.eventTypeId}/available-slots${toQuery({
      from: input.from,
      to: input.to,
      hostId: input.hostId,
      timezone: input.timezone,
    })}`,
  ).then((data) =>
    extractRecords(data)
      .map(normalizeCrmAvailableSlot)
      .filter((row): row is CrmAvailableSlot => !!row),
  );
}

export function listCrmBookingHosts(): Promise<CrmBookingHost[]> {
  return bookingCall("/hosts").then((data) =>
    extractRecords(data).map(normalizeCrmBookingHost),
  );
}

export function listCrmConsultants(): Promise<CrmBookingHost[]> {
  return bookingCall("/hosts/consultants").then((data) =>
    extractRecords(data).map(normalizeCrmBookingHost),
  );
}

export function listCrmHostSchedules(
  hostId: string,
): Promise<CrmAvailabilitySchedule[]> {
  return bookingCall(`/hosts/${hostId}/schedules`).then((data) =>
    extractRecords(data)
      .map(normalizeCrmAvailabilitySchedule)
      .filter((row) => isUuid(row.id)),
  );
}

export function saveCrmHostSchedule(
  hostId: string,
  input: {
    scheduleId?: string;
    name?: string;
    timezone?: string;
    isDefault?: boolean;
    rules: CrmAvailabilityWindow[];
  },
): Promise<CrmAvailabilitySchedule> {
  const body = {
    name: input.name || "Working hours",
    timezone: input.timezone || "Australia/Sydney",
    isDefault: input.isDefault !== false,
    rules: input.rules,
  };
  const path = input.scheduleId
    ? `/hosts/schedules/${input.scheduleId}`
    : `/hosts/${hostId}/schedules`;
  return bookingCall(
    path,
    jsonInit(input.scheduleId ? "PATCH" : "POST", body),
  ).then((data) =>
    normalizeCrmAvailabilitySchedule(
      asRecord(data) ?? extractRecords(data)[0] ?? {},
    ),
  );
}

export function addCrmScheduleOverride(
  scheduleId: string,
  input: {
    date: string;
    isUnavailable?: boolean;
    startMinute?: number;
    endMinute?: number;
    reason?: string;
  },
): Promise<unknown> {
  return bookingCall(
    `/hosts/schedules/${scheduleId}/overrides`,
    jsonInit("POST", input),
  );
}

export function removeCrmScheduleOverride(
  scheduleId: string,
  overrideId: string,
): Promise<unknown> {
  return bookingCall(
    `/hosts/schedules/${scheduleId}/overrides/${overrideId}`,
    jsonInit("DELETE"),
  );
}

export function updateCrmBookingHost(
  hostId: string,
  body: { dailyBookingLimit?: number | null; isConsultant?: boolean },
): Promise<CrmBookingHost> {
  return bookingCall(`/hosts/${hostId}`, jsonInit("PATCH", body)).then((data) =>
    normalizeCrmBookingHost(asRecord(data) ?? extractRecords(data)[0] ?? {}),
  );
}

export async function resolveCrmBookingHosts(
  people: Array<{ name: string; userId?: string }>,
  create = true,
): Promise<CrmBookingHost[]> {
  const resolved: CrmBookingHost[] = [];
  for (const person of people) {
    const host = await ensureCrmBookingHost({
      name: person.name,
      userId: person.userId,
      create,
    });
    if (host && isUuid(host.id) && !resolved.some((row) => row.id === host.id)) {
      resolved.push(host);
    }
  }
  return resolved;
}

export async function ensureCrmBookingHost(input: {
  name: string;
  userId?: string;
  email?: string;
  create?: boolean;
}): Promise<CrmBookingHost | null> {
  const hosts = await listCrmBookingHosts();
  const nameKey = input.name.trim().toLowerCase();
  const emailKey = input.email?.trim().toLowerCase() ?? "";
  const userId = input.userId && isUuid(input.userId) ? input.userId : "";
  const existing = hosts.find((host) => {
    if (userId && host.crmUserId === userId) return true;
    if (emailKey && host.email.trim().toLowerCase() === emailKey) return true;
    return host.name.trim().toLowerCase() === nameKey;
  });
  if (existing && isUuid(existing.id)) return existing;
  if (input.create === false || !userId) return null;
  try {
    const created = await bookingCall(
      "/hosts",
      jsonInit("POST", {
        userId,
        name: input.name,
        email: input.email || undefined,
        isConsultant: true,
        isActive: true,
        timezone: "Australia/Sydney",
      }),
    );
    return normalizeCrmBookingHost(
      asRecord(created) ?? extractRecords(created)[0] ?? {},
    );
  } catch {
    const again = await listCrmBookingHosts();
    return (
      again.find((host) => userId && host.crmUserId === userId) ??
      again.find((host) => host.name.trim().toLowerCase() === nameKey) ??
      null
    );
  }
}

export function listCrmBookings(filters?: {
  leadId?: string;
  contactId?: string;
  dealId?: string;
  limit?: number;
}): Promise<CrmBookingRecord[]> {
  const q = toQuery({
    leadId: filters?.leadId,
    contactId: filters?.contactId,
    dealId: filters?.dealId,
    limit: filters?.limit ?? 100,
  });
  return bookingCall(`/bookings${q}`).then((data) =>
    extractRecords(data).map(normalizeCrmBooking),
  );
}

export function createCrmBooking(input: {
  eventTypeId: string;
  startTime: string;
  name: string;
  email: string;
  timezone?: string;
  hostId?: string;
  phone?: string;
  notes?: string;
  internalNotes?: string;
  leadId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
}): Promise<CrmBookingRecord> {
  return bookingCall(
    "/bookings",
    jsonInit("POST", {
      eventTypeId: input.eventTypeId,
      startTime: input.startTime,
      startAt: input.startTime,
      name: input.name,
      email: input.email,
      timezone: input.timezone,
      hostId: input.hostId,
      phone: input.phone,
      notes: input.notes,
      internalNotes: input.internalNotes,
      leadId: input.leadId,
      contactId: input.contactId,
      companyId: input.companyId,
      dealId: input.dealId,
      ...(input.leadId
        ? { relatedEntityType: "LEAD", relatedEntityId: input.leadId }
        : {}),
    }),
  ).then((data) =>
    normalizeCrmBooking(asRecord(data) ?? extractRecords(data)[0] ?? {}),
  );
}

export function linkCrmBooking(
  bookingId: string,
  body: {
    leadId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    dealId?: string | null;
  },
): Promise<unknown> {
  return bookingCall(
    `/bookings/${bookingId}/crm-link`,
    jsonInit("PATCH", body),
  );
}

export function rescheduleCrmBooking(
  bookingId: string,
  startTime: string,
): Promise<unknown> {
  return bookingCall(
    `/bookings/${bookingId}/reschedule`,
    jsonInit("POST", { startTime, startAt: startTime }),
  );
}

export function cancelCrmBooking(bookingId: string, reason?: string): Promise<unknown> {
  return bookingCall(
    `/bookings/${bookingId}/cancel`,
    jsonInit("POST", reason ? { reason } : {}),
  );
}

export function markCrmBookingNoShow(bookingId: string): Promise<unknown> {
  return bookingCall(`/bookings/${bookingId}/no-show`, jsonInit("POST", {}));
}

export function getCrmBookingSummary(): Promise<Record<string, unknown>> {
  return bookingCall("/bookings/summary").then(
    (data) => asRecord(data) ?? {},
  );
}

export async function listCrmEventTypePages(): Promise<BookingPage[]> {
  const types = await listCrmEventTypes();
  return types.map((row) => crmEventTypeToBookingPage(row));
}

export function localHHmmFromIso(iso: string): string {
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "09:00";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function slotDateKey(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
