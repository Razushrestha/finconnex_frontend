import { ianaTimezoneFromLabel } from "@/lib/booking/timezones";

/**
 * Guest (signed-out) booking against the backend's public booking API.
 *
 * A visitor has no CRM login, so their booking can only reach the CRM through
 * `/v1/public/booking/:workspaceSlug/:hostSlug/:eventTypeSlug/...`. The three
 * slugs are attached to the published page by the host's browser; the guest's
 * browser never sends them. Server routes under `/api/book/[slug]/` look them
 * up from the published page and forward the request, so a visitor can only
 * ever reach the workspace that published that page.
 */

/** Names the CRM event type a published page books into. */
export type CrmPublicRef = {
  workspaceSlug: string;
  hostSlug: string;
  eventTypeSlug: string;
};

export type PublicSlot = { startAt: string; hostId?: string };

/** Slots grouped by calendar day (`YYYY-MM-DD`) in the requested timezone. */
export type PublicSlotDays = Map<string, PublicSlot[]>;

const SLUG = /^[a-z0-9][a-z0-9_-]{0,119}$/i;
const TOKEN = /^[A-Za-z0-9._~-]{8,200}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Longest slot window a visitor may request in one call (matches a month view). */
export const MAX_SLOT_WINDOW_DAYS = 62;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

/** The slugs are interpolated into a URL path, so only plain slugs are accepted. */
export function parseCrmPublicRef(value: unknown): CrmPublicRef | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const pick = (key: string) => {
    const raw = rec[key];
    return typeof raw === "string" && SLUG.test(raw.trim()) ? raw.trim() : "";
  };
  const workspaceSlug = pick("workspaceSlug");
  const hostSlug = pick("hostSlug");
  const eventTypeSlug = pick("eventTypeSlug");
  if (!workspaceSlug || !hostSlug || !eventTypeSlug) return null;
  return { workspaceSlug, hostSlug, eventTypeSlug };
}

/** The public booking site; with `eventTypeSlug`, that consultation's own theme. */
export function publicBookingSitePath(workspaceSlug: string, eventTypeSlug?: string): string {
  const base = `/v1/public/booking/sites/${encodeURIComponent(workspaceSlug)}`;
  return eventTypeSlug ? `${base}?eventType=${encodeURIComponent(eventTypeSlug)}` : base;
}

export function publicBookingPath(
  ref: CrmPublicRef,
  suffix: "" | "/slots" | "/book" = "",
): string {
  return (
    `/v1/public/booking/${encodeURIComponent(ref.workspaceSlug)}` +
    `/${encodeURIComponent(ref.hostSlug)}/${encodeURIComponent(ref.eventTypeSlug)}${suffix}`
  );
}

/** Cancel / reschedule links are addressed by the invitee's own secret token. */
export function publicManagePath(
  token: string,
  action: "cancel" | "reschedule",
): string | null {
  if (!TOKEN.test(token)) return null;
  return `/v1/public/booking/manage/${encodeURIComponent(token)}/${action}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** Reads `{ days: [{ date, slots: [{ startAt, hostId }] }] }` from the backend. */
export function parsePublicSlotDays(data: unknown): PublicSlotDays {
  const out: PublicSlotDays = new Map();
  const root = asRecord(data);
  const days = Array.isArray(root?.days) ? root.days : [];
  for (const day of days) {
    const rec = asRecord(day);
    const date = str(rec?.date);
    if (!ISO_DATE.test(date) || !Array.isArray(rec?.slots)) continue;
    const slots: PublicSlot[] = [];
    for (const row of rec.slots) {
      const slot = asRecord(row);
      const startAt = str(slot?.startAt, slot?.start_at, slot?.startTime, slot?.start);
      if (!startAt || Number.isNaN(Date.parse(startAt))) continue;
      const hostId = str(slot?.hostId, slot?.host_id);
      slots.push(hostId ? { startAt, hostId } : { startAt });
    }
    if (slots.length) out.set(date, slots);
  }
  return out;
}

/** `YYYY-MM-DD` of an instant on the calendar of `timeZone`. */
export function dateInZone(iso: string, timeZone: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/**
 * Re-buckets open slots by the guest's calendar day. Slots are instants, so a
 * time zone change only re-reads them — no request — which is what makes
 * switching zones instant (5:15 in Sydney shows as 12:00 in Kathmandu).
 */
export function slotDaysInZone(
  days: PublicSlotDays | undefined,
  timeZone: string,
): PublicSlotDays | undefined {
  if (!days) return undefined;
  const out: PublicSlotDays = new Map();
  const seen = new Set<string>();
  for (const slots of days.values()) {
    for (const slot of slots) {
      const key = `${slot.startAt}|${slot.hostId ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const date = dateInZone(slot.startAt, timeZone);
      if (!date) continue;
      const list = out.get(date);
      if (list) list.push(slot);
      else out.set(date, [slot]);
    }
  }
  for (const list of out.values()) {
    list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  }
  return out;
}

/**
 * Zone where `startAt` reads as the consultation's opening hour (09:00), so
 * available slots match Dates and times instead of a guest-zone shift (03:45).
 */
export function workingHoursDisplayZone(
  startAt: string,
  hoursStart: string,
  zones: string[],
): string {
  const wanted = hoursStart.trim().slice(0, 5);
  const seen = new Set<string>();
  for (const raw of zones) {
    const tz = ianaTimezoneFromLabel(raw);
    if (!tz || seen.has(tz)) continue;
    seen.add(tz);
    if (wanted && timeInZone(startAt, tz) === wanted) return tz;
  }
  return ianaTimezoneFromLabel(zones[0]) || "UTC";
}

/** "09:00" → "09:00 AM", same clock as Dates and times. */
export function formatWorkingHoursClock(hhmm: string): string {
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return hhmm;
  const hour = Number(match[1]);
  const minute = match[2];
  if (!Number.isFinite(hour)) return hhmm;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${suffix}`;
}

/** `HH:mm` of an instant on the wall clock of `timeZone` (what the guest sees). */
export function timeInZone(iso: string, timeZone: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(at);
    const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
    const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hh}:${mm}`;
  } catch {
    return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
  }
}

/** Why a backend call did not produce a booking, in terms the page acts on. */
export type PublicCrmFailure =
  | "slot_unavailable"
  | "not_found"
  | "rate_limited"
  | "invalid"
  | "unavailable";

export type PublicCrmResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; code: PublicCrmFailure; message: string };

function failureCode(status: number, message: string): PublicCrmFailure {
  if (status === 409 || /slotUnavailable|no longer available/i.test(message)) {
    return "slot_unavailable";
  }
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 422) return "invalid";
  return "unavailable";
}

function envelopeMessage(body: unknown, fallback: string): string {
  const rec = asRecord(body);
  const message = rec?.message;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message) && message.length) return message.map(String).join(", ");
  return fallback;
}

/**
 * Calls the backend's public booking API from the server.
 *
 * The visitor's IP is deliberately not forwarded: a client-supplied
 * `X-Forwarded-For` could be spoofed to dodge the backend's booking throttle,
 * so every guest shares this server's throttle bucket instead.
 */
export async function callPublicCrm(
  baseUrl: string,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<PublicCrmResult> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const message = envelopeMessage(json, `Request failed (${res.status})`);
      return { ok: false, status: res.status, code: failureCode(res.status, message), message };
    }
    const rec = asRecord(json);
    const data = rec && "data" in rec ? rec.data : json;
    return { ok: true, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      code: "unavailable",
      message: err instanceof Error ? err.message : "Booking service unreachable",
    };
  }
}
