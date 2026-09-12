"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  MoreVertical,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizableColumns } from "@/components/common/ResizableColumns";
import { initials } from "@/lib/activities/shared";
import {
  publicBookUrl,
  type BookingPage,
} from "@/lib/booking/types";
import {
  getCalendlySummary,
  listCalendlyAvailabilitySchedules,
  listCalendlyHosts,
  markCalendlyNoShow,
  removeCalendlyNoShow,
  updateCalendlyHost,
  type CalendlySummary,
} from "@/lib/booking/calendly-api";
import { isUuid } from "@/lib/activity-timeline/auth";
import { ConsultationsBoard } from "@/components/booking/ConsultationsBoard";
import { NewBookingModal } from "@/components/booking/NewBookingModal";
import { CalendlyConnectionCard } from "@/components/booking/CalendlyConnectionCard";
import {
  appointmentDateKey,
  appointmentMatchesKpi,
  bookingKpiStats,
  consultantById,
  dateKeyFromDate,
  formatApptDate,
  formatApptTime,
  type AppointmentChannel,
  type AppointmentStatus,
  type BookingKpiKey,
  type DashboardAppointment,
  type DashboardConsultant,
  type RelatedKind,
} from "@/lib/booking/dashboard";
import { useCrmBooking } from "@/lib/booking/use-crm-booking";

export type BookingSection =
  | "home"
  | "consultations"
  | "schedules"
  | "consultants";

const BRAND = "#5A32A3";

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
      <img src={photo} alt="" className={cn("rounded-full object-cover", className)} />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[#F3ECFB] font-bold text-[#5A32A3]",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  Confirmed: "bg-[#D1FAE5] text-[#059669]",
  Pending: "bg-[#FEF3C7] text-[#D97706]",
  Scheduled: "bg-[#DBEAFE] text-[#2563EB]",
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
    iconBg: "bg-[#F3ECFB] text-[#5A32A3]",
    bar: "bg-[#5A32A3]",
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
    iconBg: "bg-[#E0E7FF] text-[#4F46E5]",
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

  useEffect(() => {
    if (searchParams.get("book") === "1") setBookOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("calendly") !== "connected") return;
    void import("@/lib/booking/calendly-integration-api").then((api) =>
      api.syncCalendlyCatalog().catch(() => undefined),
    );
  }, [searchParams]);

  function closeBook() {
    setBookOpen(false);
    if (searchParams.get("book") === "1") router.replace("/booking");
  }

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col bg-[#F8F9FB]">
      <div className="flex min-h-full min-w-0 flex-1 flex-col">
        <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-1 flex-col px-3 pt-4 pb-8 sm:px-5 sm:pt-5 sm:pb-10 lg:px-7">
          {section === "home" ? (
            <HomeView
              appointments={crm.appointments}
              consultants={crm.consultants}
              loading={crm.loading}
              error={crm.error}
              onNewBooking={() => setBookOpen(true)}
              onViewConsultants={() => router.push("/booking/consultants")}
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
              pages={crm.pages}
              loading={crm.loading}
              onOpenPage={(id) => router.push(`/booking/${id}`)}
            />
          ) : null}
          {section === "consultants" ? <ConsultantsPanel /> : null}
        </div>
      </div>
      <NewBookingModal
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
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#5A32A3] px-3 text-[12px] font-semibold text-white hover:opacity-90"
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
}: {
  appointments: DashboardAppointment[];
  consultants: DashboardConsultant[];
  loading: boolean;
  error: string | null;
  onNewBooking: () => void;
  onViewConsultants: () => void;
}) {
  const now = useMemo(() => new Date(), [appointments]);
  const [consultantFilter, setConsultantFilter] = useState("all");
  const [kpiFilter, setKpiFilter] = useState<BookingKpiKey | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => dateKeyFromDate(new Date()));
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<DashboardAppointment | null>(null);
  const [calendlySummary, setCalendlySummary] = useState<CalendlySummary | null>(
    null,
  );
  const pageSize = 6;

  useEffect(() => {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    let alive = true;
    void getCalendlySummary({
      from: from.toISOString(),
      to: to.toISOString(),
    })
      .then((summary) => {
        if (alive) setCalendlySummary(summary);
      })
      .catch(() => {
        if (alive) setCalendlySummary(null);
      });
    return () => {
      alive = false;
    };
  }, [now]);

  const kpi = useMemo(
    () => bookingKpiStats(appointments, now),
    [appointments, now],
  );

  const rows = useMemo(() => {
    let data = [...appointments];
    if (consultantFilter !== "all") {
      data = data.filter((a) => a.consultantId === consultantFilter);
    }
    const today = dateKeyFromDate(now);
    data.sort((a, b) => {
      if (kpiFilter) {
        const am = appointmentMatchesKpi(a, kpiFilter, now) ? 0 : 1;
        const bm = appointmentMatchesKpi(b, kpiFilter, now) ? 0 : 1;
        if (am !== bm) return am - bm;
      } else {
        const aUpcoming = a.start.slice(0, 10) >= today ? 0 : 1;
        const bUpcoming = b.start.slice(0, 10) >= today ? 0 : 1;
        if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
      }
      return a.start.localeCompare(b.start);
    });
    return data;
  }, [appointments, consultantFilter, kpiFilter, now]);

  const pageRows = kpiFilter
    ? rows
    : rows.slice((page - 1) * pageSize, page * pageSize);
  const shownFrom = kpiFilter ? (rows.length ? 1 : 0) : (page - 1) * pageSize + 1;
  const shownTo = kpiFilter ? rows.length : Math.min(page * pageSize, rows.length);
  const busyDays = useMemo(
    () => new Set(appointments.map((a) => appointmentDateKey(a.start))),
    [appointments],
  );
  const todayKey = dateKeyFromDate(now);

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex shrink-0 flex-col gap-3">
        <div className="flex justify-end">
          <NewBookingButton onClick={onNewBooking} />
        </div>
        <CalendlyConnectionCard />
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
                  ? "border-[#5A32A3] ring-2 ring-[#5A32A3]/20"
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
      {calendlySummary ? (
        <p className="mb-3 text-[12px] text-slate-500">
          Calendly this month: {calendlySummary.booked} booked ·{" "}
          {calendlySummary.cancelled} cancelled · {calendlySummary.noShows}{" "}
          no-shows · {calendlySummary.completed} completed
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-[#E5E7EB] px-3 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
              <CalendarDays className="h-4 w-4 shrink-0" style={{ color: BRAND }} />
              {kpiFilter ? KPI_TITLES[kpiFilter] : "Upcoming Appointments"}
            </h2>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Date Range
              </button>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] text-slate-500 hover:bg-slate-50"
                aria-label="Filter"
              >
                <Filter className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {error ? (
            <p className="px-5 py-2 text-[12px] text-rose-600">{error}</p>
          ) : null}
          <div className="min-w-0">
          <div className="divide-y divide-[#F3F4F6] lg:hidden">
            {loading && pageRows.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-slate-400">
                Loading appointments…
              </p>
            ) : null}
            {!loading && pageRows.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-slate-400">
                No appointments from CRM meetings yet.
              </p>
            ) : null}
            {pageRows.map((row) => (
              <AppointmentCard
                key={row.id}
                row={row}
                dimmed={
                  !!kpiFilter && !appointmentMatchesKpi(row, kpiFilter, now)
                }
                onView={() => setDetail(row)}
              />
            ))}
          </div>

          <div className="hidden min-w-0 overflow-x-auto lg:block">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-3">Appointment</th>
                  <th className="px-3 py-3">Related To</th>
                  <th className="px-3 py-3">Consultant</th>
                  <th className="px-3 py-3 whitespace-nowrap">Date & Time</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-slate-400">
                      Loading appointments…
                    </td>
                  </tr>
                ) : null}
                {!loading && pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-slate-400">
                      No appointments from CRM meetings yet.
                    </td>
                  </tr>
                ) : null}
                {pageRows.map((row) => (
                  <AppointmentRow
                    key={row.id}
                    row={row}
                    dimmed={
                      !!kpiFilter && !appointmentMatchesKpi(row, kpiFilter, now)
                    }
                    onView={() => setDetail(row)}
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
                disabled={kpiFilter != null || page === 1}
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
                disabled={kpiFilter != null || page * pageSize >= rows.length}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <select
                defaultValue="10"
                className="ml-2 h-8 rounded-lg border border-[#E5E7EB] bg-white px-2 text-[11px] font-medium text-slate-600"
              >
                <option>10 / page</option>
              </select>
            </div>
          </div>
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
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
                  {loading
                    ? "Loading hosts…"
                    : "No Calendly hosts yet. Connect Calendly in CRM, then refresh."}
                </p>
              ) : null}
              {consultants.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <ConsultantFace name={c.name} photo={c.photo} className="h-9 w-9 text-[11px]" />
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
            busyDays={busyDays}
            onPrev={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
            onNext={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
            onSelect={setSelectedDate}
          />
        </div>
      </div>

      {detail ? (
        <AppointmentDrawer
          row={detail}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </div>
  );
}

function AppointmentCard({
  row,
  dimmed = false,
  onView,
}: {
  row: DashboardAppointment;
  dimmed?: boolean;
  onView: () => void;
}) {
  const consultant = consultantById(row.consultantId);
  const RelatedIcon = RELATED_ICON[row.relatedKind];
  const ChannelIcon = CHANNEL_ICON[row.channel];

  return (
    <article
      className={cn(
        "px-3 py-3.5 sm:px-4",
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
          {initials(row.guestName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {row.guestName}
              </p>
              <p className="truncate text-[11px] text-slate-500">{row.topic}</p>
            </div>
            <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-[#E5E7EB]">
              <button
                type="button"
                onClick={onView}
                className="flex h-8 w-8 items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                aria-label="View"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center border-l border-[#E5E7EB] text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                aria-label="More"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-[12px] text-slate-600 min-[480px]:grid-cols-2">
            <p className="flex items-center gap-1.5">
              <RelatedIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">
                {row.relatedKind}{" "}
                <span className="text-slate-400">{row.relatedId}</span>
              </span>
            </p>
            {consultant ? (
              <p className="flex items-center gap-1.5">
                <ConsultantFace
                  name={consultant.name}
                  photo={consultant.photo}
                  className="h-4 w-4 text-[8px]"
                />
                <span className="truncate">{consultant.name}</span>
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
}: {
  row: DashboardAppointment;
  dimmed?: boolean;
  onView: () => void;
}) {
  const consultant = consultantById(row.consultantId);
  const RelatedIcon = RELATED_ICON[row.relatedKind];
  const ChannelIcon = CHANNEL_ICON[row.channel];

  return (
    <tr
      className={cn(
        "border-b border-[#F3F4F6] last:border-0 hover:bg-slate-50/80",
        dimmed && "pointer-events-none opacity-40 blur-[2px]",
      )}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              row.avatarClass,
            )}
          >
            {initials(row.guestName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-900">
              {row.guestName}
            </p>
            <p className="truncate text-[11px] text-slate-500">{row.topic}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3.5">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-600">
          <RelatedIcon className="h-3.5 w-3.5 text-slate-400" />
          <span>
            {row.relatedKind}{" "}
            <span className="text-slate-400">{row.relatedId}</span>
          </span>
        </div>
      </td>
      <td className="px-3 py-3.5">
        {consultant ? (
          <div className="flex items-center gap-2">
            <ConsultantFace
              name={consultant.name}
              photo={consultant.photo}
              className="h-7 w-7 text-[10px]"
            />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-slate-800">
                {consultant.name}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {consultant.role}
              </p>
            </div>
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3.5 whitespace-nowrap">
        <div className="grid w-[7.5rem] grid-cols-[14px_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="text-[12px] font-medium tabular-nums text-slate-700">
            {formatApptDate(row.start)}
          </span>
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="text-[11px] tabular-nums text-slate-500">
            {formatApptTime(row.start)}
          </span>
        </div>
      </td>
      <td className="px-3 py-3.5">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            STATUS_STYLE[row.status],
          )}
        >
          {row.status}
        </span>
      </td>
      <td className="px-3 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
          <ChannelIcon className="h-3.5 w-3.5 text-slate-400" />
          {row.channel}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="inline-flex items-center justify-end overflow-hidden rounded-lg border border-[#E5E7EB]">
          <button
            type="button"
            onClick={onView}
            className="flex h-8 w-8 items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center border-l border-[#E5E7EB] text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="More"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function MiniCalendar({
  month,
  selected,
  today,
  busyDays,
  onPrev,
  onNext,
  onSelect,
}: {
  month: Date;
  selected: string;
  today: string;
  busyDays: Set<string>;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (iso: string) => void;
}) {
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
    <section className="flex min-h-[280px] flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
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
      <div className="grid auto-rows-fr grid-cols-7 text-center">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="min-h-9" />;
          const iso = `${year}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = iso === selected;
          const isToday = iso === today;
          const busy = busyDays.has(iso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className="relative flex h-full min-h-9 items-center justify-center"
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium",
                  isSelected
                    ? "text-white"
                    : isToday
                      ? "font-bold text-[#5A32A3] ring-2 ring-[#5A32A3]/40"
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
    </section>
  );
}

function AppointmentDrawer({
  row,
  onClose,
}: {
  row: DashboardAppointment;
  onClose: () => void;
}) {
  const consultant = consultantById(row.consultantId);
  return (
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
            Appointment detail
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
              {initials(row.guestName)}
            </span>
            <div>
              <p className="text-[16px] font-bold text-slate-900">
                {row.guestName}
              </p>
              <p className="text-[13px] text-slate-500">{row.topic}</p>
            </div>
          </div>
          <dl className="space-y-3 text-[13px]">
            <Row label="Related to" value={`${row.relatedKind} · ${row.relatedId}`} />
            <Row label="Consultant" value={consultant?.name ?? ""} />
            <Row label="Role" value={consultant?.role ?? ""} />
            <Row label="Date" value={formatApptDate(row.start)} />
            <Row label="Time" value={formatApptTime(row.start)} />
            <Row label="Status" value={row.status} />
            <Row label="Channel" value={row.channel} />
          </dl>
          {row.calendlyInviteeId && isUuid(row.calendlyInviteeId) ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void markCalendlyNoShow(row.calendlyInviteeId!).catch(
                    () => undefined,
                  );
                }}
                className="h-9 rounded-lg bg-rose-600 px-3 text-[12px] font-semibold text-white"
              >
                Mark no-show
              </button>
              <button
                type="button"
                onClick={() => {
                  void removeCalendlyNoShow(row.calendlyInviteeId!).catch(
                    () => undefined,
                  );
                }}
                className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-700"
              >
                Clear no-show
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
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
  pages,
  loading,
  onOpenPage,
}: {
  title: string;
  pages: BookingPage[];
  loading?: boolean;
  onOpenPage: (id: string) => void;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
      </div>
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
              className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-[#F3ECFB]"
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
              <td className="px-3 py-3 text-slate-600">{p.durationMinutes} min</td>
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
              <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                {loading
                  ? "Loading Calendly event types…"
                  : "No Calendly event types yet."}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </ResizableColumns>
    </section>
  );
}

function ConsultantsPanel() {
  const [hosts, setHosts] = useState<
    import("@/lib/booking/calendly-api").CalendlyHost[]
  >([]);
  const [schedules, setSchedules] = useState<
    Record<string, import("@/lib/booking/calendly-api").CalendlySchedule[]>
  >({});
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void listCalendlyHosts()
      .then((rows) => {
        if (!alive) return;
        setHosts(rows);
        return Promise.all(
          rows.map(async (host) => {
            try {
              const items = await listCalendlyAvailabilitySchedules(host.id);
              return [host.id, items] as const;
            } catch {
              return [host.id, [] as import("@/lib/booking/calendly-api").CalendlySchedule[]] as const;
            }
          }),
        );
      })
      .then((pairs) => {
        if (!alive || !pairs) return;
        const next: Record<
          string,
          import("@/lib/booking/calendly-api").CalendlySchedule[]
        > = {};
        for (const [id, items] of pairs) next[id] = [...items];
        setSchedules(next);
      })
      .catch((err) => {
        if (alive) {
          setError(
            err instanceof Error ? err.message : "Could not load Calendly hosts.",
          );
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return <p className="text-[13px] text-rose-600">{error}</p>;
  }

  if (hosts.length === 0) {
    return (
      <p className="text-[13px] text-slate-500">
        No Calendly hosts yet. Connect Calendly in CRM, then refresh.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {hosts.map((c) => (
        <div
          key={c.id}
          className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3ECFB] text-[13px] font-bold text-[#5A32A3]">
              {initials(c.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{c.name}</p>
              <p className="text-[12px] text-slate-500">
                {c.email || (c.isHomeConsultant ? "Home consultant" : "Host")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void updateCalendlyHost(c.id, {
                  isConsultant: !c.isConsultant,
                })
                  .then((next) => {
                    setHosts((prev) =>
                      prev.map((row) => (row.id === next.id ? next : row)),
                    );
                  })
                  .catch(() => undefined);
              }}
              className={cn(
                "rounded-full px-2 py-1 text-[10px] font-semibold",
                c.isConsultant
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {c.isConsultant ? "Consultant" : "Host"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              void updateCalendlyHost(c.id, {
                isHomeConsultant: !c.isHomeConsultant,
              })
                .then((next) => {
                  setHosts((prev) =>
                    prev.map((row) => (row.id === next.id ? next : row)),
                  );
                })
                .catch(() => undefined);
            }}
            className="self-start text-[11px] font-semibold text-[#5A32A3]"
          >
            {c.isHomeConsultant ? "Home consultant" : "Set as home consultant"}
          </button>
          {(schedules[c.id] ?? []).length > 0 ? (
            <p className="text-[11px] text-slate-400">
              {(schedules[c.id] ?? [])
                .map((row) => row.name)
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
