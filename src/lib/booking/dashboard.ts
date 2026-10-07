/** Live booking home — CRM meetings + workspace consultants. */

import type { Meeting } from "@/lib/meetings/types";

export type AppointmentStatus = "Confirmed" | "Pending" | "Scheduled";
export type AppointmentType = "Consultation" | "Strategy Call" | "Review";
export type AppointmentChannel = "In Person" | "Phone Call" | "Video Call";
export type RelatedKind = "Lead" | "Contact" | "Deal" | "Company";

export interface DashboardConsultant {
  id: string;
  name: string;
  role: string;
  photo: string;
  bookings: number;
}

export interface DashboardAppointment {
  id: string;
  guestName: string;
  topic: string;
  relatedKind: RelatedKind;
  relatedId: string;
  /** Display name of the linked lead, deal, or company. */
  relatedName?: string;
  /** Booking rows reschedule in place; meeting rows update that meeting. */
  recordKind?: "booking" | "meeting";
  meetingId?: string;
  consultantId: string;
  consultantName?: string;
  start: string;
  /** Local end, when the booking or meeting has one. */
  end?: string;
  /** Guest-facing number such as TE-00001. */
  bookingCode?: string;
  eventTypeId?: string;
  eventTypeName?: string;
  price?: number;
  currency?: string;
  paymentStatus?: string;
  phone?: string;
  notes?: string;
  bookedOn?: string;
  createdBy?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  channel: AppointmentChannel;
  /** True when the booking record itself named a location. Event-type defaults must not replace it. */
  channelFromBooking?: boolean;
  avatarClass: string;
}

export const DASHBOARD_CONSULTANTS: DashboardConsultant[] = [];

export const DASHBOARD_ADMIN = DASHBOARD_CONSULTANTS[0];

export const DASHBOARD_APPOINTMENTS: DashboardAppointment[] = [];

export type BookingKpiKey =
  | "upcoming"
  | "confirmed"
  | "pending"
  | "today"
  | "week"
  | "month";

const AVATARS = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-800",
  "bg-teal-100 text-teal-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function dateKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * The time zone the admin's booking screens read times in: the signed-in
 * host's own zone (what they set in their availability), not the browser's,
 * so a host working Sydney hours from Kathmandu still sees 9:00 AM, while a
 * guest sees the same booking in the zone they booked in. Null: the browser.
 *
 * The booking screens work in plain local Dates, so a zoned instant is turned
 * into a Date whose local fields are that zone's wall clock; "now" is read
 * the same way (bookingNow) and a wall-clock Date is turned back into the
 * real instant before it is sent (instantFromBookingWallClock).
 */
let displayZone: string | null = null;

export function setBookingDisplayZone(zone: string | null | undefined): void {
  const next = zone?.trim() || null;
  if (next) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: next });
    } catch {
      displayZone = null;
      return;
    }
  }
  displayZone = next;
}

export function bookingDisplayZone(): string | null {
  return displayZone;
}

/** `instant` as a Date whose local fields read `zone`'s wall clock. */
function wallClockIn(instant: Date, zone: string): Date {
  if (Number.isNaN(instant.getTime())) return instant;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}

/** Now, on the booking screens' clock. */
export function bookingNow(): Date {
  return displayZone ? wallClockIn(new Date(), displayZone) : new Date();
}

/** The real instant a wall-clock Date on the booking screens stands for. */
export function instantFromBookingWallClock(local: Date): Date {
  if (!displayZone || Number.isNaN(local.getTime())) return local;
  // Read the wall clock as if it were UTC, then correct by the zone's offset
  // at that moment (twice, so a daylight-saving edge settles).
  const asUtc = Date.UTC(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    local.getHours(),
    local.getMinutes(),
    local.getSeconds(),
  );
  let guess = asUtc;
  for (let i = 0; i < 2; i += 1) {
    const seen = wallClockIn(new Date(guess), displayZone);
    const seenUtc = Date.UTC(
      seen.getFullYear(),
      seen.getMonth(),
      seen.getDate(),
      seen.getHours(),
      seen.getMinutes(),
      seen.getSeconds(),
    );
    guess += asUtc - seenUtc;
  }
  return new Date(guess);
}

export function parseAppointmentStart(iso: string) {
  const raw = iso?.trim() ?? "";
  if (!raw) return new Date(NaN);
  // An instant with a zone ("…Z", "…+05:45") is read on the booking screens'
  // clock (the host's zone, else this browser's); reading only its digits
  // showed a UTC time as if it were local.
  if (/T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const instant = new Date(raw);
    return displayZone ? wallClockIn(instant, displayZone) : instant;
  }
  const ymd = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (ymd) {
    return new Date(
      Number(ymd[1]),
      Number(ymd[2]) - 1,
      Number(ymd[3]),
      Number(ymd[4] ?? 0),
      Number(ymd[5] ?? 0),
      Number(ymd[6] ?? 0),
    );
  }
  const dmy = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/,
  );
  if (dmy) {
    return new Date(
      Number(dmy[3]),
      Number(dmy[2]) - 1,
      Number(dmy[1]),
      Number(dmy[4] ?? 0),
      Number(dmy[5] ?? 0),
    );
  }
  const parsed = new Date(raw);
  return parsed;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = startOfDay(date);
  day.setDate(day.getDate() - day.getDay());
  return day;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function inRange(date: Date, start: Date, end: Date) {
  return date >= start && date < end;
}

export function appointmentMatchesKpi(
  row: DashboardAppointment,
  key: BookingKpiKey,
  now = bookingNow(),
): boolean {
  if (key === "upcoming") {
    const start = parseAppointmentStart(row.start);
    if (Number.isNaN(start.getTime())) return false;
    return start.getTime() >= startOfDay(now).getTime();
  }
  if (key === "confirmed") return row.status === "Confirmed";
  if (key === "pending") return row.status === "Pending";
  const start = parseAppointmentStart(row.start);
  if (Number.isNaN(start.getTime())) return false;
  if (key === "today") return dateKeyFromDate(start) === dateKeyFromDate(now);
  if (key === "week") {
    const weekStart = startOfWeek(now);
    return inRange(start, weekStart, addDays(weekStart, 7));
  }
  return (
    start.getMonth() === now.getMonth() &&
    start.getFullYear() === now.getFullYear()
  );
}

export function appointmentMatchesPriorKpi(
  row: DashboardAppointment,
  key: BookingKpiKey,
  now = bookingNow(),
): boolean {
  const start = parseAppointmentStart(row.start);
  if (Number.isNaN(start.getTime())) return false;
  if (key === "upcoming") {
    const lastMonthStart = startOfMonth(
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
    );
    const thisMonthStart = startOfMonth(now);
    return inRange(start, lastMonthStart, thisMonthStart);
  }
  if (key === "confirmed" || key === "pending" || key === "month") {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const matchStatus =
      key === "confirmed"
        ? row.status === "Confirmed"
        : key === "pending"
          ? row.status === "Pending"
          : true;
    return (
      matchStatus &&
      start.getMonth() === last.getMonth() &&
      start.getFullYear() === last.getFullYear()
    );
  }
  if (key === "today") {
    const sameDayLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );
    return dateKeyFromDate(start) === dateKeyFromDate(sameDayLastMonth);
  }
  const priorWeek = addDays(startOfWeek(now), -7);
  return inRange(start, priorWeek, addDays(priorWeek, 7));
}

export function bookingKpiStats(
  appointments: DashboardAppointment[],
  now = bookingNow(),
) {
  const keys: BookingKpiKey[] = [
    "upcoming",
    "confirmed",
    "pending",
    "today",
    "week",
    "month",
  ];
  return Object.fromEntries(
    keys.map((key) => {
      const current = appointments.filter((row) =>
        appointmentMatchesKpi(row, key, now),
      ).length;
      const previous = appointments.filter((row) =>
        appointmentMatchesPriorKpi(row, key, now),
      ).length;
      return [key, { current, previous, delta: current - previous }];
    }),
  ) as Record<BookingKpiKey, { current: number; previous: number; delta: number }>;
}

let liveAppointments: DashboardAppointment[] = [];
let liveConsultants: DashboardConsultant[] = [];

export function replaceDashboardAppointments(rows: DashboardAppointment[]) {
  liveAppointments = rows;
}

export function replaceDashboardConsultants(rows: DashboardConsultant[]) {
  liveConsultants = rows;
  DASHBOARD_CONSULTANTS.length = 0;
  DASHBOARD_CONSULTANTS.push(...rows);
}

export function listDashboardAppointments(): DashboardAppointment[] {
  return [...liveAppointments];
}

export function listDashboardConsultants(): DashboardConsultant[] {
  return [...liveConsultants];
}

export function addDashboardAppointment(row: DashboardAppointment) {
  liveAppointments = [row, ...liveAppointments.filter((item) => item.id !== row.id)];
  return row;
}

export function appointmentConsultantLabel(
  row: Pick<DashboardAppointment, "consultantId" | "consultantName">,
  consultants: { id: string; name: string; email?: string }[] = listDashboardConsultants(),
): string {
  const match = resolveConsultantMatch(
    [row.consultantId, row.consultantName],
    consultants,
  );
  return appointmentPersonName(
    match?.name,
    row.consultantName,
    appointmentConsultantName(row.consultantId),
  );
}

export function consultantById(id: string) {
  const key = id.trim().toLowerCase();
  if (!key || key === "—" || key === "-") return undefined;
  return liveConsultants.find(
    (c) => c.id.toLowerCase() === key || c.name.trim().toLowerCase() === key,
  );
}

export function appointmentConsultantName(id: string) {
  const matched = consultantById(id);
  if (matched) return matched.name;
  const value = id.trim();
  if (!value || value === "—" || value === "-") return "";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return "";
  }
  return /[a-z]/i.test(value) ? value : "";
}

export function resolveConsultantMatch(
  keys: Array<string | undefined>,
  consultants: { id: string; name: string; email?: string }[],
): { id: string; name: string } | undefined {
  const needles = keys
    .map((value) => value?.trim().toLowerCase() ?? "")
    .filter((value) => value && value !== "—" && value !== "-");
  if (!needles.length) return undefined;
  return consultants.find((row) => {
    const id = row.id.trim().toLowerCase();
    const name = row.name.trim().toLowerCase();
    const email = row.email?.trim().toLowerCase() ?? "";
    return needles.includes(id) || needles.includes(name) || (email && needles.includes(email));
  });
}

const MONTHS = [
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

export function formatApptDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return `${pad2(parsed.getDate())} ${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

export function formatApptTime(iso: string) {
  const parsed = new Date(iso);
  if (!Number.isNaN(parsed.getTime()) && !iso.includes("T")) {
    const h = parsed.getHours();
    const min = parsed.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${pad2(min)} ${ampm}`;
  }
  const t = iso.split("T")[1] ?? "00:00";
  const [h, min] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${ampm}`;
}

export function appointmentDateKey(iso: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso.slice(0, 10);
  return dateKeyFromDate(parsed);
}

export function toLocalStart(raw: string) {
  const parsed = parseAppointmentStart(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
}

export function appointmentPersonName(...candidates: (string | undefined)[]) {
  for (const raw of candidates) {
    const value = raw?.trim() ?? "";
    if (!value) continue;
    if (value === "—" || value === "-" || value === "–" || value === "?") continue;
    if (/^guest$/i.test(value)) continue;
    if (value.includes("@")) continue;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      continue;
    }
    return value;
  }
  return "";
}

export function appointmentRelatedLabel(row: {
  relatedKind: RelatedKind;
  relatedId: string;
  relatedName?: string;
  guestName?: string;
}) {
  const name = appointmentPersonName(row.relatedName, row.relatedId);
  if (name) return `${row.relatedKind} · ${name}`;
  return row.relatedKind;
}

/** Avatar letters: first letter, plus second letter when the name is one word. */
export function appointmentInitials(name: string) {
  const display = appointmentPersonName(name);
  const words = display.split(/\s+/).filter(Boolean);
  const letterAt = (word: string, index: number) => {
    const chars = [...word].filter((ch) => /[A-Za-z0-9]/.test(ch));
    return (chars[index] ?? "").toUpperCase();
  };
  if (!words.length) return "?";
  if (words.length === 1) {
    return letterAt(words[0], 0) || "?";
  }
  return `${letterAt(words[0], 0)}${letterAt(words[words.length - 1], 0)}` || "?";
}

function parseRelated(raw?: string): { kind: RelatedKind; id: string } {
  const value = raw?.trim() ?? "";
  const match = value.match(/^(Lead|Contact|Deal|Company)\s*[:·]\s*(.+)$/i);
  if (match) {
    const kind = (match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()) as RelatedKind;
    return { kind, id: match[2].trim() };
  }
  return { kind: "Contact", id: value || "—" };
}

function mapMeetingStatus(status: Meeting["status"]): AppointmentStatus | null {
  if (status === "Cancelled" || status === "Completed") return null;
  if (status === "In Progress") return "Confirmed";
  if (status === "Rescheduled") return "Pending";
  return "Scheduled";
}

export function appointmentChannelFromLocation(
  ...hints: Array<string | undefined | null>
): AppointmentChannel {
  const value = hints
    .filter((item): item is string => typeof item === "string" && !!item.trim())
    .join(" ")
    .toUpperCase();
  if (!value) return "Video Call";
  if (value.includes("PHONE")) return "Phone Call";
  if (
    value.includes("PERSON") ||
    value.includes("OFFLINE") ||
    value.includes("OFFICE") ||
    value.includes("ADDRESS")
  ) {
    return "In Person";
  }
  return "Video Call";
}

export function appointmentChannelFromVia(
  via?: string,
): AppointmentChannel | undefined {
  if (via === "phone") return "Phone Call";
  if (via === "in_person") return "In Person";
  if (via === "video" || via === "custom") return "Video Call";
  return undefined;
}

function mapChannel(type: Meeting["type"]): AppointmentChannel {
  return appointmentChannelFromLocation(type);
}

export function meetingToAppointment(
  meeting: Meeting,
  consultants: { id: string; name: string; email?: string }[] = [],
): DashboardAppointment | null {
  const status = mapMeetingStatus(meeting.status);
  if (!status) return null;
  const hostAttendee = meeting.attendees.find((row) => row.role === "Host");
  const host = resolveConsultantMatch(
    [
      meeting.organizerId,
      meeting.bookingHostUserId,
      meeting.bookingHostName,
      meeting.organizer,
      hostAttendee?.id,
      hostAttendee?.name,
      hostAttendee?.email,
    ],
    consultants,
  );
  const guest =
    meeting.attendees.find((row) => row.role === "Main Applicant") ??
    meeting.attendees.find((row) => row.role === "Guest") ??
    meeting.attendees.find((row) => row.role !== "Host") ??
    meeting.attendees[0];
  const related = parseRelated(meeting.relatedTo);
  const guestName =
    appointmentPersonName(
      guest?.role === "Host" ? "" : guest?.name,
      related.id,
      meeting.title,
      meeting.organizer,
    ) || "Guest";
  const consultantName = appointmentPersonName(
    host?.name,
    meeting.bookingHostName,
    meeting.organizer,
    hostAttendee?.name,
  );
  return {
    id: meeting.id,
    guestName,
    topic:
      appointmentPersonName(meeting.title) &&
      appointmentPersonName(meeting.title) !== guestName
        ? appointmentPersonName(meeting.title)
        : guest?.email || related.kind,
    relatedKind: related.kind,
    relatedId: related.id,
    relatedName:
      related.id && related.id !== "—" && !/^[0-9a-f-]{36}$/i.test(related.id)
        ? related.id
        : undefined,
    recordKind: "meeting",
    consultantId:
      host?.id ||
      meeting.organizerId ||
      meeting.bookingHostUserId ||
      "",
    consultantName,
    start: toLocalStart(meeting.startDateTime),
    end: meeting.endDateTime ? toLocalStart(meeting.endDateTime) : undefined,
    eventTypeName:
      appointmentPersonName(meeting.title) &&
      appointmentPersonName(meeting.title) !== guestName
        ? appointmentPersonName(meeting.title)
        : undefined,
    type: "Consultation",
    status,
    channel: mapChannel(meeting.type),
    avatarClass: AVATARS[(guest?.name || meeting.title).length % AVATARS.length],
    notes: meeting.notes || meeting.agenda,
    bookedOn: meeting.createdAt,
    createdBy: meeting.organizer || consultantName || undefined,
  };
}

export function hostsToConsultants(
  people: { id: string; name: string; role?: string }[],
  appointments: DashboardAppointment[],
): DashboardConsultant[] {
  return people.map((person) => ({
    id: person.id,
    name: person.name,
    role: person.role || "Consultant",
    photo: "",
    bookings: appointments.filter(
      (row) =>
        row.consultantId === person.id || row.consultantId === person.name,
    ).length,
  }));
}
