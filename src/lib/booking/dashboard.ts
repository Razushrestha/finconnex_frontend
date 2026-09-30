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
  consultantId: string;
  consultantName?: string;
  start: string;
  type: AppointmentType;
  status: AppointmentStatus;
  channel: AppointmentChannel;
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

export function parseAppointmentStart(iso: string) {
  const raw = iso?.trim() ?? "";
  if (!raw) return new Date(NaN);
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
  now = new Date(),
): boolean {
  if (key === "upcoming") return true;
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
  now = new Date(),
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
  now = new Date(),
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
  guestName?: string;
}) {
  const id = appointmentPersonName(row.relatedId);
  if (id && id !== row.guestName) return `${row.relatedKind} · ${id}`;
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

function mapChannel(type: Meeting["type"]): AppointmentChannel {
  if (type === "Phone Call") return "Phone Call";
  if (type === "In-person") return "In Person";
  return "Video Call";
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
    consultantId:
      host?.id ||
      meeting.organizerId ||
      meeting.bookingHostUserId ||
      "",
    consultantName,
    start: toLocalStart(meeting.startDateTime),
    type: "Consultation",
    status,
    channel: mapChannel(meeting.type),
    avatarClass: AVATARS[(guest?.name || meeting.title).length % AVATARS.length],
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
