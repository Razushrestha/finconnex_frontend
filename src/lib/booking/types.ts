/** SRS §8 Booking & Scheduling */

export type BookingEventType =
  | "Call"
  | "Meeting"
  | "Site Visit"
  | "Consultation";

export type BookingPageStatus = "Draft" | "Live";

export const CONSULTANT_PRIORITIES = [
  "Low",
  "Medium",
  "High",
] as const;
export type ConsultantPriority = (typeof CONSULTANT_PRIORITIES)[number];

export type BookingStatus =
  | "Confirmed"
  | "Rescheduled"
  | "Cancelled"
  | "Completed";

/** Consultation sub-modes (shown when eventType is Consultation) */
export type ConsultationMode =
  | "one_to_one"
  | "group"
  | "collective"
  | "resource";

export type MeetingMode = "one_time" | "recurring";

export type MeetingVia = "video" | "phone" | "in_person" | "custom";

export const BOOKING_EVENT_TYPES: BookingEventType[] = [
  "Call",
  "Meeting",
  "Site Visit",
  "Consultation",
];

export const CONSULTATION_MODES: ConsultationMode[] = [
  "one_to_one",
  "group",
  "collective",
  "resource",
];

export const MEETING_MODES: MeetingMode[] = ["one_time", "recurring"];

export const MEETING_VIA_OPTIONS: MeetingVia[] = [
  "video",
  "phone",
  "in_person",
  "custom",
];

export const BOOKING_CURRENCIES = ["AUD", "USD", "NPR", "INR", "GBP"] as const;
export type BookingCurrency = (typeof BOOKING_CURRENCIES)[number];

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export interface AvailabilityRule {
  day: Weekday;
  enabled: boolean;
  start: string; // HH:mm
  end: string;
}

export interface BookingQuestion {
  id: string;
  label: string;
  required: boolean;
}

export interface BookingPage {
  id: string;
  title: string;
  slug: string;
  owner: string;
  eventType: BookingEventType;
  durationMinutes: number;
  bufferMinutes: number;
  timezone: string;
  location?: string;
  videoLink?: string;
  description: string;
  availability: AvailabilityRule[];
  questions: BookingQuestion[];
  confirmationTemplate: string;
  reminderTemplate: string;
  status: BookingPageStatus;
  views: number;
  bookingsCount: number;
  cancelRate: number;
  createdAt: string;
  /** Hours before start that guests can still book (default 2). */
  minNoticeHours?: number;
  /** How far ahead guests can book, in days (default 60). */
  maxAdvanceDays?: number;
  /** Consultation-only fields */
  consultationMode?: ConsultationMode;
  meetingMode?: MeetingMode;
  coverImageUrl?: string;
  price?: number;
  currency?: BookingCurrency;
  meetingVia?: MeetingVia;
  meetingViaDetail?: string;
  /** Group booking capacity */
  maxAttendees?: number;
  /** Assigned consultant name(s). One for most modes; many for collective. */
  consultants?: string[];
  /** Priority per assigned consultant name. */
  consultantPriorities?: Record<string, ConsultantPriority>;
}

export interface Booking {
  id: string;
  pageId: string;
  pageSlug: string;
  eventType: BookingEventType;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  start: string;
  end: string;
  answers: Record<string, string>;
  status: BookingStatus;
  manageToken: string;
  createdLead?: boolean;
  meetingId?: string;
  leadId?: string;
  contactId?: string;
  confirmationMessage?: string;
  reminderMessage?: string;
  confirmationSentAt?: string;
  reminderQueuedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
  /** When this booking replaced an earlier slot (same manage token). */
  rescheduledFrom?: string;
}

const STORE_KEY = "booking:pages:v2";

const defaultAvailability = (): AvailabilityRule[] =>
  WEEKDAYS.map((day) => ({
    day,
    enabled: day !== "Saturday" && day !== "Sunday",
    start: "09:00",
    end: "17:00",
  }));

export const CONSULTATION_MODE_META: Record<
  ConsultationMode,
  {
    title: string;
    description: string;
    showFrequency: boolean;
    multiConsultant: boolean;
  }
> = {
  one_to_one: {
    title: "One-to-One",
    description:
      "Ideal for support calls, client meetings, and any one-to-one meetings",
    showFrequency: true,
    multiConsultant: false,
  },
  group: {
    title: "Group Booking",
    description: "Ideal for workshops, webinars, and classes",
    showFrequency: true,
    multiConsultant: false,
  },
  collective: {
    title: "Collective Booking",
    description:
      "Ideal for panel interviews, board meetings, and any many-to-one meetings.",
    showFrequency: false,
    multiConsultant: true,
  },
  resource: {
    title: "Resource",
    description: "Ideal for conference room bookings and equipment rentals",
    showFrequency: false,
    multiConsultant: false,
  },
};

/** People available to assign on consultation booking pages */
export interface BookingConsultant {
  id: string;
  name: string;
  role: string;
  email: string;
}

export const BOOKING_CONSULTANTS: BookingConsultant[] = [
  {
    id: "c-john",
    name: "John Smith",
    role: "Senior Consultant",
    email: "john.smith@finconnex.com",
  },
  {
    id: "c-shiva",
    name: "Shiva Kadhka",
    role: "Mortgage Specialist",
    email: "shiva.kadhka@finconnex.com",
  },
  {
    id: "c-tejas",
    name: "Tejas Gokhe",
    role: "Product Consultant",
    email: "tejas.gokhe@finconnex.com",
  },
  {
    id: "c-roshna",
    name: "Roshna Abraham",
    role: "Client Success",
    email: "roshna.abraham@finconnex.com",
  },
  {
    id: "c-priya",
    name: "Priya Shah",
    role: "Lending Advisor",
    email: "priya.shah@finconnex.com",
  },
  {
    id: "c-marcus",
    name: "Marcus Chen",
    role: "Relationship Manager",
    email: "marcus.chen@finconnex.com",
  },
];

export function consultantsAllowMultiple(mode?: ConsultationMode) {
  if (!mode) return false;
  return CONSULTATION_MODE_META[mode].multiConsultant;
}

export function consultationModeLabel(mode?: ConsultationMode) {
  if (!mode) return "";
  return CONSULTATION_MODE_META[mode].title;
}

export function meetingModeLabel(mode?: MeetingMode) {
  if (mode === "recurring") return "Recurring";
  if (mode === "one_time") return "One Time";
  return "";
}

export function meetingViaLabel(via?: MeetingVia) {
  switch (via) {
    case "video":
      return "Video";
    case "phone":
      return "Phone";
    case "in_person":
      return "In person";
    case "custom":
      return "Custom";
    default:
      return "";
  }
}

export function formatBookingPrice(
  price?: number,
  currency: BookingCurrency = "AUD",
) {
  if (price == null || price <= 0) return "Free";
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

/** Keep legacy location/videoLink in sync with Meeting via. */
export function applyMeetingViaToLegacy(page: BookingPage): BookingPage {
  if (page.eventType !== "Consultation" || !page.meetingVia) return page;
  const detail = page.meetingViaDetail?.trim() || undefined;
  switch (page.meetingVia) {
    case "video":
      return { ...page, videoLink: detail, location: undefined };
    case "in_person":
      return { ...page, location: detail, videoLink: undefined };
    case "phone":
      return {
        ...page,
        location: detail ? `Phone: ${detail}` : "Phone",
        videoLink: undefined,
      };
    case "custom":
      return {
        ...page,
        location: detail,
        videoLink: undefined,
      };
    default:
      return page;
  }
}

export const bookingPages: BookingPage[] = [
  {
    id: "bp1",
    title: "Discovery Call",
    slug: "john-discovery",
    owner: "John Smith",
    eventType: "Call",
    durationMinutes: 30,
    bufferMinutes: 10,
    timezone: "Australia/Sydney",
    videoLink: "https://meet.google.com/fin-discovery",
    description:
      "A short intro call to understand your goals and see if FinConnex is a fit.",
    availability: defaultAvailability(),
    questions: [
      { id: "q1", label: "Company name", required: true },
      { id: "q2", label: "What are you looking to solve?", required: false },
    ],
    confirmationTemplate:
      "Hi {{name}}, your Discovery Call is confirmed for {{datetime}}. Join via the video link in this email.",
    reminderTemplate:
      "Reminder: your Discovery Call starts in 1 hour. See you soon!",
    status: "Live",
    views: 128,
    bookingsCount: 24,
    cancelRate: 8,
    createdAt: "01/07/2026",
  },
  {
    id: "bp2",
    title: "Product Demo",
    slug: "tejas-demo",
    owner: "Tejas Gokhe",
    eventType: "Meeting",
    durationMinutes: 45,
    bufferMinutes: 15,
    timezone: "Australia/Sydney",
    videoLink: "https://meet.google.com/fin-demo",
    description: "Live walkthrough of CRM modules tailored to your team.",
    availability: defaultAvailability(),
    questions: [
      { id: "q1", label: "Team size", required: true },
      { id: "q2", label: "Current CRM (if any)", required: false },
    ],
    confirmationTemplate:
      "Hi {{name}}, your Product Demo is locked in for {{datetime}}.",
    reminderTemplate: "Your FinConnex demo starts in 1 hour.",
    status: "Live",
    views: 86,
    bookingsCount: 14,
    cancelRate: 5,
    createdAt: "05/07/2026",
  },
  {
    id: "bp3",
    title: "Site Visit: Sydney",
    slug: "site-visit-syd",
    owner: "Roshna Abraham",
    eventType: "Site Visit",
    durationMinutes: 60,
    bufferMinutes: 30,
    timezone: "Australia/Sydney",
    location: "Level 12, 100 Market St, Sydney",
    description: "On-site consultation at our Sydney office.",
    availability: defaultAvailability().map((r) =>
      r.day === "Friday" ? { ...r, enabled: false } : r,
    ),
    questions: [{ id: "q1", label: "Parking needed?", required: false }],
    confirmationTemplate:
      "Hi {{name}}, your site visit is confirmed for {{datetime}} at {{location}}.",
    reminderTemplate: "Site visit tomorrow: see you at Market St.",
    status: "Draft",
    views: 12,
    bookingsCount: 2,
    cancelRate: 0,
    createdAt: "12/07/2026",
  },
  {
    id: "bp4",
    title: "Mortgage Consultation",
    slug: "shiva-consult",
    owner: "Shiva Kadhka",
    eventType: "Consultation",
    consultationMode: "one_to_one",
    meetingMode: "one_time",
    durationMinutes: 30,
    bufferMinutes: 5,
    timezone: "Australia/Sydney",
    videoLink: "https://meet.google.com/fin-consult",
    meetingVia: "video",
    meetingViaDetail: "https://meet.google.com/fin-consult",
    consultants: ["Mohit Chapagain", "Priya Shah", "Shiva Kadhka"],
    coverImageUrl:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80",
    price: 0,
    currency: "AUD",
    description: "One-to-one advice on product fit and next steps.",
    availability: defaultAvailability(),
    questions: [
      { id: "q1", label: "Preferred contact method", required: true },
    ],
    confirmationTemplate:
      "Hi {{name}}, your consultation is confirmed for {{datetime}}.",
    reminderTemplate: "Consultation reminder: starting soon.",
    status: "Live",
    views: 54,
    bookingsCount: 9,
    cancelRate: 11,
    createdAt: "10/07/2026",
  },
  {
    id: "bp5",
    title: "Rate Review",
    slug: "rate-review",
    owner: "Bishnu Aryal",
    eventType: "Consultation",
    consultationMode: "one_to_one",
    meetingMode: "one_time",
    durationMinutes: 30,
    bufferMinutes: 5,
    timezone: "Australia/Sydney",
    meetingVia: "video",
    meetingViaDetail: "https://meet.google.com/fin-rate-review",
    consultants: ["Bishnu Aryal"],
    price: 0,
    currency: "AUD",
    description: "Review current rates and refinance options.",
    availability: defaultAvailability(),
    questions: [],
    confirmationTemplate:
      "Hi {{name}}, your Rate Review is confirmed for {{datetime}}.",
    reminderTemplate: "Rate Review reminder: starting soon.",
    status: "Live",
    views: 31,
    bookingsCount: 6,
    cancelRate: 3,
    createdAt: "02/08/2026",
  },
  {
    id: "bp6",
    title: "TEST",
    slug: "test-natural-home",
    owner: "Akshay",
    eventType: "Consultation",
    consultationMode: "one_to_one",
    meetingMode: "one_time",
    durationMinutes: 30,
    bufferMinutes: 5,
    timezone: "Australia/Sydney",
    meetingVia: "video",
    consultants: ["Akshay"],
    price: 0,
    currency: "AUD",
    description: "Internal test consultation page.",
    availability: defaultAvailability(),
    questions: [],
    confirmationTemplate:
      "Hi {{name}}, your consultation is confirmed for {{datetime}}.",
    reminderTemplate: "Consultation reminder: starting soon.",
    status: "Live",
    views: 4,
    bookingsCount: 1,
    cancelRate: 0,
    createdAt: "08/08/2026",
  },
];

export const bookings: Booking[] = [
  {
    id: "bk1",
    pageId: "bp1",
    pageSlug: "john-discovery",
    eventType: "Call",
    guestName: "William Anderson",
    guestEmail: "william@example.com",
    guestPhone: "+61 400 111 222",
    start: "2026-07-23T10:00",
    end: "2026-07-23T10:30",
    answers: {
      q1: "Anderson Holdings",
      q2: "Need pipeline visibility",
    },
    status: "Confirmed",
    manageToken: "tok-william-1",
    createdLead: true,
    meetingId: "m-book-1",
  },
  {
    id: "bk2",
    pageId: "bp2",
    pageSlug: "tejas-demo",
    eventType: "Meeting",
    guestName: "Chloe Ramirez",
    guestEmail: "chloe@example.com",
    start: "2026-07-24T14:00",
    end: "2026-07-24T14:45",
    answers: { q1: "12", q2: "HubSpot" },
    status: "Confirmed",
    manageToken: "tok-chloe-1",
    createdLead: true,
    meetingId: "m-book-2",
  },
  {
    id: "bk3",
    pageId: "bp1",
    pageSlug: "john-discovery",
    eventType: "Call",
    guestName: "Marcus Lin",
    guestEmail: "marcus@example.com",
    start: "2026-07-20T11:00",
    end: "2026-07-20T11:30",
    answers: { q1: "Lin Tech", q2: "" },
    status: "Cancelled",
    manageToken: "tok-marcus-1",
    createdLead: true,
  },
  {
    id: "bk4",
    pageId: "bp4",
    pageSlug: "shiva-consult",
    eventType: "Consultation",
    guestName: "Olivia Bennett",
    guestEmail: "olivia@example.com",
    start: "2026-07-25T09:30",
    end: "2026-07-25T10:00",
    answers: { q1: "Email" },
    status: "Rescheduled",
    manageToken: "tok-olivia-1",
    createdLead: true,
  },
];

function readStore(): BookingPage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as BookingPage[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: BookingPage[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listBookingPages(): BookingPage[] {
  const stored = readStore();
  if (stored) return mergeMissingDemoPages(stored);
  const seeded = bookingPages.map((p) => ({ ...p }));
  writeStore(seeded);
  return seeded;
}

function mergeMissingDemoPages(stored: BookingPage[]): BookingPage[] {
  const missing = bookingPages.filter(
    (demo) => !stored.some((p) => p.id === demo.id),
  );
  if (missing.length === 0) return stored;
  const next = [...stored, ...missing];
  writeStore(next);
  return next;
}

export function listConsultationPages(): BookingPage[] {
  const order = ["bp5", "bp6", "bp4"];
  return listBookingPages()
    .filter((p) => p.eventType === "Consultation")
    .sort((a, b) => {
      const av = order.indexOf(a.id);
      const bv = order.indexOf(b.id);
      return (av === -1 ? 100 : av) - (bv === -1 ? 100 : bv);
    });
}

export function listActiveConsultations(): BookingPage[] {
  return listConsultationPages().filter((page) => page.status === "Live");
}

export function assignedCalendarMembers(page?: BookingPage | null): string[] {
  if (!page) return [];
  const names: string[] = [];
  for (const name of page.consultants ?? []) {
    if (name && !names.includes(name)) names.push(name);
  }
  if (page.owner && !names.includes(page.owner)) names.push(page.owner);
  return names;
}

export function calendarDefaultHost(page?: BookingPage | null): string {
  return page?.consultants?.[0] || page?.owner || "Host";
}

export { timezoneLabelFromIana as calendarTimezoneOption } from "@/lib/booking/timezones";

export function availabilityRuleForDate(
  page: BookingPage,
  dateIso: string,
): AvailabilityRule | undefined {
  const date = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  const dayName = WEEKDAYS[(date.getDay() + 6) % 7];
  return page.availability.find((rule) => rule.day === dayName);
}

/** Slots from the calendar hours (internal scheduling, no public notice window). */
export function internalSlotsForDate(
  page: BookingPage,
  dateIso: string,
): string[] {
  const rule = availabilityRuleForDate(page, dateIso);
  if (!rule?.enabled) return [];
  const [startHour, startMinute] = rule.start.split(":").map(Number);
  const [endHour, endMinute] = rule.end.split(":").map(Number);
  const startMins = startHour * 60 + startMinute;
  const endMins = endHour * 60 + endMinute;
  const duration = page.durationMinutes || 30;
  const step = duration;
  const slots: string[] = [];
  for (let mins = startMins; mins + duration <= endMins; mins += step) {
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

export function formatSlotRange(start: string, durationMinutes: number): string {
  const [hour, minute] = start.split(":").map(Number);
  const startTotal = (hour || 0) * 60 + (minute || 0);
  const endTotal = startTotal + durationMinutes;
  const toLabel = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  return `${toLabel(startTotal)} – ${toLabel(endTotal)}`;
}

export function prettyAppointmentDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  const ones = day % 10;
  const tens = day % 100;
  const suffix =
    ones === 1 && tens !== 11
      ? "st"
      : ones === 2 && tens !== 12
        ? "nd"
        : ones === 3 && tens !== 13
          ? "rd"
          : "th";
  return `${weekday}, ${month} ${day}${suffix}, ${year}`;
}

/** Full-day slots when Date & time is Custom (not limited to calendar hours). */
export function customDaySlots(
  durationMinutes: number,
  stepMinutes = 15,
): string[] {
  const duration = durationMinutes || 30;
  const slots: string[] = [];
  for (let mins = 6 * 60; mins + duration <= 22 * 60; mins += stepMinutes) {
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

export function deleteBookingPage(id: string) {
  const list = listBookingPages().filter((p) => p.id !== id);
  writeStore(list);
}

export function upsertBookingPage(page: BookingPage) {
  const normalized = applyMeetingViaToLegacy(page);
  const list = listBookingPages();
  const i = list.findIndex((p) => p.id === normalized.id);
  if (i >= 0) list[i] = normalized;
  else list.unshift(normalized);
  writeStore(list);
  return normalized;
}

export function getBookingPageBySlug(slug: string) {
  if (typeof window !== "undefined") {
    return listBookingPages().find((p) => p.slug === slug);
  }
  return bookingPages.find((p) => p.slug === slug);
}

export function getBookingPageById(id: string) {
  if (typeof window !== "undefined") {
    return listBookingPages().find((p) => p.id === id);
  }
  return bookingPages.find((p) => p.id === id);
}

const BOOKINGS_STORE_KEY = "booking:appointments:v1";

function readBookingsStore(): Booking[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BOOKINGS_STORE_KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : null;
  } catch {
    return null;
  }
}

function writeBookingsStore(list: Booking[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BOOKINGS_STORE_KEY, JSON.stringify(list));
}

function migrateLegacyBookingTokens(list: Booking[]): Booking[] {
  if (typeof window === "undefined") return list;
  const next = [...list];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith("booking:tok-") && !key?.startsWith("booking:tok"))
        continue;
      // legacy keys look like booking:${token}
    }
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("booking:") && key !== STORE_KEY && key !== BOOKINGS_STORE_KEY) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      const token = key.slice("booking:".length);
      if (!token || next.some((b) => b.manageToken === token)) continue;
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Booking;
        if (parsed?.manageToken) next.push(parsed);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return next;
}

export function listBookings(): Booking[] {
  const stored = readBookingsStore();
  if (stored) {
    const migrated = migrateLegacyBookingTokens(stored);
    if (migrated.length !== stored.length) writeBookingsStore(migrated);
    return migrated;
  }
  const seeded = bookings.map((b) => ({ ...b }));
  const withLegacy = migrateLegacyBookingTokens(seeded);
  writeBookingsStore(withLegacy);
  return withLegacy;
}

export function upsertBooking(booking: Booking) {
  const list = listBookings();
  const i = list.findIndex(
    (b) => b.id === booking.id || b.manageToken === booking.manageToken,
  );
  if (i >= 0) list[i] = booking;
  else list.unshift(booking);
  writeBookingsStore(list);
  try {
    sessionStorage.setItem(
      `booking:${booking.manageToken}`,
      JSON.stringify(booking),
    );
  } catch {
    /* ignore */
  }
  return booking;
}

export function getBookingByToken(token: string) {
  if (typeof window !== "undefined") {
    const fromList = listBookings().find((b) => b.manageToken === token);
    if (fromList) return fromList;
    try {
      const raw = sessionStorage.getItem(`booking:${token}`);
      if (raw) return JSON.parse(raw) as Booking;
    } catch {
      /* ignore */
    }
  }
  return bookings.find((b) => b.manageToken === token);
}

export function getBookingsForPage(pageId: string) {
  return listBookings().filter((b) => b.pageId === pageId);
}

export function recomputePageStats(pageId: string) {
  const page = getBookingPageById(pageId);
  if (!page) return;
  const pageBooks = getBookingsForPage(pageId);
  const active = pageBooks.filter(
    (b) => b.status === "Confirmed" || b.status === "Completed",
  );
  const cancelled = pageBooks.filter((b) => b.status === "Cancelled").length;
  upsertBookingPage({
    ...page,
    bookingsCount: Math.max(active.length, page.bookingsCount),
    cancelRate:
      pageBooks.length === 0
        ? 0
        : Math.round((cancelled / pageBooks.length) * 100),
  });
}

export function recordBookingPageView(pageId: string) {
  const page = getBookingPageById(pageId);
  if (!page) return;
  upsertBookingPage({ ...page, views: (page.views ?? 0) + 1 });
}

export function publicBookUrl(slug: string) {
  return `/book/${slug}`;
}

export function publicManageUrl(slug: string, token: string) {
  return `/book/${slug}/manage/${token}`;
}

export function publicRescheduleUrl(slug: string, token: string) {
  return `/book/${slug}?reschedule=${encodeURIComponent(token)}`;
}

export function nextBookingPageId() {
  return `bp-${Date.now()}`;
}

export function nextBookingId() {
  return `bk-${Date.now().toString(36)}`;
}

export function nextManageToken() {
  return `tok-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function toLocalDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDateTime(iso: string) {
  const normalized = iso.includes("T") ? iso : `${iso}T00:00:00`;
  const [datePart, timePart = "00:00"] = normalized.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  return new Date(y, mo - 1, d, h || 0, mi || 0, 0, 0);
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) {
  return aStart < bEnd && bStart < aEnd;
}

export function activeBookingsForSlot(
  pageId: string,
  startIso: string,
  endIso: string,
  excludeToken?: string,
) {
  const startMs = parseLocalDateTime(startIso).getTime();
  const endMs = parseLocalDateTime(endIso).getTime();
  return listBookings().filter((b) => {
    if (b.pageId !== pageId) return false;
    if (excludeToken && b.manageToken === excludeToken) return false;
    if (b.status === "Cancelled") return false;
    if (b.status === "Rescheduled") return false;
    if (b.status !== "Confirmed" && b.status !== "Completed") return false;
    const bStart = parseLocalDateTime(b.start).getTime();
    const bEnd = parseLocalDateTime(b.end).getTime();
    return rangesOverlap(startMs, endMs, bStart, bEnd);
  });
}

/** Generate slot labels for a date from availability, conflicts, notice & horizon. */
export function slotsForDate(
  page: BookingPage,
  date: Date,
  opts?: { now?: Date; excludeToken?: string },
): { start: string; label: string }[] {
  const dayName = WEEKDAYS[(date.getDay() + 6) % 7];
  const rule = page.availability.find((a) => a.day === dayName);
  if (!rule?.enabled) return [];

  const now = opts?.now ?? new Date();
  const minNoticeHours = page.minNoticeHours ?? 2;
  const maxAdvanceDays = page.maxAdvanceDays ?? 60;
  const dateStr = toLocalDateStr(date);
  const todayStr = toLocalDateStr(now);

  if (dateStr < todayStr) return [];

  const horizon = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + maxAdvanceDays,
  );
  if (date > horizon) return [];

  const [sh, sm] = rule.start.split(":").map(Number);
  const [eh, em] = rule.end.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const step = page.durationMinutes + page.bufferMinutes;
  const slots: { start: string; label: string }[] = [];
  const isGroup =
    page.eventType === "Consultation" && page.consultationMode === "group";
  const capacity = isGroup ? page.maxAttendees ?? 20 : 1;

  for (let m = startMins; m + page.durationMinutes <= endMins; m += step) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const hh = String(h).padStart(2, "0");
    const mm = String(min).padStart(2, "0");
    const startIso = `${dateStr}T${hh}:${mm}`;
    const endTotal = m + page.durationMinutes;
    const endH = String(Math.floor(endTotal / 60)).padStart(2, "0");
    const endM = String(endTotal % 60).padStart(2, "0");
    const endIso = `${dateStr}T${endH}:${endM}`;

    const slotStart = parseLocalDateTime(startIso);
    const earliest = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);
    if (slotStart < earliest) continue;

    const conflicts = activeBookingsForSlot(
      page.id,
      startIso,
      endIso,
      opts?.excludeToken,
    );
    if (conflicts.length >= capacity) continue;

    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    slots.push({
      start: `${hh}:${mm}`,
      label: `${h12}:${mm} ${ampm}`,
    });
  }
  return slots;
}

export function renderBookingTemplate(
  template: string,
  tokens: { name: string; datetime: string; location: string },
) {
  return template
    .replace(/\{\{name\}\}/gi, tokens.name)
    .replace(/\{\{datetime\}\}/gi, tokens.datetime)
    .replace(/\{\{location\}\}/gi, tokens.location);
}

export function bookingLocationLabel(page: BookingPage) {
  if (page.eventType === "Consultation" && page.meetingVia) {
    const via = meetingViaLabel(page.meetingVia);
    return page.meetingViaDetail
      ? `${via} · ${page.meetingViaDetail}`
      : via || "Meeting";
  }
  return page.videoLink || page.location || "Video call";
}

export function bookingEmbedSnippet(slug: string, title?: string) {
  const href = publicBookUrl(slug);
  const label = title ? `Book: ${title}` : "Book a meeting";
  return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
}

export function bookingIframeSnippet(slug: string) {
  const href = publicBookUrl(slug);
  return `<iframe src="${href}" style="width:100%;min-height:720px;border:0;border-radius:12px;" title="Book a meeting"></iframe>`;
}

function toUtcStamp(isoLocal: string) {
  const d = parseLocalDateTime(isoLocal);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function buildBookingIcs(input: {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  guestEmail: string;
}) {
  const uid = `${Date.now()}@finconnex.booking`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FinConnex//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(input.start)}`,
    `DTSTART:${toUtcStamp(input.start)}`,
    `DTEND:${toUtcStamp(input.end)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `DESCRIPTION:${escapeIcs(input.description)}`,
    `LOCATION:${escapeIcs(input.location)}`,
    `ATTENDEE:MAILTO:${input.guestEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function googleCalendarUrl(input: {
  title: string;
  details: string;
  location: string;
  start: string;
  end: string;
}) {
  const start = toUtcStamp(input.start);
  const end = toUtcStamp(input.end);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: input.details,
    location: input.location,
    dates: `${start}/${end}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(input: {
  title: string;
  details: string;
  location: string;
  start: string;
  end: string;
}) {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: input.title,
    body: input.details,
    location: input.location,
    startdt: parseLocalDateTime(input.start).toISOString(),
    enddt: parseLocalDateTime(input.end).toISOString(),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function downloadBookingIcs(filename: string, ics: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatBookingWhen(start: string, end: string) {
  const d = parseLocalDateTime(start);
  const date = d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const tStart = formatTime(start);
  const tEnd = formatTime(end);
  return `${date} · ${tStart} - ${tEnd}`;
}

function formatTime(iso: string) {
  const t = iso.includes("T") ? iso.split("T")[1] : iso;
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
