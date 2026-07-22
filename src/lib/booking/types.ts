/** SRS §8 Booking & Scheduling */

export type BookingEventType =
  | "Call"
  | "Meeting"
  | "Site Visit"
  | "Consultation";

export type BookingPageStatus = "Draft" | "Live";

export type BookingStatus =
  | "Confirmed"
  | "Rescheduled"
  | "Cancelled"
  | "Completed";

export const BOOKING_EVENT_TYPES: BookingEventType[] = [
  "Call",
  "Meeting",
  "Site Visit",
  "Consultation",
];

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
  cancelRate: number; // 0–100
  createdAt: string;
}

export interface Booking {
  id: string;
  pageId: string;
  pageSlug: string;
  eventType: BookingEventType;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  start: string; // ISO-ish local
  end: string;
  answers: Record<string, string>;
  status: BookingStatus;
  manageToken: string;
  createdLead?: boolean;
  meetingId?: string;
}

const defaultAvailability = (): AvailabilityRule[] =>
  WEEKDAYS.map((day) => ({
    day,
    enabled: day !== "Saturday" && day !== "Sunday",
    start: "09:00",
    end: "17:00",
  }));

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
    title: "Site Visit — Sydney",
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
    questions: [
      { id: "q1", label: "Parking needed?", required: false },
    ],
    confirmationTemplate:
      "Hi {{name}}, your site visit is confirmed for {{datetime}} at {{location}}.",
    reminderTemplate: "Site visit tomorrow — see you at Market St.",
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
    durationMinutes: 30,
    bufferMinutes: 5,
    timezone: "Australia/Sydney",
    videoLink: "https://meet.google.com/fin-consult",
    description: "One-to-one advice on product fit and next steps.",
    availability: defaultAvailability(),
    questions: [
      { id: "q1", label: "Preferred contact method", required: true },
    ],
    confirmationTemplate:
      "Hi {{name}}, your consultation is confirmed for {{datetime}}.",
    reminderTemplate: "Consultation reminder — starting soon.",
    status: "Live",
    views: 54,
    bookingsCount: 9,
    cancelRate: 11,
    createdAt: "10/07/2026",
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

export function getBookingPageBySlug(slug: string) {
  return bookingPages.find((p) => p.slug === slug);
}

export function getBookingPageById(id: string) {
  return bookingPages.find((p) => p.id === id);
}

export function getBookingByToken(token: string) {
  return bookings.find((b) => b.manageToken === token);
}

export function publicBookUrl(slug: string) {
  return `/book/${slug}`;
}

export function publicManageUrl(slug: string, token: string) {
  return `/book/${slug}/manage/${token}`;
}

/** Generate simple slot labels for a given date from availability rules */
export function slotsForDate(
  page: BookingPage,
  date: Date,
): { start: string; label: string }[] {
  const dayName = WEEKDAYS[(date.getDay() + 6) % 7]; // Mon=0 in WEEKDAYS
  const rule = page.availability.find((a) => a.day === dayName);
  if (!rule?.enabled) return [];

  const [sh, sm] = rule.start.split(":").map(Number);
  const [eh, em] = rule.end.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const step = page.durationMinutes + page.bufferMinutes;
  const slots: { start: string; label: string }[] = [];

  for (let m = startMins; m + page.durationMinutes <= endMins; m += step) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const hh = String(h).padStart(2, "0");
    const mm = String(min).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    slots.push({
      start: `${hh}:${mm}`,
      label: `${h12}:${mm} ${ampm}`,
    });
  }
  return slots;
}

export function formatBookingWhen(start: string, end: string) {
  const d = new Date(start.includes("T") ? start : start + "T12:00:00");
  const date = d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const tStart = formatTime(start);
  const tEnd = formatTime(end);
  return `${date} · ${tStart} – ${tEnd}`;
}

function formatTime(iso: string) {
  const t = iso.includes("T") ? iso.split("T")[1] : iso;
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
