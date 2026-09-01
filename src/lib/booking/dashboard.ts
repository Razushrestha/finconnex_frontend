/** Demo appointments for the Bookings operations home. */

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
}

export const DASHBOARD_CONSULTANTS: DashboardConsultant[] = [
  {
    id: "mohit",
    name: "Mohit Chapagain",
    role: "Senior Broker",
    photo: "https://i.pravatar.cc/80?u=mohit-chapagain",
    bookings: 12,
  },
  {
    id: "priya",
    name: "Priya Shah",
    role: "Lending Advisor",
    photo: "https://i.pravatar.cc/80?u=priya-shah",
    bookings: 9,
  },
  {
    id: "shiva",
    name: "Shiva Kadhka",
    role: "Mortgage Specialist",
    photo: "https://i.pravatar.cc/80?u=shiva-kadhka",
    bookings: 8,
  },
  {
    id: "john",
    name: "John Smith",
    role: "Senior Consultant",
    photo: "https://i.pravatar.cc/80?u=john-smith-fc",
    bookings: 7,
  },
  {
    id: "tejas",
    name: "Tejas Gokhe",
    role: "Product Consultant",
    photo: "https://i.pravatar.cc/80?u=tejas-gokhe",
    bookings: 6,
  },
  {
    id: "roshna",
    name: "Roshna Abraham",
    role: "Client Success",
    photo: "https://i.pravatar.cc/80?u=roshna-abraham",
    bookings: 5,
  },
];

export const DASHBOARD_ADMIN = DASHBOARD_CONSULTANTS[0];

export const DASHBOARD_APPOINTMENTS: DashboardAppointment[] = [
  {
    id: "ap1",
    guestName: "Suresh Karki",
    topic: "Home Loan Consultation",
    relatedKind: "Lead",
    relatedId: "L-10234",
    consultantId: "mohit",
    start: "2026-08-15T10:00",
    type: "Consultation",
    status: "Confirmed",
    channel: "In Person",
    avatarClass: "bg-rose-100 text-rose-700",
  },
  {
    id: "ap2",
    guestName: "Anita Sharma",
    topic: "Refinance Review",
    relatedKind: "Contact",
    relatedId: "C-88421",
    consultantId: "priya",
    start: "2026-08-15T14:00",
    type: "Review",
    status: "Pending",
    channel: "Phone Call",
    avatarClass: "bg-amber-100 text-amber-800",
  },
  {
    id: "ap3",
    guestName: "Rajesh Thapa",
    topic: "Investment Strategy",
    relatedKind: "Deal",
    relatedId: "D-4410",
    consultantId: "shiva",
    start: "2026-08-16T11:00",
    type: "Strategy Call",
    status: "Confirmed",
    channel: "Video Call",
    avatarClass: "bg-teal-100 text-teal-800",
  },
  {
    id: "ap4",
    guestName: "Maya Gurung",
    topic: "First Home Buyer",
    relatedKind: "Lead",
    relatedId: "L-10988",
    consultantId: "john",
    start: "2026-08-16T15:30",
    type: "Consultation",
    status: "Scheduled",
    channel: "In Person",
    avatarClass: "bg-sky-100 text-sky-800",
  },
  {
    id: "ap5",
    guestName: "Binod KC",
    topic: "Construction Loan",
    relatedKind: "Company",
    relatedId: "CO-2201",
    consultantId: "tejas",
    start: "2026-08-17T09:00",
    type: "Consultation",
    status: "Confirmed",
    channel: "Video Call",
    avatarClass: "bg-violet-100 text-violet-800",
  },
  {
    id: "ap6",
    guestName: "Pema Lama",
    topic: "Debt Consolidation",
    relatedKind: "Contact",
    relatedId: "C-77102",
    consultantId: "roshna",
    start: "2026-08-18T13:00",
    type: "Review",
    status: "Confirmed",
    channel: "Phone Call",
    avatarClass: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "ap7",
    guestName: "Nabin Rai",
    topic: "Pre-approval Check",
    relatedKind: "Lead",
    relatedId: "L-11002",
    consultantId: "mohit",
    start: "2026-08-19T10:30",
    type: "Consultation",
    status: "Scheduled",
    channel: "Video Call",
    avatarClass: "bg-pink-100 text-pink-800",
  },
  {
    id: "ap8",
    guestName: "Sita Adhikari",
    topic: "Rate Comparison",
    relatedKind: "Deal",
    relatedId: "D-4502",
    consultantId: "priya",
    start: "2026-08-20T16:00",
    type: "Strategy Call",
    status: "Confirmed",
    channel: "Phone Call",
    avatarClass: "bg-indigo-100 text-indigo-800",
  },
  {
    id: "ap9",
    guestName: "Hari Poudel",
    topic: "SMSF Lending",
    relatedKind: "Company",
    relatedId: "CO-2288",
    consultantId: "shiva",
    start: "2026-08-22T11:30",
    type: "Consultation",
    status: "Confirmed",
    channel: "In Person",
    avatarClass: "bg-orange-100 text-orange-800",
  },
  {
    id: "ap10",
    guestName: "Laxmi Basnet",
    topic: "Settlement Review",
    relatedKind: "Contact",
    relatedId: "C-79011",
    consultantId: "john",
    start: "2026-08-25T09:30",
    type: "Review",
    status: "Pending",
    channel: "Video Call",
    avatarClass: "bg-lime-100 text-lime-800",
  },
  {
    id: "ap11",
    guestName: "Kiran Magar",
    topic: "Home Loan Consultation",
    relatedKind: "Lead",
    relatedId: "L-12011",
    consultantId: "mohit",
    start: "2026-09-01T10:00",
    type: "Consultation",
    status: "Confirmed",
    channel: "In Person",
    avatarClass: "bg-rose-100 text-rose-700",
  },
  {
    id: "ap12",
    guestName: "Nisha Bhattarai",
    topic: "Refinance Review",
    relatedKind: "Contact",
    relatedId: "C-90112",
    consultantId: "priya",
    start: "2026-09-01T14:30",
    type: "Review",
    status: "Pending",
    channel: "Phone Call",
    avatarClass: "bg-amber-100 text-amber-800",
  },
  {
    id: "ap13",
    guestName: "Amit Joshi",
    topic: "Investment Strategy",
    relatedKind: "Deal",
    relatedId: "D-5103",
    consultantId: "shiva",
    start: "2026-09-02T11:00",
    type: "Strategy Call",
    status: "Confirmed",
    channel: "Video Call",
    avatarClass: "bg-teal-100 text-teal-800",
  },
  {
    id: "ap14",
    guestName: "Sunita Karki",
    topic: "First Home Buyer",
    relatedKind: "Lead",
    relatedId: "L-12140",
    consultantId: "john",
    start: "2026-09-03T15:30",
    type: "Consultation",
    status: "Scheduled",
    channel: "In Person",
    avatarClass: "bg-sky-100 text-sky-800",
  },
  {
    id: "ap15",
    guestName: "Prakash Rana",
    topic: "Construction Loan",
    relatedKind: "Company",
    relatedId: "CO-2409",
    consultantId: "tejas",
    start: "2026-09-04T09:00",
    type: "Consultation",
    status: "Confirmed",
    channel: "Video Call",
    avatarClass: "bg-violet-100 text-violet-800",
  },
  {
    id: "ap16",
    guestName: "Bina Tamang",
    topic: "Debt Consolidation",
    relatedKind: "Contact",
    relatedId: "C-81220",
    consultantId: "roshna",
    start: "2026-09-08T13:00",
    type: "Review",
    status: "Confirmed",
    channel: "Phone Call",
    avatarClass: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "ap17",
    guestName: "Dipesh Adhikari",
    topic: "Pre-approval Check",
    relatedKind: "Lead",
    relatedId: "L-12208",
    consultantId: "mohit",
    start: "2026-09-12T10:30",
    type: "Consultation",
    status: "Scheduled",
    channel: "Video Call",
    avatarClass: "bg-pink-100 text-pink-800",
  },
  {
    id: "ap18",
    guestName: "Sarita Gurung",
    topic: "Settlement Review",
    relatedKind: "Contact",
    relatedId: "C-83044",
    consultantId: "john",
    start: "2026-09-18T09:30",
    type: "Review",
    status: "Pending",
    channel: "Video Call",
    avatarClass: "bg-lime-100 text-lime-800",
  },
];

export type BookingKpiKey =
  | "upcoming"
  | "confirmed"
  | "pending"
  | "today"
  | "week"
  | "month";

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
    const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
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
    const sameDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
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

let extraAppointments: DashboardAppointment[] = [];

export function listDashboardAppointments(): DashboardAppointment[] {
  return [...extraAppointments, ...DASHBOARD_APPOINTMENTS];
}

export function addDashboardAppointment(row: DashboardAppointment) {
  extraAppointments = [row, ...extraAppointments];
  return row;
}

export function consultantById(id: string) {
  return DASHBOARD_CONSULTANTS.find((c) => c.id === id);
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
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

export function formatApptTime(iso: string) {
  const t = iso.split("T")[1] ?? "00:00";
  const [h, min] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${ampm}`;
}

export function appointmentDateKey(iso: string) {
  return iso.slice(0, 10);
}
