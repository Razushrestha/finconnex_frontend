/** Live booking home — CRM meetings + Calendly hosts only. */

import type { Meeting } from "@/lib/meetings/types";
import type { CalendlyHost } from "@/lib/booking/calendly-api";

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
  start: string;
  type: AppointmentType;
  status: AppointmentStatus;
  channel: AppointmentChannel;
  avatarClass: string;
  calendlyMeetingId?: string;
  calendlyInviteeId?: string;
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
  return new Date(iso);
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
  const start = parseAppointmentStart(row.start);
  if (Number.isNaN(start.getTime())) return false;
  if (key === "upcoming") return start >= startOfDay(now);
  if (key === "confirmed") {
    return (
      row.status === "Confirmed" &&
      start.getMonth() === now.getMonth() &&
      start.getFullYear() === now.getFullYear()
    );
  }
  if (key === "pending") {
    return (
      row.status === "Pending" &&
      start.getMonth() === now.getMonth() &&
      start.getFullYear() === now.getFullYear()
    );
  }
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

export function consultantById(id: string) {
  return liveConsultants.find((c) => c.id === id || c.name === id);
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

function toLocalStart(raw: string) {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
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
  hosts: CalendlyHost[] = [],
): DashboardAppointment | null {
  const status = mapMeetingStatus(meeting.status);
  if (!status) return null;
  const guest =
    meeting.attendees.find((row) => row.role === "Main Applicant") ??
    meeting.attendees.find((row) => row.role !== "Host") ??
    meeting.attendees[0];
  const related = parseRelated(meeting.relatedTo);
  const host =
    hosts.find(
      (row) =>
        row.id === meeting.organizer ||
        row.name === meeting.organizer ||
        row.email === meeting.organizer,
    ) ?? hosts.find((row) => row.isHomeConsultant);
  return {
    id: meeting.id,
    guestName: guest?.name || meeting.organizer || "Guest",
    topic: meeting.title,
    relatedKind: related.kind,
    relatedId: related.id,
    consultantId: host?.id || meeting.organizer,
    start: toLocalStart(meeting.startDateTime),
    type: "Consultation",
    status,
    channel: mapChannel(meeting.type),
    avatarClass: AVATARS[(guest?.name || meeting.title).length % AVATARS.length],
    calendlyMeetingId: meeting.id,
  };
}

export function hostsToConsultants(
  hosts: CalendlyHost[],
  appointments: DashboardAppointment[],
): DashboardConsultant[] {
  return hosts.map((host) => ({
    id: host.id,
    name: host.name,
    role: host.isHomeConsultant
      ? "Home consultant"
      : host.isConsultant
        ? "Consultant"
        : "Host",
    photo: "",
    bookings: appointments.filter(
      (row) => row.consultantId === host.id || row.consultantId === host.name,
    ).length,
  }));
}
