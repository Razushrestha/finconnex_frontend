import type { CrmAvailableSlot, CrmBookingRecord } from "@/lib/booking/api";
import { dateInTimezone } from "@/lib/booking/timezones";
import {
  internalSlotsForDate,
  type BookingCurrency,
  type BookingPage,
} from "@/lib/booking/types";

/* -------------------------------------------------------------------------- */
/* Event types: price + tile                                                  */
/* -------------------------------------------------------------------------- */

const CURRENCY_PREFIX: Record<BookingCurrency, string> = {
  NPR: "Rs",
  INR: "₹",
  AUD: "A$",
  USD: "US$",
  GBP: "£",
};

/** "Rs1000" — the symbol hugs the amount and there are no thousands separators. */
export function formatAppointmentAmount(
  amount: number,
  currency: BookingCurrency = "AUD",
): string {
  const value = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${CURRENCY_PREFIX[currency] ?? `${currency} `}${text}`;
}

export function currencyPrefix(currency: BookingCurrency = "AUD"): string {
  return CURRENCY_PREFIX[currency] ?? currency;
}

/** A price is only shown (and a payment only asked for) when it is above zero. */
export function hasPrice(price?: number): price is number {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}

/** "new test 12:40" → "NT", "test5" → "TE". */
export function eventTypeInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "ET";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
}

const TILE_COLORS = [
  "#F1948A",
  "#A8A3F0",
  "#7CCBB1",
  "#F0B35A",
  "#7DB6EC",
  "#E58FC8",
] as const;

/** Same event type, same colour — picked from the id so it never flickers. */
export function eventTypeTileColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TILE_COLORS[hash % TILE_COLORS.length]!;
}

export function matchesKeywords(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}

/* -------------------------------------------------------------------------- */
/* Slots, grouped by day in the event type's timezone                          */
/* -------------------------------------------------------------------------- */

export type AppointmentSlot = {
  /** ISO instant, exactly as the CRM generated it. */
  startTime: string;
  /** "10:00 AM", in the event type's timezone. */
  label: string;
  /** Every host who is free at this instant. */
  hostIds: string[];
  /** True when this start was filled from consultation hours, not CRM. */
  fromHours?: boolean;
};

function validZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

/** YYYY-MM-DD of an instant as seen in `timeZone`. */
export function zonedDateKey(value: string | Date, timeZone: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: validZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export function zonedTimeLabel(value: string | Date, timeZone: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: validZone(timeZone),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * The CRM lists one slot per host per start time. Merge those into one entry
 * per instant and remember which hosts are free, so "Random User" can pick one.
 */
export function groupSlotsByDay(
  slots: CrmAvailableSlot[],
  timeZone: string,
): Map<string, AppointmentSlot[]> {
  const byInstant = new Map<number, AppointmentSlot>();
  for (const slot of slots) {
    const ms = Date.parse(slot.startTime);
    if (Number.isNaN(ms)) continue;
    const existing = byInstant.get(ms);
    if (existing) {
      if (slot.hostId && !existing.hostIds.includes(slot.hostId)) {
        existing.hostIds.push(slot.hostId);
      }
      continue;
    }
    byInstant.set(ms, {
      startTime: new Date(ms).toISOString(),
      label: zonedTimeLabel(new Date(ms), timeZone),
      hostIds: slot.hostId ? [slot.hostId] : [],
    });
  }
  const days = new Map<string, AppointmentSlot[]>();
  for (const [ms, slot] of [...byInstant.entries()].sort((a, b) => a[0] - b[0])) {
    const key = zonedDateKey(new Date(ms), timeZone);
    if (!key) continue;
    const bucket = days.get(key);
    if (bucket) bucket.push(slot);
    else days.set(key, [slot]);
  }
  return days;
}

/**
 * "Sat, Oct 3, 2026 · 10:00 AM". The timezone is named only when the viewer's
 * own clock would read differently, so a Sydney slot seen from Kathmandu is
 * never mistaken for local time. Clocks are compared rather than zone names:
 * browsers report Kathmandu as "Asia/Katmandu", which is the same place.
 */
export function describeSlot(startTime: string, timeZone: string, viewerZone?: string): string {
  const key = zonedDateKey(startTime, timeZone);
  const label = zonedTimeLabel(startTime, timeZone);
  if (!key || !label) return "";
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${key}T12:00:00Z`));
  const sameClock =
    !viewerZone ||
    (zonedDateKey(startTime, viewerZone) === key && zonedTimeLabel(startTime, viewerZone) === label);
  const zone = sameClock ? "" : ` (${timeZone})`;
  return `${day} · ${label}${zone}`;
}

/**
 * A consultation that only exists in this browser has no CRM slots to read, so
 * its own weekly hours stand in. Times already past are left out.
 */
export function localPageSlots(
  page: BookingPage,
  year: number,
  month0: number,
  timeZone: string,
  now: Date = new Date(),
): Map<string, AppointmentSlot[]> {
  const days = new Map<string, AppointmentSlot[]>();
  const count = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  for (let day = 1; day <= count; day += 1) {
    const iso = isoDate(year, month0, day);
    const slots: AppointmentSlot[] = [];
    for (const hhmm of internalSlotsForDate(page, iso)) {
      const start = dateInTimezone(iso, hhmm, timeZone);
      if (Number.isNaN(start.getTime()) || start.getTime() <= now.getTime()) continue;
      slots.push({
        startTime: start.toISOString(),
        label: zonedTimeLabel(start, timeZone),
        hostIds: [],
      });
    }
    if (slots.length) days.set(iso, slots);
  }
  return days;
}

function slotMs(slot: AppointmentSlot): number {
  return Date.parse(slot.startTime);
}

function sortDaySlots(slots: AppointmentSlot[]): AppointmentSlot[] {
  return [...slots].sort((a, b) => slotMs(a) - slotMs(b));
}

/**
 * CRM available-slots used to list only the first start when a daily booking
 * limit was set. Staff still need every free time from the consultation hours
 * (Mon–Fri 09:00–17:00, etc.). Keep CRM instants when they are at least as
 * complete as those hours; otherwise fill the missing starts.
 */
export function expandOfferedSlots(input: {
  offered: Map<string, AppointmentSlot[]>;
  hours: Map<string, AppointmentSlot[]>;
  hostIds?: string[];
}): Map<string, AppointmentSlot[]> {
  const hostIds = (input.hostIds ?? []).filter(Boolean);
  const days = new Map<string, AppointmentSlot[]>();
  const keys = new Set([...input.offered.keys(), ...input.hours.keys()]);
  for (const key of keys) {
    const offered = input.offered.get(key) ?? [];
    const hours = input.hours.get(key) ?? [];
    if (offered.length >= hours.length && offered.length > 0) {
      days.set(key, sortDaySlots(offered));
      continue;
    }
    const byMs = new Map<number, AppointmentSlot>();
    for (const slot of offered) {
      const ms = slotMs(slot);
      if (!Number.isNaN(ms)) byMs.set(ms, slot);
    }
    for (const slot of hours) {
      const ms = slotMs(slot);
      if (Number.isNaN(ms) || byMs.has(ms)) continue;
      byMs.set(ms, {
        ...slot,
        hostIds: slot.hostIds.length ? slot.hostIds : hostIds,
        fromHours: true,
      });
    }
    const merged = sortDaySlots([...byMs.values()]);
    if (merged.length) days.set(key, merged);
  }
  return days;
}

function bookingIsOpen(status: string): boolean {
  return !/cancel|no-?show|declin|reject/i.test(status);
}

/**
 * Drops starts that already have an open booking for this consultation (and
 * host, when one is chosen). Used when we fill in hours the CRM omitted.
 */
export function subtractBusySlots(
  days: Map<string, AppointmentSlot[]>,
  busy: Array<{
    startTime: string;
    endTime?: string;
    eventTypeId?: string;
    hostId?: string;
    status?: string;
  }>,
  input: {
    eventTypeId?: string;
    hostId?: string;
    durationMinutes: number;
  },
): Map<string, AppointmentSlot[]> {
  const durationMs = Math.max(1, input.durationMinutes || 30) * 60_000;
  const ranges = busy
    .filter((row) => {
      if (!bookingIsOpen(row.status ?? "")) return false;
      if (input.eventTypeId && row.eventTypeId && row.eventTypeId !== input.eventTypeId) {
        return false;
      }
      if (input.hostId && row.hostId && row.hostId !== input.hostId) return false;
      return !Number.isNaN(Date.parse(row.startTime));
    })
    .map((row) => {
      const start = Date.parse(row.startTime);
      const end = row.endTime ? Date.parse(row.endTime) : start + durationMs;
      return {
        start,
        end: Number.isNaN(end) ? start + durationMs : end,
      };
    });
  if (!ranges.length) return days;

  const next = new Map<string, AppointmentSlot[]>();
  for (const [key, slots] of days) {
    const open = slots.filter((slot) => {
      const start = slotMs(slot);
      if (Number.isNaN(start)) return false;
      const end = start + durationMs;
      return !ranges.some((range) => start < range.end && end > range.start);
    });
    if (open.length) next.set(key, open);
  }
  return next;
}

/** Random User picks among the free hosts; a named user must be one of them. */
export function chooseHost(
  freeHostIds: string[],
  wanted: "random" | string,
  random: () => number = Math.random,
): string | undefined {
  if (wanted !== "random") return freeHostIds.includes(wanted) ? wanted : undefined;
  if (freeHostIds.length === 0) return undefined;
  const index = Math.min(freeHostIds.length - 1, Math.floor(random() * freeHostIds.length));
  return freeHostIds[index];
}

/* -------------------------------------------------------------------------- */
/* Month grid                                                                 */
/* -------------------------------------------------------------------------- */

export type CalendarCell = { iso: string; day: number } | null;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function isoDate(year: number, month0: number, day: number): string {
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
}

/** Monday-first weeks; `null` cells pad the first and last week. */
export function monthGrid(year: number, month0: number): CalendarCell[] {
  const lead = (new Date(Date.UTC(year, month0, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const cells: CalendarCell[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push({ iso: isoDate(year, month0, day), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** First and last day of a month — the window asked of the slots endpoint. */
export function monthBounds(year: number, month0: number): { from: string; to: string } {
  const days = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  return { from: isoDate(year, month0, 1), to: isoDate(year, month0, days) };
}

export function monthLabel(year: number, month0: number): string {
  return `${MONTH_NAMES[((month0 % 12) + 12) % 12]} ${year}`;
}

export function shiftMonth(
  year: number,
  month0: number,
  delta: number,
): { year: number; month0: number } {
  const total = year * 12 + month0 + delta;
  return { year: Math.floor(total / 12), month0: ((total % 12) + 12) % 12 };
}

/* -------------------------------------------------------------------------- */
/* Payment                                                                    */
/* -------------------------------------------------------------------------- */

export type PaymentStatus = "Due" | "Paid";

const cents = (value: number) => Math.round(value * 100) / 100;

/** What is still owed. Never negative, never fractions of a cent. */
export function amountToBePaid(price: number, paid: number): number {
  const safePaid = Number.isFinite(paid) ? Math.max(0, paid) : 0;
  return Math.max(0, cents(price - safePaid));
}

/** The amount the field starts at when the toggle flips. */
export function defaultPaidAmount(status: PaymentStatus, price: number): number {
  return status === "Paid" ? price : 0;
}

/** Parses what was typed in the amount box; empty or junk counts as 0. */
export function parsePaidAmount(text: string): number {
  const value = Number(text.replace(/,/g, "").trim());
  return Number.isFinite(value) && value > 0 ? cents(value) : 0;
}

/**
 * The CRM has no payment field, so the outcome is kept as a line of the
 * appointment's internal notes where staff will see it.
 */
export function paymentNote(input: {
  status: PaymentStatus;
  price: number;
  paid: number;
  currency?: BookingCurrency;
}): string {
  const { status, price, paid, currency } = input;
  const left = amountToBePaid(price, paid);
  const received = `${formatAppointmentAmount(paid, currency)} of ${formatAppointmentAmount(price, currency)} received`;
  return left > 0
    ? `Payment: ${status} - ${received}, ${formatAppointmentAmount(left, currency)} to be paid`
    : `Payment: ${status} - ${received}`;
}

export const INTERNAL_NOTES_LIMIT = 5000;

/** The notes field plus the payment line, within what the backend accepts. */
export function composeInternalNotes(notes: string, payment?: string): string {
  return [notes.trim(), payment?.trim() ?? ""]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, INTERNAL_NOTES_LIMIT);
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

export type CustomerSource = "Bookings" | "Contacts" | "Leads";
export const CUSTOMER_SOURCES: CustomerSource[] = ["Bookings", "Contacts", "Leads"];

export type AppointmentCustomer = {
  /** Stable key for lists. */
  key: string;
  name: string;
  email: string;
  phone?: string;
  contactId?: string;
  leadId?: string;
  source: CustomerSource;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The people who have booked before, newest first, one per email address. */
export function customersFromBookings(
  records: Array<
    Pick<CrmBookingRecord, "id" | "guestName" | "guestEmail" | "startTime"> &
      Partial<Pick<CrmBookingRecord, "contactId" | "leadId" | "raw">>
  >,
): AppointmentCustomer[] {
  const seen = new Set<string>();
  const customers: AppointmentCustomer[] = [];
  const newestFirst = [...records].sort(
    (a, b) => (Date.parse(b.startTime) || 0) - (Date.parse(a.startTime) || 0),
  );
  for (const record of newestFirst) {
    const email = record.guestEmail.trim();
    const name = record.guestName.trim();
    const key = email.toLowerCase() || `name:${name.toLowerCase()}`;
    // CRM bookings with no invitee name land as "Guest". That is not a customer.
    if (!name || seen.has(key) || (!email && /^guest$/i.test(name))) continue;
    seen.add(key);
    const raw = record.raw ?? {};
    const guest =
      raw.guest && typeof raw.guest === "object"
        ? (raw.guest as Record<string, unknown>)
        : {};
    customers.push({
      key: `booking:${key}`,
      name,
      email,
      phone: text(raw.guestPhone) || text(raw.phone) || text(guest.phone) || undefined,
      contactId: record.contactId,
      leadId: record.leadId,
      source: "Bookings",
    });
  }
  return customers;
}

export function filterCustomers(
  customers: AppointmentCustomer[],
  query: string,
): AppointmentCustomer[] {
  return customers.filter((customer) =>
    matchesKeywords(`${customer.name} ${customer.email}`, query),
  );
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

/** The first thing missing from the form, or null when it can be saved. */
export function appointmentProblem(input: {
  hasEventType: boolean;
  hasSlot: boolean;
  customer: AppointmentCustomer | null;
  needsEmail: boolean;
}): string | null {
  if (!input.hasEventType) return "Select an event type.";
  if (!input.hasSlot) return "Select a date and time.";
  if (!input.customer) return "Select a customer.";
  if (input.needsEmail && !input.customer.email.trim()) {
    return `${input.customer.name} has no email address. Pick a customer with an email, or add a new one.`;
  }
  return null;
}
