"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Phone,
  Video,
  MapPin,
  User,
  Briefcase,
  Building2,
  CheckCircle2,
  CalendarClock,
  TrendingUp,
  UsersRound,
  Plus,
  X,
  Mail,
  CreditCard,
  IdCard,
  Pencil,
  ExternalLink,
  MoreVertical,
  Trash2,
  RefreshCw,
  XCircle,
  UserX,
  ListFilter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { crmRecordHref, useCrmRecordName } from "@/lib/crm/related-record";
import { toast } from "@/lib/notify/toast";
import { confirmDialog } from "@/lib/notify/dialog";
import { ResizableColumns } from "@/components/common/ResizableColumns";
import {
  publicBookUrl,
  type BookingCurrency,
  type BookingPage,
} from "@/lib/booking/types";
import {
  currencyPrefix,
  eventTypeInitials,
} from "@/lib/booking/new-appointment";
import { ConsultationsBoard } from "@/components/booking/ConsultationsBoard";
import { NewAppointmentModal } from "@/components/booking/NewAppointmentModal";
import type { ScheduleMeetingSeed } from "@/app/(dashboard)/activities/meetings/create/page";
import { AppointmentDateField } from "@/components/booking/DateTimeSection";
import {
  FINANCE_PRIMARY_BUTTON,
  FINANCE_PRIMARY_BUTTON_SM,
} from "@/components/finance/buttonStyles";
import {
  appointmentDateKey,
  appointmentInitials,
  appointmentMatchesKpi,
  appointmentPersonName,
  appointmentRelatedLabel,
  appointmentStage,
  bookingKpiStats,
  consultantById,
  appointmentConsultantName,
  dateKeyFromDate,
  formatApptDate,
  formatApptTime,
  parseAppointmentStart,
  type AppointmentChannel,
  type AppointmentStage,
  type AppointmentStatus,
  type BookingKpiKey,
  type DashboardAppointment,
  type DashboardConsultant,
  type RelatedKind,
  bookingNow,
  bookingDisplayZone,
  instantFromBookingWallClock,
} from "@/lib/booking/dashboard";
import { hideAppointments, useCrmBooking } from "@/lib/booking/use-crm-booking";
import {
  cancelCrmBooking,
  clearCrmBookingNoShow,
  completeCrmBooking,
  markCrmBookingNoShow,
  readRescheduledBooking,
  reopenCrmBooking,
  tryCrmBooking,
} from "@/lib/booking/api";
import {
  cancelCrmMeeting,
  completeCrmMeeting,
  deleteCrmMeeting,
  tryCrmMeeting,
  updateCrmMeeting,
} from "@/lib/meetings/api";
import { todayIsoInTimezone } from "@/lib/booking/timezones";
import { WorkspacePortal } from "@/components/shared/WorkspacePortal";

export type BookingSection =
  "home" | "consultations" | "schedules" | "consultants";

const BRAND = "var(--brand-primary)";

function ConsultantFace({
  name,
  photo,
  className,
}: {
  name: string;
  photo?: string;
  className?: string;
}) {
  if (photo && /^https?:\/\//i.test(photo)) {
    return (
      <img
        src={photo}
        alt=""
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[var(--brand-primary-soft)] font-bold text-[var(--brand-primary)]",
        className,
      )}
    >
      {appointmentInitials(name)}
    </span>
  );
}

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  Confirmed: "bg-[#D1FAE5] text-[#059669]",
  Pending: "bg-[#FEF3C7] text-[#D97706]",
  Scheduled: "bg-[#DBEAFE] text-[#2563EB]",
  Cancelled: "border-red-200 bg-white text-red-600",
};

const RELATED_ICON: Record<RelatedKind, typeof User> = {
  Lead: User,
  Contact: User,
  Deal: Briefcase,
  Company: Building2,
};

const CHANNEL_ICON: Record<AppointmentChannel, typeof MapPin> = {
  "In Person": MapPin,
  "Phone Call": Phone,
  "Video Call": Video,
};

const STATS: {
  key: BookingKpiKey;
  label: string;
  unit: string;
  icon: typeof CalendarClock;
  iconBg: string;
  bar: string;
}[] = [
  {
    key: "upcoming",
    label: "Upcoming",
    unit: "Appointments",
    icon: CalendarClock,
    iconBg: "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]",
    bar: "bg-[var(--brand-primary)]",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    unit: "Appointments",
    icon: CheckCircle2,
    iconBg: "bg-[#D1FAE5] text-[#059669]",
    bar: "bg-[#10B981]",
  },
  {
    key: "pending",
    label: "Pending",
    unit: "Appointments",
    icon: Clock,
    iconBg: "bg-[#FEF3C7] text-[#D97706]",
    bar: "bg-[#F59E0B]",
  },
  {
    key: "today",
    label: "Today",
    unit: "Appointments",
    icon: Phone,
    iconBg: "bg-[#DBEAFE] text-[#2563EB]",
    bar: "bg-[#3B82F6]",
  },
  {
    key: "week",
    label: "This Week",
    unit: "Appointments",
    icon: TrendingUp,
    iconBg: "bg-[#E0E7FF] text-[var(--brand-primary)]",
    bar: "bg-[#6366F1]",
  },
  {
    key: "month",
    label: "This Month",
    unit: "Appointments",
    icon: UsersRound,
    iconBg: "bg-[#CCFBF1] text-[#0F766E]",
    bar: "bg-[#14B8A6]",
  },
];

const STAGE_FILTERS: {
  stage: AppointmentStage;
  icon: typeof Clock;
}[] = [
  { stage: "Booked", icon: Clock },
  { stage: "Rescheduled", icon: RefreshCw },
  { stage: "Cancelled", icon: XCircle },
  { stage: "Completed", icon: CheckCircle2 },
  { stage: "No Show", icon: UserX },
];

const TABLE_FONT_SIZES = [10, 11, 12, 13, 14, 16];
const TABLE_FONT_DEFAULT = 11;
const TABLE_FONT_KEY = "booking.appointments.fontSize";

// The table's text size, remembered per browser. Kept in memory too so the
// buttons still work when storage is blocked.
let tableFontMemory: number | null = null;
const tableFontListeners = new Set<() => void>();

function readTableFontSize() {
  if (tableFontMemory != null) return tableFontMemory;
  try {
    const saved = Number(window.localStorage.getItem(TABLE_FONT_KEY));
    if (TABLE_FONT_SIZES.includes(saved)) return saved;
  } catch {
    // Storage blocked: fall through to the default.
  }
  return TABLE_FONT_DEFAULT;
}

function writeTableFontSize(size: number) {
  tableFontMemory = size;
  try {
    window.localStorage.setItem(TABLE_FONT_KEY, String(size));
  } catch {
    // Storage blocked: the size still applies for this visit.
  }
  tableFontListeners.forEach((listener) => listener());
}

function subscribeTableFontSize(listener: () => void) {
  tableFontListeners.add(listener);
  return () => {
    tableFontListeners.delete(listener);
  };
}

function useTableFontSize() {
  const size = useSyncExternalStore(
    subscribeTableFontSize,
    readTableFontSize,
    () => TABLE_FONT_DEFAULT,
  );
  function step(direction: 1 | -1) {
    const index = TABLE_FONT_SIZES.indexOf(size);
    const next = Math.min(
      TABLE_FONT_SIZES.length - 1,
      Math.max(0, (index < 0 ? 1 : index) + direction),
    );
    writeTableFontSize(TABLE_FONT_SIZES[next]);
  }
  return [size, step] as const;
}

/** Completed appointments stay out of the list, KPIs and calendar unless filtered for. */
function isActiveAppointment(row: DashboardAppointment) {
  return appointmentStage(row) !== "Completed";
}

const KPI_TITLES: Record<BookingKpiKey, string> = {
  upcoming: "Upcoming Appointments",
  confirmed: "Confirmed Appointments",
  pending: "Pending Appointments",
  today: "Today's Appointments",
  week: "This Week's Appointments",
  month: "This Month's Appointments",
};

export function BookingsWorkspace({
  section = "home",
}: {
  section?: BookingSection;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const crm = useCrmBooking();
  const [bookOpen, setBookOpen] = useState(false);
  const activeAppointments = useMemo(
    () => crm.appointments.filter(isActiveAppointment),
    [crm.appointments],
  );

  useEffect(() => {
    if (searchParams.get("book") === "1") setBookOpen(true);
  }, [searchParams]);

  function closeBook() {
    setBookOpen(false);
    if (searchParams.get("book") === "1") router.replace("/booking");
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden px-3 pt-4 pb-3 sm:px-5 sm:pt-5 lg:px-7">
          {section === "home" ? (
            <HomeView
              appointments={crm.appointments}
              consultants={crm.consultants}
              loading={crm.loading}
              error={crm.error}
              onNewBooking={() => setBookOpen(true)}
              onViewConsultants={() => router.push("/booking/consultants")}
              onRefresh={() => crm.refresh()}
            />
          ) : null}
          {section === "consultations" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ConsultationsBoard />
            </div>
          ) : null}
          {section === "schedules" ? (
            <PagesPanel
              title="Schedules"
              hideTitle
              pages={crm.pages}
              loading={crm.loading}
              onOpenPage={(id) => router.push(`/booking/${id}`)}
            />
          ) : null}
          {section === "consultants" ? (
            <ConsultantsPanel
              consultants={crm.consultants}
              appointments={activeAppointments}
              loading={crm.loading}
              error={crm.error}
            />
          ) : null}
        </div>
      </div>
      <NewAppointmentModal
        open={bookOpen}
        onClose={closeBook}
        onCreated={() => crm.refresh()}
      />
    </div>
  );
}

function NewBookingButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(FINANCE_PRIMARY_BUTTON_SM, "h-9")}
    >
      <Plus className="h-3.5 w-3.5" />
      New Meeting
    </button>
  );
}

function HomeView({
  appointments,
  consultants,
  loading,
  error,
  onNewBooking,
  onViewConsultants,
  onRefresh,
}: {
  appointments: DashboardAppointment[];
  consultants: DashboardConsultant[];
  loading: boolean;
  error: string | null;
  onNewBooking: () => void;
  onViewConsultants: () => void;
  onRefresh: () => void;
}) {
  const now = useMemo(() => bookingNow(), [appointments]);
  const activeAppointments = useMemo(
    () => appointments.filter(isActiveAppointment),
    [appointments],
  );
  const [consultantFilter, setConsultantFilter] = useState("all");
  // "nearest": upcoming soonest-first, then past most-recent-first. The
  // Time & Date header switches to a plain earliest/latest-first order.
  const [timeSort, setTimeSort] = useState<"nearest" | "asc" | "desc">(
    "nearest",
  );
  const [stageFilter, setStageFilter] = useState<AppointmentStage | null>(null);
  const [tableFontSize, stepTableFont] = useTableFontSize();
  const [kpiFilter, setKpiFilter] = useState<BookingKpiKey | null>(null);
  const [selectedDate, setSelectedDate] = useState(() =>
    dateKeyFromDate(bookingNow()),
  );
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const d = bookingNow();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<DashboardAppointment | null>(null);
  const [editing, setEditing] = useState(false);
  const [editRow, setEditRow] = useState<DashboardAppointment | null>(null);
  const [rescheduleRow, setRescheduleRow] =
    useState<DashboardAppointment | null>(null);
  const [pageSize, setPageSize] = useState(10);

  const kpi = useMemo(
    () => bookingKpiStats(activeAppointments, now),
    [activeAppointments, now],
  );

  const rows = useMemo(() => {
    let data =
      stageFilter === "Completed" ? [...appointments] : [...activeAppointments];
    if (stageFilter) {
      data = data.filter((a) => appointmentStage(a) === stageFilter);
    }
    if (consultantFilter !== "all") {
      data = data.filter((a) => a.consultantId === consultantFilter);
    }
    if (dateFilter) {
      data = data.filter((a) => appointmentDateKey(a.start) === dateFilter);
    }
    if (kpiFilter) {
      data = data.filter((a) => appointmentMatchesKpi(a, kpiFilter, now));
    }
    // Nearest to today first: upcoming soonest-first, then past
    // appointments most-recent-first. Compared as times, not as text, so
    // starts written in different formats still order correctly.
    const nowMs = now.getTime();
    const at = (row: DashboardAppointment) => {
      const ms = parseAppointmentStart(row.start).getTime();
      return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
    };
    data.sort((a, b) => {
      if (kpiFilter) {
        const am = appointmentMatchesKpi(a, kpiFilter, now) ? 0 : 1;
        const bm = appointmentMatchesKpi(b, kpiFilter, now) ? 0 : 1;
        if (am !== bm) return am - bm;
      }
      const aStart = at(a);
      const bStart = at(b);
      if (timeSort === "asc") return aStart - bStart;
      if (timeSort === "desc") return bStart - aStart;
      const aPast = appointmentIsPast(a, nowMs) ? 1 : 0;
      const bPast = appointmentIsPast(b, nowMs) ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast;
      return aPast ? bStart - aStart : aStart - bStart;
    });
    return data;
  }, [
    appointments,
    activeAppointments,
    stageFilter,
    consultantFilter,
    dateFilter,
    kpiFilter,
    now,
    timeSort,
  ]);

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const shownFrom = rows.length ? (page - 1) * pageSize + 1 : 0;
  const shownTo = Math.min(page * pageSize, rows.length);
  // Each day's appointments in start order, for the calendar's hover card.
  const appointmentsByDay = useMemo(() => {
    const byDay = new Map<string, DashboardAppointment[]>();
    for (const a of [...activeAppointments].sort((x, y) =>
      x.start.localeCompare(y.start),
    )) {
      const key = appointmentDateKey(a.start);
      byDay.set(key, [...(byDay.get(key) ?? []), a]);
    }
    return byDay;
  }, [activeAppointments]);
  const todayKey = dateKeyFromDate(now);

  function openView(row: DashboardAppointment) {
    setEditing(false);
    setDetail(row);
  }

  function openEdit(row: DashboardAppointment) {
    setEditRow(row);
  }

  function openReschedule(row: DashboardAppointment) {
    setRescheduleRow(row);
  }

  async function cancelAppointment(row: DashboardAppointment) {
    if (row.status === "Cancelled") return;
    const meetingId =
      row.meetingId || (row.recordKind === "meeting" ? row.id : "");
    const bookingId = row.recordKind === "booking" ? row.id : "";
    if (bookingId) {
      await tryCrmBooking(() =>
        cancelCrmBooking(bookingId, "Cancelled from the appointments list"),
      );
    }
    if (meetingId) {
      await tryCrmMeeting(() => cancelCrmMeeting(meetingId));
    }
    toast.success("Appointment cancelled");
    onRefresh();
  }

  async function changeStage(row: DashboardAppointment, stage: SettableStage) {
    const current = appointmentStage(row);
    if (stage === current) return;
    if (stage === "Cancelled") return cancelAppointment(row);
    const bookingId = row.recordKind === "booking" ? row.id : "";
    const meetingId =
      row.meetingId || (row.recordKind === "meeting" ? row.id : "");
    try {
      if (bookingId) {
        // Back to booked first, so Completed and No Show never stack.
        if (current === "No Show") await clearCrmBookingNoShow(bookingId);
        if (current === "Completed") await reopenCrmBooking(bookingId);
        if (stage === "Completed") await completeCrmBooking(bookingId);
        if (stage === "No Show") await markCrmBookingNoShow(bookingId);
      } else if (stage === "Completed" && meetingId) {
        await completeCrmMeeting(meetingId);
      } else {
        return;
      }
      toast.success(
        stage === "Booked"
          ? "Appointment set back to booked"
          : `Appointment marked ${stage === "No Show" ? "a no-show" : "completed"}`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Could not update this appointment",
      );
    }
    onRefresh();
  }

  async function removeAppointment(row: DashboardAppointment) {
    if (
      !(await confirmDialog({
        title: "Delete appointment?",
        message: `Delete appointment “${row.guestName}”? This also removes it for the client.`,
        confirmText: "Delete",
        tone: "danger",
      }))
    )
      return;
    const meetingId =
      row.meetingId || (row.recordKind === "meeting" ? row.id : "");
    const bookingId = row.recordKind === "booking" ? row.id : "";
    hideAppointments([row.id, row.meetingId, bookingId]);
    if (detail?.id === row.id) setDetail(null);
    await fetch("/api/appointment/manage/remove", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId,
        bookingId,
        title: row.eventTypeName || row.topic,
        guestName: row.guestName,
        hostName: row.consultantName,
        start: row.start,
      }),
    }).catch(() => undefined);
    onRefresh();
    if (meetingId) {
      await tryCrmMeeting(() => deleteCrmMeeting(meetingId));
      await tryCrmMeeting(() => cancelCrmMeeting(meetingId));
    }
    if (bookingId) {
      await tryCrmBooking(() =>
        cancelCrmBooking(bookingId, "Deleted from upcoming appointments"),
      );
    }
    toast.success("Appointment deleted");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mb-3 flex shrink-0 justify-end">
        <NewBookingButton onClick={onNewBooking} />
      </div>
      <div className="mb-4 grid shrink-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:mb-4 xl:grid-cols-6">
        {STATS.map((s) => {
          const Icon = s.icon;
          const stat = kpi[s.key];
          const active = kpiFilter === s.key;
          const trend =
            stat.delta > 0 ? "up" : stat.delta < 0 ? "down" : "flat";
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setKpiFilter((current) => (current === s.key ? null : s.key));
                setPage(1);
              }}
              className={cn(
                "overflow-hidden rounded-xl border bg-white text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-shadow",
                active
                  ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20"
                  : "border-[#E5E7EB] hover:border-slate-300",
              )}
            >
              <div className={cn("h-[3px] w-full", s.bar)} />
              <div className="px-4 pt-3 pb-3.5">
                <div className="mb-3 flex items-start justify-between">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      s.iconBg,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="pt-1 text-[12px] font-medium text-slate-500">
                    {s.label}
                  </p>
                </div>
                <p className="text-[26px] font-bold tabular-nums leading-none text-slate-900">
                  {String(stat.current).padStart(2, "0")}
                </p>
                <p className="mt-1.5 text-[12px] font-medium text-slate-400">
                  {s.unit}
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-[11px] font-semibold",
                    trend === "up" && "text-emerald-600",
                    trend === "down" && "text-rose-500",
                    trend === "flat" && "text-slate-500",
                  )}
                >
                  {stat.delta > 0 ? "+" : ""}
                  {stat.delta} vs last month
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* The appointments card runs to the bottom of the screen and scrolls
          its rows inside, keeping the column headers and pagination in view. */}
      <div className="flex min-h-[300px] flex-1 flex-col gap-4 xl:flex-row xl:items-start">
        <section className="flex h-[min(640px,75dvh)] min-w-0 flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] xl:h-auto xl:flex-1 xl:self-stretch">
          <div className="flex flex-col gap-3 border-b border-[#E5E7EB] px-3 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
                <CalendarDays
                  className="h-4 w-4 shrink-0"
                  style={{ color: BRAND }}
                />
                {dateFilter
                  ? `Appointments on ${formatApptDate(`${dateFilter}T00:00`)}`
                  : kpiFilter
                    ? KPI_TITLES[kpiFilter]
                    : stageFilter
                      ? `${stageFilter} Appointments`
                      : "Upcoming Appointments"}
              </h2>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <StageFilterMenu
                value={stageFilter}
                onChange={(stage) => {
                  setStageFilter(stage);
                  setPage(1);
                }}
              />
              <TableFontSizeControl
                size={tableFontSize}
                onStep={stepTableFont}
              />
              <select
                value={consultantFilter}
                onChange={(e) => {
                  setConsultantFilter(e.target.value);
                  setPage(1);
                }}
                className="h-8 min-w-0 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[12px] font-medium text-slate-700 outline-none sm:flex-none"
              >
                <option value="all">All Consultants</option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {dateFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter(null);
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-[#E5E7EB] px-2.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  All dates
                </button>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="px-5 py-2 text-[12px] text-rose-600">{error}</p>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="divide-y divide-[#F3F4F6] lg:hidden">
              {loading && pageRows.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-slate-400">
                  Loading appointments…
                </p>
              ) : null}
              {!loading && pageRows.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-slate-400">
                  {dateFilter
                    ? "No appointments on this day."
                    : "No appointments from CRM meetings yet."}
                </p>
              ) : null}
              {pageRows.map((row) => (
                <AppointmentCard
                  key={row.id}
                  row={row}
                  dimmed={
                    !!kpiFilter && !appointmentMatchesKpi(row, kpiFilter, now)
                  }
                  onView={() => openView(row)}
                  onEdit={() => openEdit(row)}
                  onReschedule={() => openReschedule(row)}
                  onStage={(stage) => void changeStage(row, stage)}
                  onDelete={() => void removeAppointment(row)}
                />
              ))}
            </div>

            <div className="hidden lg:block">
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col className="w-[17%]" />
                  <col className="w-[12%]" />
                  <col className="w-[22%]" />
                  <col className="w-[20%]" />
                  <col className="w-[19%]" />
                  <col className="w-[132px]" />
                  <col className="w-[76px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-[#EEF0F3] text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    <th
                      className="px-3 py-2.5 align-middle font-semibold"
                      aria-sort={
                        timeSort === "asc"
                          ? "ascending"
                          : timeSort === "desc"
                            ? "descending"
                            : "none"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTimeSort((current) =>
                            current === "asc" ? "desc" : "asc",
                          );
                          setPage(1);
                        }}
                        title={
                          timeSort === "asc"
                            ? "Earliest first. Click for latest first."
                            : timeSort === "desc"
                              ? "Latest first. Click for earliest first."
                              : "Nearest first. Click to sort earliest first."
                        }
                        className="inline-flex items-center gap-1 uppercase hover:text-slate-600"
                      >
                        Time &amp; Date
                        {timeSort === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : timeSort === "desc" ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-60" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-2.5 align-middle font-semibold">
                      Booking ID
                    </th>
                    <th className="px-3 py-2.5 align-middle font-semibold">
                      Consultations
                    </th>
                    <th className="px-3 py-2.5 align-middle font-semibold">
                      Consultants
                    </th>
                    <th className="px-3 py-2.5 align-middle font-semibold">
                      Clients
                    </th>
                    <th className="px-3 py-2.5 align-middle font-semibold">
                      Status
                    </th>
                    <th className="px-3 py-2.5 text-center align-middle font-semibold">
                      Options
                    </th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: tableFontSize }}>
                  {loading && pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-[13px] text-slate-400"
                      >
                        Loading appointments…
                      </td>
                    </tr>
                  ) : null}
                  {!loading && pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-[13px] text-slate-400"
                      >
                        {dateFilter
                          ? "No appointments on this day."
                          : "No appointments from CRM meetings yet."}
                      </td>
                    </tr>
                  ) : null}
                  {groupAppointmentsByDate(pageRows, now).map((group) => (
                    <AppointmentDayGroup
                      key={group.key}
                      label={group.label}
                      rows={group.rows}
                      dimmedFor={(row) =>
                        !!kpiFilter &&
                        !appointmentMatchesKpi(row, kpiFilter, now)
                      }
                      onView={openView}
                      onEdit={openEdit}
                      onReschedule={openReschedule}
                      onStage={(row, stage) => void changeStage(row, stage)}
                      onDelete={(row) => void removeAppointment(row)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-[#E5E7EB] px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
            <p className="text-[12px] text-slate-500">
              Showing {shownFrom} to {shownTo} of {rows.length} appointments
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                {page}
              </span>
              <button
                type="button"
                disabled={page * pageSize >= rows.length}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) || 10);
                  setPage(1);
                }}
                className="ml-2 h-8 rounded-lg border border-[#E5E7EB] bg-white px-2 text-[11px] font-medium text-slate-600"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </section>

        {/* Stretches with the appointments card, so the calendar below
            Top Consultants ends level with the table. */}
        <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[300px] xl:self-stretch">
          <section className="shrink-0 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">
                Top Consultants
              </h3>
              <button
                type="button"
                onClick={onViewConsultants}
                className="text-[12px] font-semibold hover:opacity-80"
                style={{ color: BRAND }}
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {consultants.length === 0 ? (
                <p className="text-[12px] text-slate-400">
                  {loading ? "Loading hosts…" : "No consultants yet."}
                </p>
              ) : null}
              {consultants.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <ConsultantFace
                    name={c.name}
                    photo={c.photo}
                    className="h-9 w-9 text-[11px]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">
                      {c.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {c.role}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold tabular-nums text-slate-700">
                    {c.bookings}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <MiniCalendar
            month={month}
            selected={selectedDate}
            today={todayKey}
            appointmentsByDay={appointmentsByDay}
            onPrev={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
            onNext={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
            onSelect={(iso) => {
              setSelectedDate(iso);
              setDateFilter((current) => (current === iso ? null : iso));
              setPage(1);
            }}
          />
        </div>
      </div>

      {detail ? (
        <AppointmentDrawer
          row={detail}
          editing={editing}
          onClose={() => {
            setDetail(null);
            setEditing(false);
          }}
          onEdit={() => setEditing(true)}
          onReschedule={() => {
            const row = detail;
            setDetail(null);
            setEditing(false);
            if (row) setRescheduleRow(row);
          }}
          onEditMeeting={() => {
            const row = detail;
            setDetail(null);
            setEditing(false);
            if (row) setEditRow(row);
          }}
          onStage={(stage) => {
            if (detail) void changeStage(detail, stage);
          }}
          onDelete={() => {
            if (detail) void removeAppointment(detail);
          }}
          onSaved={() => {
            setEditing(false);
            setDetail(null);
            onRefresh();
          }}
        />
      ) : null}
      <NewAppointmentModal
        open={editRow != null}
        title="Edit"
        initial={editRow ? scheduleSeed(editRow) : undefined}
        onClose={() => setEditRow(null)}
        onCreated={() => {
          setEditRow(null);
          onRefresh();
        }}
      />
      {rescheduleRow ? (
        <RescheduleDialog
          key={rescheduleRow.id}
          row={rescheduleRow}
          onClose={() => setRescheduleRow(null)}
          onSaved={() => {
            setRescheduleRow(null);
            onRefresh();
          }}
        />
      ) : null}
    </div>
  );
}

function scheduleSeed(row: DashboardAppointment): ScheduleMeetingSeed {
  const start = parseAppointmentStart(row.start);
  const end = row.end ? parseAppointmentStart(row.end) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const valid = !Number.isNaN(start.getTime());
  const minutes =
    valid && end && !Number.isNaN(end.getTime())
      ? Math.round((end.getTime() - start.getTime()) / 60000)
      : 0;
  const linked =
    row.relatedKind === "Lead" ||
    row.relatedKind === "Deal" ||
    row.relatedKind === "Company";
  const relatedId = row.relatedId && row.relatedId !== "—" ? row.relatedId : "";
  const relatedName = appointmentPersonName(row.relatedName, row.guestName);
  return {
    title: row.eventTypeName || row.guestName,
    contactName: row.guestName,
    relatedKind: linked ? row.relatedKind : "",
    relatedName: linked ? relatedName : "",
    relatedId: linked ? relatedId : "",
    appointmentId: row.id,
    meetingId: row.meetingId,
    recordKind: row.recordKind,
    status: row.status,
    date: valid
      ? `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
      : undefined,
    time: valid
      ? `${pad(start.getHours())}:${pad(start.getMinutes())}`
      : undefined,
    duration: minutes > 0 ? `${minutes} min` : undefined,
    teamMember: row.consultantName || "Calendar Default",
  };
}

function appointmentParts(row: DashboardAppointment) {
  const start = parseAppointmentStart(row.start);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (Number.isNaN(start.getTime())) {
    return { date: row.start.slice(0, 10), time: "09:00" };
  }
  return {
    date: dateKeyFromDate(start),
    time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
  };
}

/** Over: its end (or its start, when it has no end) is before `nowMs`. */
function appointmentIsPast(row: DashboardAppointment, nowMs: number) {
  const end = parseAppointmentStart(row.end || row.start).getTime();
  return !Number.isNaN(end) && end < nowMs;
}

function groupAppointmentsByDate(rows: DashboardAppointment[], now?: Date) {
  const groups: { key: string; label: string; rows: DashboardAppointment[] }[] =
    [];
  const nowMs = now?.getTime();
  for (const row of rows) {
    const past = nowMs !== undefined && appointmentIsPast(row, nowMs);
    // Past and upcoming rows of the same day stay in separate groups.
    const key = `${appointmentDateKey(row.start)}${past ? ":past" : ""}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.rows.push(row);
    else
      groups.push({
        key,
        label: `${formatGroupDate(row.start)}${past ? " · Past" : ""}`,
        rows: [row],
      });
  }
  return groups;
}

function formatGroupDate(iso: string) {
  const date = parseAppointmentStart(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  return `${day} ${month} ${date.getFullYear()}`;
}

function formatClock(iso: string) {
  const date = parseAppointmentStart(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" AM", " am")
    .replace(" PM", " pm");
}

function formatTimeRange(row: DashboardAppointment) {
  const start = formatClock(row.start);
  const end = row.end ? formatClock(row.end) : "";
  return end && end !== start ? `${start} - ${end}` : start;
}

function consultantLabel(row: DashboardAppointment) {
  return (
    consultantById(row.consultantId)?.name ||
    row.consultantName ||
    appointmentConsultantName(row.consultantId) ||
    "—"
  );
}

// A dropdown portalled to <body>, under its trigger (right-aligned unless
// align is "start"), that closes on any outside mousedown.
function useAnchoredMenu(width: number, align: "start" | "end" = "end") {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: Event) {
      const target = event.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target))
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      left:
        align === "start"
          ? Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
          : Math.max(8, rect.right - width),
    });
    setOpen((value) => !value);
  }

  return { open, setOpen, pos, ref, menuRef, toggle };
}

/** Stages set from the status menu; Rescheduled comes from picking a new time. */
type SettableStage = Exclude<AppointmentStage, "Rescheduled">;

const STAGE_DOT: Record<AppointmentStage, string> = {
  Booked: "bg-[var(--brand-primary)]",
  Rescheduled: "bg-blue-500",
  Cancelled: "bg-red-500",
  Completed: "bg-emerald-500",
  "No Show": "bg-amber-500",
};

const STAGE_BUTTON: Record<AppointmentStage, string> = {
  Booked: "border-[#E5E7EB] text-slate-700 hover:bg-slate-50",
  Rescheduled: "border-blue-200 text-blue-600 hover:bg-blue-50",
  Cancelled: "border-red-200 text-red-600 hover:bg-red-50",
  Completed: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  "No Show": "border-amber-200 text-amber-700 hover:bg-amber-50",
};

/** Why the row cannot move to this stage, or null when it can. */
function stageBlockedReason(
  row: DashboardAppointment,
  stage: AppointmentStage,
): string | null {
  const current = appointmentStage(row);
  const booking = row.recordKind === "booking";
  if (stage === "Rescheduled") return null;
  if (current === "Cancelled" && stage !== "Cancelled") {
    return "Reschedule to reopen a cancelled appointment.";
  }
  if (current === "Completed" && !booking && stage !== "Completed") {
    return "A completed meeting cannot be changed.";
  }
  if (stage === "No Show" && !booking) {
    return "Only booked appointments can be marked a no-show.";
  }
  return null;
}

function BookingStatusMenu({
  row,
  onEdit,
  onReschedule,
  onStage,
  onDelete,
}: {
  row: DashboardAppointment;
  /** Omit Edit/Delete when a row actions menu sits beside this one. */
  onEdit?: () => void;
  onReschedule: () => void;
  onStage: (stage: SettableStage) => void;
  onDelete?: () => void;
}) {
  const current = appointmentStage(row);
  const { open, setOpen, pos, ref, menuRef, toggle } = useAnchoredMenu(176);
  // Rescheduled is still booked: Booked reads as current for it too.
  const isCurrent = (stage: AppointmentStage) =>
    stage === current || (stage === "Booked" && current === "Rescheduled");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-[11px] font-medium whitespace-nowrap shadow-sm",
          STAGE_BUTTON[current],
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {current}
        {open ? (
          <ChevronUp className="h-3 w-3 opacity-60" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-60" />
        )}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[80] w-[176px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.12)]"
              style={{ top: pos.top, left: pos.left }}
            >
              {onEdit ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onEdit();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-3 w-3 shrink-0 text-slate-400" />
                  Edit
                </button>
              ) : null}
              {STAGE_FILTERS.map(({ stage }) => {
                const blocked = stageBlockedReason(row, stage);
                const selected = stage !== "Rescheduled" && isCurrent(stage);
                return (
                  <button
                    key={stage}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    disabled={!!blocked}
                    title={blocked ?? undefined}
                    onClick={() => {
                      setOpen(false);
                      if (stage === "Rescheduled") onReschedule();
                      else if (!selected) onStage(stage);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px]",
                      selected
                        ? "bg-slate-50 font-medium text-slate-900"
                        : "text-slate-700 hover:bg-slate-50",
                      "disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        STAGE_DOT[stage],
                        blocked && "opacity-30",
                      )}
                    />
                    <span className="flex-1">
                      {stage === "Rescheduled" ? "Reschedule…" : stage}
                    </span>
                    {selected ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />
                    ) : null}
                  </button>
                );
              })}
              {onDelete ? (
                <>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 shrink-0" />
                    Delete
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function AppointmentActionsMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { open, setOpen, pos, ref, menuRef, toggle } = useAnchoredMenu(140);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex h-[26px] w-[26px] items-center justify-center rounded-md border bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700",
          open ? "border-slate-300" : "border-[#E5E7EB]",
        )}
        aria-label="Appointment actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[80] w-[140px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.12)]"
              style={{ top: pos.top, left: pos.left }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function StageFilterMenu({
  value,
  onChange,
}: {
  value: AppointmentStage | null;
  onChange: (stage: AppointmentStage | null) => void;
}) {
  const { open, setOpen, pos, ref, menuRef, toggle } = useAnchoredMenu(
    180,
    "start",
  );
  const active = STAGE_FILTERS.find((item) => item.stage === value);
  const ActiveIcon = active?.icon ?? ListFilter;

  function pick(stage: AppointmentStage | null) {
    setOpen(false);
    onChange(stage);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium",
          value
            ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
            : "border-[#E5E7EB] bg-white text-slate-700 hover:bg-slate-50",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <ActiveIcon className="h-3.5 w-3.5 shrink-0" />
        {value ?? "All Statuses"}
        {open ? (
          <ChevronUp className="h-3 w-3 opacity-60" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-60" />
        )}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[80] w-[180px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.12)]"
              style={{ top: pos.top, left: pos.left }}
            >
              <button
                type="button"
                role="menuitemradio"
                aria-checked={value === null}
                onClick={() => pick(null)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-slate-50",
                  value === null
                    ? "font-medium text-[var(--brand-primary)]"
                    : "text-slate-700",
                )}
              >
                <ListFilter className="h-3.5 w-3.5 shrink-0" />
                All Statuses
              </button>
              {STAGE_FILTERS.map(({ stage, icon: Icon }) => (
                <button
                  key={stage}
                  type="button"
                  role="menuitemradio"
                  aria-checked={value === stage}
                  onClick={() => pick(stage)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-slate-50",
                    value === stage
                      ? "bg-[var(--brand-primary-soft)] font-medium text-[var(--brand-primary)]"
                      : "text-slate-700",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      value === stage
                        ? "text-[var(--brand-primary)]"
                        : "text-slate-400",
                    )}
                  />
                  {stage}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function TableFontSizeControl({
  size,
  onStep,
}: {
  size: number;
  onStep: (direction: 1 | -1) => void;
}) {
  const min = size <= TABLE_FONT_SIZES[0];
  const max = size >= TABLE_FONT_SIZES[TABLE_FONT_SIZES.length - 1];
  return (
    <div
      role="group"
      aria-label="Table text size"
      className="hidden h-8 items-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-white lg:inline-flex"
    >
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={min}
        title="Smaller text"
        aria-label="Smaller text"
        className="flex h-full w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="h-4 w-px bg-[#E5E7EB]" aria-hidden />
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={max}
        title="Larger text"
        aria-label="Larger text"
        className="flex h-full w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AppointmentDayGroup({
  label,
  rows,
  dimmedFor,
  onView,
  onEdit,
  onReschedule,
  onStage,
  onDelete,
}: {
  label: string;
  rows: DashboardAppointment[];
  dimmedFor: (row: DashboardAppointment) => boolean;
  onView: (row: DashboardAppointment) => void;
  onEdit: (row: DashboardAppointment) => void;
  onReschedule: (row: DashboardAppointment) => void;
  onStage: (row: DashboardAppointment, stage: SettableStage) => void;
  onDelete: (row: DashboardAppointment) => void;
}) {
  return (
    <>
      <tr className="border-b border-[#EEF0F3] bg-white">
        <td colSpan={7} className="px-3 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-[1em] font-medium text-slate-500">
            <CalendarDays className="h-[1.27em] w-[1.27em] shrink-0 text-slate-400" />
            {label}
          </span>
        </td>
      </tr>
      {rows.map((row) => (
        <AppointmentRow
          key={row.id}
          row={row}
          dimmed={dimmedFor(row)}
          onView={() => onView(row)}
          onEdit={() => onEdit(row)}
          onReschedule={() => onReschedule(row)}
          onStage={(stage) => onStage(row, stage)}
          onDelete={() => onDelete(row)}
        />
      ))}
    </>
  );
}

function AppointmentCard({
  row,
  dimmed = false,
  onView,
  onEdit,
  onReschedule,
  onStage,
  onDelete,
}: {
  row: DashboardAppointment;
  dimmed?: boolean;
  onView: () => void;
  onEdit: () => void;
  onReschedule: () => void;
  onStage: (stage: SettableStage) => void;
  onDelete: () => void;
}) {
  const consultant = consultantById(row.consultantId);
  const RelatedIcon = RELATED_ICON[row.relatedKind];
  const ChannelIcon = CHANNEL_ICON[row.channel];

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
      className={cn(
        "cursor-pointer px-3 py-3.5 sm:px-4",
        dimmed && "pointer-events-none opacity-40 blur-[2px]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
            row.avatarClass,
          )}
        >
          {appointmentInitials(row.guestName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {row.guestName}
              </p>
              <p className="truncate text-[11px] text-slate-500">{row.topic}</p>
            </div>
            <div
              className="flex shrink-0 items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <BookingStatusMenu
                row={row}
                onReschedule={onReschedule}
                onStage={onStage}
              />
              <AppointmentActionsMenu onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-[12px] text-slate-600 min-[480px]:grid-cols-2">
            <p className="flex items-center gap-1.5">
              <RelatedIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{appointmentRelatedLabel(row)}</span>
            </p>
            {consultant?.name ||
            row.consultantName ||
            appointmentConsultantName(row.consultantId) ? (
              <p className="flex items-center gap-1.5">
                <ConsultantFace
                  name={
                    consultant?.name ||
                    row.consultantName ||
                    appointmentConsultantName(row.consultantId)
                  }
                  photo={consultant?.photo}
                  className="h-4 w-4 text-[8px]"
                />
                <span className="truncate">
                  {consultant?.name ||
                    row.consultantName ||
                    appointmentConsultantName(row.consultantId)}
                </span>
              </p>
            ) : null}
            <p className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="tabular-nums">{formatApptDate(row.start)}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="tabular-nums">{formatApptTime(row.start)}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <ChannelIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {row.channel}
            </p>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                STATUS_STYLE[row.status],
              )}
            >
              {row.status}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function AppointmentRow({
  row,
  dimmed = false,
  onView,
  onEdit,
  onReschedule,
  onStage,
  onDelete,
}: {
  row: DashboardAppointment;
  dimmed?: boolean;
  onView: () => void;
  onEdit: () => void;
  onReschedule: () => void;
  onStage: (stage: SettableStage) => void;
  onDelete: () => void;
}) {
  const eventName = row.eventTypeName || row.type;

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
      className={cn(
        "cursor-pointer border-b border-[#F3F4F6] bg-[#F8F7FB] last:border-0 hover:bg-[#F3F1F8]",
        dimmed && "pointer-events-none opacity-40 blur-[2px]",
      )}
    >
      <td className="px-3 py-2 align-middle">
        <span className="flex min-w-0 items-center gap-1.5 text-[1em] text-slate-700">
          <Clock className="h-[1.27em] w-[1.27em] shrink-0 text-slate-400" />
          <span className="line-clamp-2 break-words">
            {formatTimeRange(row)}
          </span>
        </span>
      </td>
      <td className="truncate px-3 py-2 align-middle text-[1em] font-medium text-slate-800">
        {row.bookingCode || "—"}
      </td>
      <td className="px-3 py-2 align-middle">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex h-[1.8em] w-[1.8em] shrink-0 items-center justify-center rounded bg-[#7C6AE8] text-[0.82em] font-bold text-white">
            {eventTypeInitials(eventName)}
          </span>
          <span
            className="line-clamp-2 break-words text-[1em] text-slate-800"
            title={eventName}
          >
            {eventName}
          </span>
        </span>
      </td>
      <td className="px-3 py-2 align-middle">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex h-[1.8em] w-[1.8em] shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <User className="h-[1.1em] w-[1.1em]" />
          </span>
          <span
            className="line-clamp-2 break-words text-[1em] text-slate-800"
            title={consultantLabel(row)}
          >
            {consultantLabel(row)}
          </span>
        </span>
      </td>
      <td className="px-3 py-2 align-middle">
        <span className="flex min-w-0 items-center gap-1.5 text-[1em] text-slate-700">
          <span className="flex h-[1.8em] w-[1.8em] shrink-0 items-center justify-center text-slate-400">
            <User className="h-[1.27em] w-[1.27em]" />
          </span>
          <span className="line-clamp-2 break-words" title={row.guestName}>
            {row.guestName}
          </span>
        </span>
      </td>
      <td
        className="px-3 py-2 align-middle"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <BookingStatusMenu
          row={row}
          onReschedule={onReschedule}
          onStage={onStage}
        />
      </td>
      <td
        className="px-3 py-2 align-middle"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          <AppointmentActionsMenu onEdit={onEdit} onDelete={onDelete} />
        </div>
      </td>
    </tr>
  );
}

const DAY_CARD_WIDTH = 288;
const DAY_CARD_MAX_ROWS = 6;

function MiniCalendar({
  month,
  selected,
  today,
  appointmentsByDay,
  onPrev,
  onNext,
  onSelect,
}: {
  month: Date;
  selected: string;
  today: string;
  appointmentsByDay: Map<string, DashboardAppointment[]>;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (iso: string) => void;
}) {
  // The day under the pointer (or keyboard focus) and where its card goes.
  // Fixed to the viewport so the page's scrolling panels cannot clip it.
  const [hovered, setHovered] = useState<{
    iso: string;
    style: { top?: number; bottom?: number; left: number };
  } | null>(null);

  function showDay(iso: string, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    const rows = Math.min(
      appointmentsByDay.get(iso)?.length ?? 0,
      DAY_CARD_MAX_ROWS,
    );
    const estimatedHeight = 64 + Math.max(rows, 1) * 52;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - DAY_CARD_WIDTH / 2, 8),
      window.innerWidth - DAY_CARD_WIDTH - 8,
    );
    const fitsBelow = rect.bottom + 8 + estimatedHeight <= window.innerHeight;
    setHovered({
      iso,
      style: fitsBelow
        ? { top: rect.bottom + 6, left }
        : { bottom: window.innerHeight - rect.top + 6, left },
    });
  }

  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDow = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="flex min-h-[280px] flex-1 flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h3 className="text-[14px] font-bold text-slate-900">{label}</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPrev}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-7 text-center text-[10px] font-semibold tracking-wide text-slate-400">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 text-center">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="min-h-9" />;
          const iso = `${year}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = iso === selected;
          const isToday = iso === today;
          const busy = appointmentsByDay.has(iso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              onMouseEnter={(e) => showDay(iso, e.currentTarget)}
              onMouseLeave={() => setHovered(null)}
              onFocus={(e) => showDay(iso, e.currentTarget)}
              onBlur={() => setHovered(null)}
              aria-describedby={
                hovered?.iso === iso ? "calendar-day-card" : undefined
              }
              className="relative flex h-full min-h-9 items-center justify-center"
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium",
                  isSelected
                    ? "text-white"
                    : isToday
                      ? "font-bold text-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/40"
                      : "text-slate-700 hover:bg-slate-100",
                )}
                style={isSelected ? { backgroundColor: BRAND } : undefined}
              >
                {day}
              </span>
              {busy && !isSelected ? (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full"
                  style={{ backgroundColor: BRAND }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {hovered ? (
        <DayBookingsCard
          iso={hovered.iso}
          appointments={appointmentsByDay.get(hovered.iso) ?? []}
          style={hovered.style}
        />
      ) : null}
    </section>
  );
}

/** Hover card listing one day's bookings with their statuses. */
function DayBookingsCard({
  iso,
  appointments,
  style,
}: {
  iso: string;
  appointments: DashboardAppointment[];
  style: { top?: number; bottom?: number; left: number };
}) {
  const [y, m, d] = iso.split("-").map(Number);
  const title = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const shown = appointments.slice(0, DAY_CARD_MAX_ROWS);
  const hidden = appointments.length - shown.length;
  return (
    <div
      id="calendar-day-card"
      role="tooltip"
      className="pointer-events-none fixed z-50 rounded-xl border border-[#E5E7EB] bg-white p-3 text-left shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
      style={{ ...style, width: DAY_CARD_WIDTH }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-slate-900">{title}</p>
        <p className="text-[11px] text-slate-400">
          {appointments.length
            ? `${appointments.length} booking${appointments.length === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>
      {appointments.length === 0 ? (
        <p className="py-1 text-[12px] text-slate-400">
          No bookings on this day.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
            >
              <span className="w-[58px] shrink-0 pt-px text-[11px] font-semibold tabular-nums text-slate-700">
                {formatApptTime(a.start)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-slate-800">
                  {a.guestName}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {a.consultantName ||
                    appointmentConsultantName(a.consultantId) ||
                    a.type}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  STATUS_STYLE[a.status],
                )}
              >
                {a.status}
              </span>
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 ? (
        <p className="mt-2 text-[11px] text-slate-500">
          +{hidden} more. Click the date to see them all.
        </p>
      ) : null}
    </div>
  );
}

function AppointmentDrawer({
  row,
  editing,
  onClose,
  onEdit,
  onEditMeeting,
  onReschedule,
  onStage,
  onDelete,
  onSaved,
}: {
  row: DashboardAppointment;
  editing: boolean;
  onClose: () => void;
  onEdit: () => void;
  onEditMeeting: () => void;
  onReschedule: () => void;
  onStage: (stage: SettableStage) => void;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const consultant = consultantById(row.consultantId);
  const initial = appointmentParts(row);
  const minDate = todayIsoInTimezone(bookingDisplayZone() ?? undefined);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const next = appointmentParts(row);
    setDate(next.date);
    setTime(next.time);
    setError("");
  }, [row.id, row.start]);

  async function saveEdit() {
    setSaving(true);
    setError("");
    const problem = await rescheduleAppointment(row, date, time);
    if (problem) {
      setError(problem);
      setSaving(false);
      return;
    }
    toast.success("Appointment updated");
    onSaved();
  }

  const email = row.topic.includes("@") ? row.topic : "";
  const eventName = row.eventTypeName || row.type;
  const durationLabel = formatDurationPhrase(row);
  const whenLabel = formatSummaryWhen(row);
  const timeLabel = durationLabel
    ? `${formatTimeRange(row)} (${durationLabel})`
    : formatTimeRange(row);

  if (!editing) {
    return (
      <AppointmentSummary
        row={row}
        email={email}
        eventName={eventName}
        whenLabel={whenLabel}
        timeLabel={timeLabel}
        onClose={onClose}
        onEdit={onEditMeeting}
        onReschedule={onReschedule}
        onStage={onStage}
        onDelete={onDelete}
      />
    );
  }

  return (
    <WorkspacePortal>
      <div
        className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-[1px]"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-labelledby="appointment-detail-title"
          className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3
              id="appointment-detail-title"
              className="text-[15px] font-bold text-slate-900"
            >
              {editing ? "Edit appointment" : "Appointment detail"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4 overflow-auto px-5 py-5">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold",
                  row.avatarClass,
                )}
              >
                {appointmentInitials(row.guestName)}
              </span>
              <div>
                <p className="text-[16px] font-bold text-slate-900">
                  {row.guestName}
                </p>
                <p className="text-[13px] text-slate-500">{row.topic}</p>
              </div>
            </div>
            {editing ? (
              <div className="space-y-3">
                <label className="block text-[13px] font-medium text-slate-600">
                  Date
                  <div className="mt-1">
                    <AppointmentDateField
                      value={date}
                      min={minDate}
                      onChange={setDate}
                    />
                  </div>
                </label>
                <label className="block text-[13px] font-medium text-slate-600">
                  Time
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                {error ? (
                  <p className="text-[12px] font-medium text-rose-600">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : (
              <dl className="space-y-3 text-[13px]">
                <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
                  <dt className="text-slate-400">Related to</dt>
                  <dd className="min-w-0 text-right font-semibold text-slate-800">
                    <RelatedRecordLink
                      kind={row.relatedKind}
                      id={row.relatedId}
                    />
                  </dd>
                </div>
                <Row
                  label="Consultant"
                  value={
                    consultant?.name ||
                    row.consultantName ||
                    appointmentConsultantName(row.consultantId)
                  }
                />
                <Row label="Role" value={consultant?.role ?? ""} />
                <Row
                  label="Time & Date"
                  value={`${formatApptTime(row.start)} · ${formatApptDate(row.start)}`}
                />
                <Row label="Status" value={row.status} />
                <Row label="Channel" value={row.channel} />
              </dl>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveEdit()}
                  className={cn(
                    FINANCE_PRIMARY_BUTTON_SM,
                    "h-9 px-4 text-[13px]",
                  )}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onEdit}
                className={cn(
                  FINANCE_PRIMARY_BUTTON_SM,
                  "h-9 px-4 text-[13px]",
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </WorkspacePortal>
  );
}

/** The appointment's length in minutes, 30 when it has no end. */
function appointmentMinutes(row: DashboardAppointment) {
  const start = parseAppointmentStart(row.start);
  const end = row.end ? parseAppointmentStart(row.end) : null;
  if (!end || Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) {
    return 30;
  }
  return Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000));
}

/**
 * Moves the appointment to date + time (on the host's clock), keeping its
 * length. Resolves to an error message, or null once saved.
 */
async function rescheduleAppointment(
  row: DashboardAppointment,
  date: string,
  time: string,
): Promise<string | null> {
  if (!date || !time) return "Date & time is required";
  const minDate = todayIsoInTimezone(bookingDisplayZone() ?? undefined);
  const start = new Date(`${date}T${time}`);
  if (
    date < minDate ||
    Number.isNaN(start.getTime()) ||
    start.getTime() < bookingNow().getTime()
  ) {
    return "Choose today or a future date and time.";
  }
  const minutes = appointmentMinutes(row);
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  try {
    const when = {
      // Typed on the host's clock; sent as the real instant.
      startDateTime: instantFromBookingWallClock(start).toISOString(),
      endDateTime: instantFromBookingWallClock(end).toISOString(),
    };
    if (row.recordKind === "meeting" || row.status === "Cancelled") {
      const meetingId = row.meetingId || row.id;
      const meeting = await tryCrmMeeting(() =>
        updateCrmMeeting(meetingId, when),
      );
      if (row.status === "Cancelled") {
        await fetch("/api/appointment/manage/reopen", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId,
            guestName: row.guestName,
            title: row.eventTypeName || row.topic,
            dateIso: date,
            startHHmm: time,
            durationMinutes: minutes,
          }),
        }).catch(() => undefined);
      } else if (!meeting) {
        return "Could not save this appointment.";
      }
    } else {
      const fresh = await readRescheduledBooking(row.id, when.startDateTime);
      if (!fresh) return "Could not save this appointment.";
      if (fresh.meetingId) {
        await tryCrmMeeting(() => updateCrmMeeting(fresh.meetingId!, when));
      }
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Could not save";
  }
}

const RESCHEDULE_SLOTS = Array.from({ length: 96 }, (_, i) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`;
});

function slotLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

function RescheduleDialog({
  row,
  onClose,
  onSaved,
}: {
  row: DashboardAppointment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const minDate = todayIsoInTimezone(bookingDisplayZone() ?? undefined);
  const initial = appointmentParts(row);
  const [date, setDate] = useState(
    initial.date < minDate ? minDate : initial.date,
  );
  const [time, setTime] = useState(initial.time);
  const [month, setMonth] = useState(() => {
    const [y, m] = (initial.date < minDate ? minDate : initial.date)
      .split("-")
      .map(Number);
    return new Date(y, m - 1, 1);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const slotsRef = useRef<HTMLDivElement>(null);
  const minutes = appointmentMinutes(row);
  const now = bookingNow();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Open the slot list at the chosen time rather than midnight.
  useEffect(() => {
    const list = slotsRef.current;
    const chosen = list?.querySelector<HTMLElement>("[data-chosen='true']");
    if (list && chosen) {
      list.scrollTop =
        chosen.offsetTop - list.clientHeight / 2 + chosen.clientHeight / 2;
    }
  }, []);

  function slotPast(slot: string) {
    return new Date(`${date}T${slot}`).getTime() < now.getTime();
  }

  async function save() {
    setSaving(true);
    setError("");
    const problem = await rescheduleAppointment(row, date, time);
    if (problem) {
      setError(problem);
      setSaving(false);
      return;
    }
    toast.success("Appointment rescheduled");
    onSaved();
  }

  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDow = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      dateKeyFromDate(new Date(year, mo, i + 1)),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const canGoBack = dateKeyFromDate(new Date(year, mo, 0)) >= minDate;
  const endClock = (() => {
    const start = new Date(`${date}T${time}`);
    if (Number.isNaN(start.getTime())) return "";
    const end = new Date(start.getTime() + minutes * 60000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return slotLabel(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
  })();
  const chosenLabel = new Date(`${date}T00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <WorkspacePortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[1px]"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-title"
          className="flex max-h-full w-full max-w-[520px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <h3
                id="reschedule-title"
                className="text-[15px] font-bold text-slate-900"
              >
                Reschedule
              </h3>
              <p className="mt-0.5 truncate text-[12px] text-slate-500">
                {row.eventTypeName || row.topic} with {row.guestName} ·
                currently {formatSummaryWhen(row)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4 sm:flex-row">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-900">
                  {month.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!canGoBack}
                    onClick={() => setMonth(new Date(year, mo - 1, 1))}
                    aria-label="Previous month"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonth(new Date(year, mo + 1, 1))}
                    aria-label="Next month"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span
                    key={d}
                    className="py-1 text-[10px] font-semibold text-slate-400 uppercase"
                  >
                    {d}
                  </span>
                ))}
                {cells.map((iso, index) =>
                  iso ? (
                    <button
                      key={iso}
                      type="button"
                      disabled={iso < minDate}
                      onClick={() => {
                        setDate(iso);
                        setError("");
                      }}
                      aria-pressed={iso === date}
                      className={cn(
                        "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12px] tabular-nums",
                        iso === date
                          ? "bg-[var(--brand-primary)] font-semibold text-white"
                          : iso === minDate
                            ? "font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)]"
                            : "text-slate-700 hover:bg-slate-100",
                        "disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
                      )}
                    >
                      {Number(iso.slice(8))}
                    </button>
                  ) : (
                    <span key={`blank-${index}`} />
                  ),
                )}
              </div>
            </div>

            <div className="flex w-full flex-col sm:w-[150px]">
              <p className="mb-2 flex h-7 items-center text-[13px] font-bold text-slate-900">
                <Clock className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                Time
              </p>
              <div
                ref={slotsRef}
                className="relative max-h-[248px] min-h-[160px] space-y-1 overflow-y-auto pr-1"
              >
                {RESCHEDULE_SLOTS.map((slot) => {
                  const past = slotPast(slot);
                  const chosen = slot === time;
                  return (
                    <button
                      key={slot}
                      type="button"
                      data-chosen={chosen}
                      disabled={past}
                      onClick={() => {
                        setTime(slot);
                        setError("");
                      }}
                      className={cn(
                        "flex h-8 w-full items-center justify-center rounded-md border text-[12px] font-medium tabular-nums",
                        chosen
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                          : "border-[#E5E7EB] text-slate-700 hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary-soft)]",
                        "disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent",
                      )}
                    >
                      {slotLabel(slot)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[12px] text-slate-500">
                New time:{" "}
                <span className="font-semibold text-slate-800">
                  {chosenLabel} · {slotLabel(time)}
                  {endClock ? ` – ${endClock}` : ""}
                </span>
              </p>
              {error ? (
                <p className="mt-0.5 text-[12px] font-medium text-rose-600">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className={cn(
                  FINANCE_PRIMARY_BUTTON_SM,
                  "h-9 px-4 text-[13px]",
                )}
              >
                {saving ? "Saving…" : "Reschedule"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </WorkspacePortal>
  );
}

function formatSummaryWhen(row: DashboardAppointment) {
  const start = parseAppointmentStart(row.start);
  if (Number.isNaN(start.getTime())) return formatTimeRange(row);
  const weekday = start.toLocaleDateString("en-GB", { weekday: "long" });
  const month = start.toLocaleDateString("en-GB", { month: "long" });
  const day = String(start.getDate()).padStart(2, "0");
  return `${weekday}, ${day} ${month}, ${formatTimeRange(row)}`;
}

function formatDurationPhrase(row: DashboardAppointment) {
  const start = parseAppointmentStart(row.start);
  const end = row.end ? parseAppointmentStart(row.end) : null;
  if (!end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return "";
  const mins = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );
  if (!mins) return "";
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  const parts = [];
  if (hours) parts.push(`${hours} hr`);
  if (rest) parts.push(`${rest} mins`);
  return parts.join(" ");
}

function AppointmentSummary({
  row,
  email,
  eventName,
  whenLabel,
  timeLabel,
  onClose,
  onEdit,
  onReschedule,
  onStage,
  onDelete,
}: {
  row: DashboardAppointment;
  email: string;
  eventName: string;
  whenLabel: string;
  timeLabel: string;
  onClose: () => void;
  onEdit: () => void;
  onReschedule: () => void;
  onStage: (stage: SettableStage) => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<"appointment" | "customer" | "audit">(
    "appointment",
  );
  const tabs = [
    { id: "appointment" as const, label: "Appointment Info" },
    { id: "customer" as const, label: "Client Info" },
    { id: "audit" as const, label: "Audit Info" },
  ];

  return (
    <WorkspacePortal>
      <div
        className="fixed inset-0 z-[80] flex justify-end bg-slate-900/35"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-labelledby="appointment-summary-title"
          className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.12)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h3
              id="appointment-summary-title"
              className="text-[15px] font-semibold text-slate-800"
            >
              Appointment Summary
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
            <div className="rounded-lg border border-[#E7E9F2] bg-[#F8F7FC] px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[15px] font-semibold leading-snug text-slate-900">
                  {whenLabel}
                </p>
                <BookingStatusMenu
                  row={row}
                  onEdit={onEdit}
                  onReschedule={onReschedule}
                  onStage={onStage}
                  onDelete={onDelete}
                />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-slate-500">
                <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">
                  {row.guestName}
                  {email ? `, ${email}` : ""}
                </span>
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-[#E6E8F0]">
              <div className="flex gap-1 border-b border-[#E6E8F0] px-3">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn(
                      "-mb-px border-b-2 px-2.5 py-3 text-[13px] font-medium",
                      tab === item.id
                        ? "border-[var(--brand-primary-strong)] text-[var(--brand-primary-strong)]"
                        : "border-transparent text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === "appointment" ? (
                <div>
                  <SummaryRow label="Consultation">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#7C6BF2] text-[9px] font-bold text-white">
                        {eventTypeInitials(eventName)}
                      </span>
                      <span className="truncate">{eventName}</span>
                    </span>
                  </SummaryRow>
                  <SummaryRow label="Consultant">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{consultantLabel(row)}</span>
                    </span>
                  </SummaryRow>
                  <SummaryRow label="Time & Date">
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        {timeLabel} · {formatApptDate(row.start)}
                      </span>
                    </span>
                  </SummaryRow>
                  <SummaryRow label="Booked IP Address">—</SummaryRow>
                  <SummaryRow label="Booked Source">In App</SummaryRow>
                </div>
              ) : null}

              {tab === "customer" ? (
                <CustomerInfoTab row={row} email={email} />
              ) : null}

              {tab === "audit" ? (
                <AuditInfoTab row={row} email={email} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </WorkspacePortal>
  );
}

function CustomerInfoTab({
  row,
  email,
}: {
  row: DashboardAppointment;
  email: string;
}) {
  const [section, setSection] = useState<"booking" | "questions" | "payment">(
    "booking",
  );
  const paid = row.paymentStatus === "Paid";
  const sections = [
    { id: "booking" as const, label: "Booking Info" },
    { id: "questions" as const, label: "Questions" },
    { id: "payment" as const, label: "Payment" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-[#F0F1F5] px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <User className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-slate-800">
              {row.guestName}
            </span>
            <span className="block truncate text-[12px] text-slate-400">
              {email || "—"}
            </span>
          </span>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-[13px] font-medium",
            paid
              ? "text-red-500"
              : row.paymentStatus === "Due"
                ? "text-amber-600"
                : "text-slate-400",
          )}
        >
          <CreditCard className="h-3.5 w-3.5" />
          {row.paymentStatus || "—"}
        </span>
      </div>
      <div className="flex gap-4 border-b border-[#F0F1F5] px-4">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={cn(
              "-mb-px border-b-2 py-3 text-[13px] font-medium",
              section === item.id
                ? "border-[var(--brand-primary-strong)] text-[var(--brand-primary-strong)]"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {section === "booking" ? (
        <div>
          <SummaryRow label="Booking ID">{row.bookingCode || "—"}</SummaryRow>
          <SummaryRow label="Booked On">
            {formatBookedOn(row.bookedOn)}
          </SummaryRow>
          <SummaryRow label="Contact Number">{row.phone || "—"}</SummaryRow>
          <SummaryRow label="Notes">
            <span className="whitespace-pre-line">{row.notes || "—"}</span>
          </SummaryRow>
        </div>
      ) : null}
      {section === "questions" ? (
        <p className="px-4 py-6 text-[13px] text-slate-400">No answers yet.</p>
      ) : null}
      {section === "payment" ? <PaymentBreakdown row={row} /> : null}
    </div>
  );
}

function PaymentBreakdown({ row }: { row: DashboardAppointment }) {
  const total = row.price && row.price > 0 ? row.price : 0;
  const paidAmount = row.paymentStatus === "Paid" ? total : 0;
  const outstanding = Math.max(0, total - paidAmount);
  const status = row.paymentStatus || (total > 0 ? "Due" : "Free");
  return (
    <div>
      <SummaryRow label="Status">
        <span
          className={status === "Paid" ? "font-medium text-red-500" : undefined}
        >
          {status}
        </span>
      </SummaryRow>
      <SummaryRow label="Total">
        {formatPaymentAmount(total, row.currency)}
      </SummaryRow>
      <SummaryRow label="Paid">
        {formatPaymentAmount(paidAmount, row.currency)}
      </SummaryRow>
      <SummaryRow label="To Be Paid">
        <span className="font-medium text-red-500">
          {formatPaymentAmount(outstanding, row.currency, outstanding === 0)}
        </span>
      </SummaryRow>
    </div>
  );
}

function formatPaymentAmount(
  amount: number,
  currency?: string,
  plainZero = false,
) {
  const known = ["NPR", "INR", "AUD", "USD", "GBP"];
  const code = (
    known.includes(currency || "") ? currency : "NPR"
  ) as BookingCurrency;
  const prefix = currencyPrefix(code);
  const value = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  if (plainZero || value === 0) return `${prefix} 0`;
  return `${prefix} ${value.toFixed(2)}`;
}

function AuditInfoTab({
  row,
  email,
}: {
  row: DashboardAppointment;
  email: string;
}) {
  const when = row.bookedOn ? parseAppointmentStart(row.bookedOn) : null;
  const valid = !!when && !Number.isNaN(when.getTime());
  const actor = row.createdBy || consultantLabel(row);
  const events = [
    ...(email
      ? [
          {
            id: "email" as const,
            text: "Email notification to Client sent for appointment",
          },
        ]
      : []),
    { id: "created" as const, text: "Appointment created by" },
  ];
  const timeLabel = valid ? formatAuditTime(when) : "";

  return (
    <div className="px-6 py-5">
      <div className="grid grid-cols-[92px_12px_minmax(0,1fr)] gap-x-3">
        <div className="pt-0.5 text-right text-[13px] font-semibold text-slate-900">
          {valid ? formatAuditDate(when) : "—"}
        </div>
        <div className="relative flex h-full justify-center">
          <span className="z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#6D5EF6]" />
          <span className="absolute top-4 bottom-0 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-[#D8DCE6]" />
        </div>
        <div className="pt-0.5">
          {valid ? (
            <span className="inline-flex rounded-md bg-[var(--brand-primary-faint)] px-2 py-0.5 text-[11px] font-medium tracking-wide text-[#7C6BF2]">
              {AUDIT_WEEKDAYS[when.getDay()]}
            </span>
          ) : null}
        </div>

        {events.map((event, index) => (
          <div key={event.id} className="contents">
            <div className="pt-5 text-right text-[12px] leading-7 text-slate-400">
              {timeLabel}
            </div>
            <div className="relative">
              <span
                className={cn(
                  "absolute top-0 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-[#D8DCE6]",
                  index === events.length - 1 ? "h-5" : "bottom-0",
                )}
              />
            </div>
            <div className="flex min-w-0 items-center gap-2.5 pt-5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#E6E8EE] bg-white text-slate-400">
                {event.id === "email" ? (
                  <Mail className="h-3.5 w-3.5" />
                ) : (
                  <IdCard className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="text-[13px] text-slate-700">{event.text}</span>
              {event.id === "created" && actor && actor !== "—" ? (
                <span className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full bg-[#F3F4F6] py-0.5 pr-2.5 pl-0.5 text-[12px] text-slate-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-400">
                    <User className="h-3 w-3" />
                  </span>
                  <span className="truncate">{actor}</span>
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const AUDIT_MONTHS = [
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
];
const AUDIT_WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function formatBookedOn(value?: string) {
  if (!value) return "—";
  const date = parseAppointmentStart(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  const time = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" AM", " am")
    .replace(" PM", " pm");
  return `${day} ${month} ${date.getFullYear()} ${time}`;
}

function formatAuditDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}-${AUDIT_MONTHS[date.getMonth()]}-${date.getFullYear()}`;
}

function formatAuditTime(date: Date) {
  return date
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" AM", " am")
    .replace(" PM", " pm")
    .toLowerCase();
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[168px_minmax(0,1fr)] items-center gap-3 border-b border-[#F0F1F5] px-4 py-3.5 last:border-0">
      <dt className="text-[13px] text-slate-400">{label}</dt>
      <dd className="min-w-0 text-[13px] text-slate-700">{children}</dd>
    </div>
  );
}

/**
 * Links to the appointment's related record in a new tab, labelled with its
 * name rather than its id. Until the name loads, or if it can't be read, the
 * link says "View lead" (or contact, deal, company) so it still works.
 */
function RelatedRecordLink({ kind, id }: { kind: RelatedKind; id: string }) {
  const linkable = !!id && id !== "—";
  const name = useCrmRecordName(linkable ? kind : undefined, id);

  if (!linkable) return <span>—</span>;
  return (
    <a
      href={crmRecordHref(kind, id)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 text-[var(--brand-primary)] hover:underline"
      title={`Open this ${kind.toLowerCase()} in a new tab`}
    >
      <span className="truncate">
        {kind} · {name || `View ${kind.toLowerCase()}`}
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
    </a>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function PagesPanel({
  title,
  hideTitle = false,
  pages,
  loading,
  onOpenPage,
}: {
  title: string;
  hideTitle?: boolean;
  pages: BookingPage[];
  loading?: boolean;
  onOpenPage: (id: string) => void;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {hideTitle ? null : (
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        </div>
      )}
      <ResizableColumns
        storageKey="bookings-pages-list"
        className="min-w-0 overflow-x-auto"
      >
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              <th className="px-5 py-3">Page</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Duration</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr
                key={p.id}
                onClick={() => onOpenPage(p.id)}
                className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-[var(--brand-primary-soft)]"
              >
                <td className="px-5 py-3">
                  <p className="font-semibold text-slate-900">{p.title}</p>
                  <a
                    href={publicBookUrl(p.slug)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] hover:underline"
                    style={{ color: BRAND }}
                  >
                    /book/{p.slug}
                  </a>
                </td>
                <td className="px-3 py-3 text-slate-600">{p.eventType}</td>
                <td className="px-3 py-3 text-slate-600">{p.owner}</td>
                <td className="px-3 py-3 text-slate-600">
                  {p.durationMinutes} min
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      p.status === "Live"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {pages.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-slate-400"
                >
                  {loading
                    ? "Loading consultation pages…"
                    : "No consultation pages yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </ResizableColumns>
    </section>
  );
}

type ConsultantMeetings = {
  completed: DashboardAppointment[];
  upcoming: DashboardAppointment[];
};

/**
 * Splits a consultant's appointments at "now": a meeting that has ended is
 * completed; one still to start or under way is upcoming. Appointments are
 * matched by consultant id, or by name for CRM meetings that carry only the
 * host's name.
 */
function meetingsByConsultant(
  consultants: DashboardConsultant[],
  appointments: DashboardAppointment[],
  now = bookingNow().getTime(),
): Map<string, ConsultantMeetings> {
  const byId = new Map<string, ConsultantMeetings>();
  const byName = new Map<string, ConsultantMeetings>();
  for (const c of consultants) {
    const bucket: ConsultantMeetings = { completed: [], upcoming: [] };
    byId.set(c.id, bucket);
    byName.set(c.name.trim().toLowerCase(), bucket);
  }
  for (const row of appointments) {
    const bucket =
      byId.get(row.consultantId) ??
      byName.get((row.consultantName ?? "").trim().toLowerCase());
    if (!bucket) continue;
    const start = parseAppointmentStart(row.start).getTime();
    const end = row.end ? parseAppointmentStart(row.end).getTime() : start;
    if (Number.isNaN(start)) continue;
    (Math.max(start, end || start) < now
      ? bucket.completed
      : bucket.upcoming
    ).push(row);
  }
  for (const bucket of byId.values()) {
    const at = (row: DashboardAppointment) =>
      parseAppointmentStart(row.start).getTime();
    bucket.upcoming.sort((a, b) => at(a) - at(b));
    bucket.completed.sort((a, b) => at(b) - at(a));
  }
  return byId;
}

function ConsultantsPanel({
  consultants,
  appointments,
  loading,
  error,
}: {
  consultants: DashboardConsultant[];
  appointments: DashboardAppointment[];
  loading: boolean;
  error: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const meetings = useMemo(
    () => meetingsByConsultant(consultants, appointments),
    [consultants, appointments],
  );

  if (error) {
    return <p className="text-[13px] text-rose-600">{error}</p>;
  }

  if (consultants.length === 0) {
    return (
      <p className="text-[13px] text-slate-500">
        {loading ? "Loading consultants…" : "No consultants yet."}
      </p>
    );
  }

  const open = consultants.find((c) => c.id === openId) ?? null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {consultants.map((c) => {
          const counts = meetings.get(c.id) ?? { completed: [], upcoming: [] };
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenId(c.id)}
              aria-label={`${c.name}: ${counts.completed.length} completed and ${counts.upcoming.length} upcoming meetings`}
              className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[var(--brand-primary)]/30 hover:bg-[#FBF9FE] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25 focus-visible:outline-none"
            >
              <div className="flex items-center gap-3">
                <ConsultantFace
                  name={c.name}
                  photo={c.photo}
                  className="h-12 w-12 shrink-0 text-[13px]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {c.name}
                  </p>
                  <p className="truncate text-[12px] text-slate-500">
                    {c.role}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold">
                    <span className="text-emerald-600">
                      {counts.completed.length} completed
                    </span>
                    <span className="text-[var(--brand-primary,var(--brand-primary))]">
                      {counts.upcoming.length} upcoming
                    </span>
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {open ? (
        <ConsultantMeetingsModal
          consultant={open}
          meetings={meetings.get(open.id) ?? { completed: [], upcoming: [] }}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </>
  );
}

function ConsultantMeetingsModal({
  consultant,
  meetings,
  onClose,
}: {
  consultant: DashboardConsultant;
  meetings: ConsultantMeetings;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <WorkspacePortal>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-[1px] sm:items-center sm:p-6"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="consultant-meetings-title"
          className="flex max-h-[min(90dvh,760px)] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-[#E5E7EB] px-5 py-4">
            <ConsultantFace
              name={consultant.name}
              photo={consultant.photo}
              className="h-10 w-10 shrink-0 text-[12px]"
            />
            <div className="min-w-0 flex-1">
              <h2
                id="consultant-meetings-title"
                className="truncate text-[16px] font-bold text-slate-900"
              >
                {consultant.name}
              </h2>
              <p className="text-[12px] font-semibold">
                <span className="text-emerald-600">
                  {meetings.completed.length} completed
                </span>
                <span className="text-slate-300"> · </span>
                <span className="text-[var(--brand-primary,var(--brand-primary))]">
                  {meetings.upcoming.length} upcoming
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-4">
            <MeetingList
              title="Upcoming"
              tone="text-[var(--brand-primary,var(--brand-primary))]"
              rows={meetings.upcoming}
              empty="No upcoming meetings."
            />
            <MeetingList
              title="Completed"
              tone="text-emerald-600"
              rows={meetings.completed}
              empty="No completed meetings yet."
            />
          </div>
        </div>
      </div>
    </WorkspacePortal>
  );
}

function MeetingList({
  title,
  tone,
  rows,
  empty,
}: {
  title: string;
  tone: string;
  rows: DashboardAppointment[];
  empty: string;
}) {
  return (
    <section>
      <h3
        className={cn(
          "mb-2 text-[12px] font-bold tracking-wide uppercase",
          tone,
        )}
      >
        {title} <span className="text-slate-400">({rows.length})</span>
      </h3>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-[12px] text-slate-500">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2.5"
            >
              <div className="w-[118px] shrink-0">
                <p className="text-[12px] font-semibold text-slate-800">
                  {formatGroupDate(row.start)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatTimeRange(row)}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-900">
                  {row.guestName || "Guest"}
                </p>
                <p className="truncate text-[12px] text-slate-500">
                  {row.eventTypeName || row.topic}
                </p>
              </div>
              {row.relatedId ? (
                <div className="shrink-0 text-[12px]">
                  <RelatedRecordLink
                    kind={row.relatedKind}
                    id={row.relatedId}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
