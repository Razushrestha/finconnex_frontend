"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
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
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchLeadById } from "@/lib/leads/api";
import { getCrmContact } from "@/lib/contacts/api";
import { getCrmDeal } from "@/lib/deals/api";
import { getCrmCompany } from "@/lib/companies/api";
import { toast } from "@/lib/notify/toast";
import { ResizableColumns } from "@/components/common/ResizableColumns";
import { publicBookUrl, type BookingPage } from "@/lib/booking/types";
import { ConsultationsBoard } from "@/components/booking/ConsultationsBoard";
import { NewAppointmentModal } from "@/components/booking/NewAppointmentModal";
import { AppointmentDateField } from "@/components/booking/DateTimeSection";
import {
  appointmentDateKey,
  appointmentInitials,
  appointmentMatchesKpi,
  appointmentRelatedLabel,
  bookingKpiStats,
  consultantById,
  appointmentConsultantName,
  dateKeyFromDate,
  formatApptDate,
  formatApptTime,
  parseAppointmentStart,
  type AppointmentChannel,
  type AppointmentStatus,
  type BookingKpiKey,
  type DashboardAppointment,
  type DashboardConsultant,
  type RelatedKind,
} from "@/lib/booking/dashboard";
import { useCrmBooking } from "@/lib/booking/use-crm-booking";
import {
  cancelCrmBooking,
  rescheduleCrmBooking,
  tryCrmBooking,
} from "@/lib/booking/api";
import {
  deleteCrmMeeting,
  tryCrmMeeting,
  updateCrmMeeting,
} from "@/lib/meetings/api";
import { todayIsoInTimezone } from "@/lib/booking/timezones";

export type BookingSection =
  | "home"
  | "consultations"
  | "schedules"
  | "consultants";

const BRAND = "#5A32A3";

function ConsultantCell({
  row,
}: {
  row: DashboardAppointment;
}) {
  const consultant = consultantById(row.consultantId);
  const name =
    consultant?.name ||
    row.consultantName ||
    appointmentConsultantName(row.consultantId);
  if (!name) {
    return <span className="text-[12px] text-slate-400">Unassigned</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <ConsultantFace
        name={name}
        photo={consultant?.photo}
        className="h-7 w-7 shrink-0 text-[10px]"
      />
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-slate-800">
          {name}
        </p>
        {consultant?.role ? (
          <p className="truncate text-[10px] text-slate-400">{consultant.role}</p>
        ) : null}
      </div>
    </div>
  );
}

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
      {appointmentInitials(name)}
    </span>
  );
}

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  Confirmed: "bg-[#D1FAE5] text-[#059669]",
  Pending: "bg-[#FEF3C7] text-[#D97706]",
  Scheduled: "bg-[#DBEAFE] text-[#2563EB]",
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  Confirmed: "bg-[#10B981]",
  Pending: "bg-[#F59E0B]",
  Scheduled: "bg-[#3B82F6]",
};

/** The table's compact status: a coloured dot that names itself on hover or focus. */
function StatusDot({ status }: { status: AppointmentStatus }) {
  return (
    <span
      tabIndex={0}
      aria-label={status}
      className="group relative inline-flex h-6 w-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#5A32A3]/40"
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[status])} />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {status}
      </span>
    </span>
  );
}

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

  function closeBook() {
    setBookOpen(false);
    if (searchParams.get("book") === "1") router.replace("/booking");
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F8F9FB]">
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
              pages={crm.pages}
              loading={crm.loading}
              onOpenPage={(id) => router.push(`/booking/${id}`)}
            />
          ) : null}
          {section === "consultants" ? (
            <ConsultantsPanel
              consultants={crm.consultants}
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
  const [editing, setEditing] = useState(false);
  const [pageSize, setPageSize] = useState(10);

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
  // Each day's appointments in start order, for the calendar's hover card.
  const appointmentsByDay = useMemo(() => {
    const byDay = new Map<string, DashboardAppointment[]>();
    for (const a of [...appointments].sort((x, y) => x.start.localeCompare(y.start))) {
      const key = appointmentDateKey(a.start);
      byDay.set(key, [...(byDay.get(key) ?? []), a]);
    }
    return byDay;
  }, [appointments]);
  const todayKey = dateKeyFromDate(now);

  function openView(row: DashboardAppointment) {
    setEditing(false);
    setDetail(row);
  }

  function openEdit(row: DashboardAppointment) {
    setEditing(true);
    setDetail(row);
  }

  async function removeAppointment(row: DashboardAppointment) {
    if (!window.confirm(`Delete appointment “${row.guestName}”?`)) return;
    const meeting = await tryCrmMeeting(() => deleteCrmMeeting(row.id));
    const booking = await tryCrmBooking(() =>
      cancelCrmBooking(row.id, "Deleted from upcoming appointments"),
    );
    if (meeting === null && booking === null) {
      toast.error("Could not delete this appointment.");
      return;
    }
    toast.success("Appointment deleted");
    if (detail?.id === row.id) setDetail(null);
    onRefresh();
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

      <div className="flex flex-col gap-4 pb-2 xl:flex-row xl:items-start">
        <section className="min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
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
          <div>
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
                onView={() => openView(row)}
                onEdit={() => openEdit(row)}
                onDelete={() => void removeAppointment(row)}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[16%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[88px]" />
              </colgroup>
              <thead className="bg-white">
                <tr className="border-b border-[#E5E7EB] text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                  <th className="px-4 py-3 font-bold">Appointment</th>
                  <th className="px-3 py-3 font-bold">Related To</th>
                  <th className="px-3 py-3 font-bold">Consultant</th>
                  <th className="px-3 py-3 font-bold whitespace-nowrap">Date & Time</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 font-bold">Channel</th>
                  <th className="px-3 py-3 text-right font-bold">Actions</th>
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
                    onView={() => openView(row)}
                    onEdit={() => openEdit(row)}
                    onDelete={() => void removeAppointment(row)}
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

        <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[300px]">
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
                    : "No consultants yet."}
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
            appointmentsByDay={appointmentsByDay}
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
          editing={editing}
          onClose={() => {
            setDetail(null);
            setEditing(false);
          }}
          onEdit={() => setEditing(true)}
          onSaved={() => {
            setEditing(false);
            setDetail(null);
            onRefresh();
          }}
        />
      ) : null}
    </div>
  );
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

function AppointmentActionsMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: Event) {
      const target = event.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - 160),
    });
    setOpen((value) => !value);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="flex h-8 w-8 items-center justify-center border-l border-[#E5E7EB] text-slate-400 hover:bg-slate-50 hover:text-slate-700"
        aria-label="More"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[80] w-40 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
              style={{ top: pos.top, left: pos.left }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-slate-800 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4 shrink-0" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function AppointmentCard({
  row,
  dimmed = false,
  onView,
  onEdit,
  onDelete,
}: {
  row: DashboardAppointment;
  dimmed?: boolean;
  onView: () => void;
  onEdit: () => void;
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
              className="inline-flex shrink-0 items-center overflow-hidden rounded-lg border border-[#E5E7EB]"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <AppointmentActionsMenu onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-[12px] text-slate-600 min-[480px]:grid-cols-2">
            <p className="flex items-center gap-1.5">
              <RelatedIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{appointmentRelatedLabel(row)}</span>
            </p>
            {(consultant?.name ||
              row.consultantName ||
              appointmentConsultantName(row.consultantId)) ? (
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
  onDelete,
}: {
  row: DashboardAppointment;
  dimmed?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const RelatedIcon = RELATED_ICON[row.relatedKind];
  const ChannelIcon = CHANNEL_ICON[row.channel];

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
        "cursor-pointer border-b border-[#F3F4F6] last:border-0 hover:bg-slate-50/80",
        dimmed && "pointer-events-none opacity-40 blur-[2px]",
      )}
    >
      <td className="px-4 py-3 align-middle">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              row.avatarClass,
            )}
          >
            {appointmentInitials(row.guestName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-900">
              {row.guestName}
            </p>
            {row.topic && row.topic !== row.guestName ? (
              <p className="truncate text-[11px] text-slate-500">{row.topic}</p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-slate-600">
          <RelatedIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{appointmentRelatedLabel(row)}</span>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <ConsultantCell row={row} />
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="grid grid-cols-[14px_minmax(0,1fr)] items-center gap-x-1.5 gap-y-0.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate text-[12px] font-medium tabular-nums text-slate-700">
            {formatApptDate(row.start)}
          </span>
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate text-[11px] tabular-nums text-slate-500">
            {formatApptTime(row.start)}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <StatusDot status={row.status} />
      </td>
      <td className="px-3 py-3 align-middle">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-slate-600">
          <ChannelIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{row.channel}</span>
        </span>
      </td>
      <td className="px-3 py-3 align-middle text-right" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center justify-end overflow-hidden rounded-lg border border-[#E5E7EB]">
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
    const rows = Math.min(appointmentsByDay.get(iso)?.length ?? 0, DAY_CARD_MAX_ROWS);
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
      <div className="grid auto-rows-fr grid-cols-7 text-center">
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
              aria-describedby={hovered?.iso === iso ? "calendar-day-card" : undefined}
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
        <p className="py-1 text-[12px] text-slate-400">No bookings on this day.</p>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((a) => (
            <li key={a.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
              <span className="w-[58px] shrink-0 pt-px text-[11px] font-semibold tabular-nums text-slate-700">
                {formatApptTime(a.start)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-slate-800">
                  {a.guestName}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {a.consultantName || appointmentConsultantName(a.consultantId) || a.type}
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
  onSaved,
}: {
  row: DashboardAppointment;
  editing: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSaved: () => void;
}) {
  const consultant = consultantById(row.consultantId);
  const initial = appointmentParts(row);
  const minDate = todayIsoInTimezone();
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
    if (!date || !time) {
      setError("Date & time is required");
      return;
    }
    if (date < minDate) {
      setError("Choose today or a future date and time.");
      return;
    }
    const start = new Date(`${date}T${time}`);
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) {
      setError("Choose today or a future date and time.");
      return;
    }
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    setSaving(true);
    setError("");
    try {
      const meeting = await tryCrmMeeting(() =>
        updateCrmMeeting(row.id, {
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
        }),
      );
      const booking =
        meeting
          ? null
          : await tryCrmBooking(() =>
              rescheduleCrmBooking(row.id, start.toISOString()),
            );
      if (!meeting && !booking) {
        setError("Could not save this appointment.");
        setSaving(false);
        return;
      }
      toast.success("Appointment updated");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setSaving(false);
    }
  }

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
                <p className="text-[12px] font-medium text-rose-600">{error}</p>
              ) : null}
            </div>
          ) : (
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
                <dt className="text-slate-400">Related to</dt>
                <dd className="min-w-0 text-right font-semibold text-slate-800">
                  <RelatedRecordLink kind={row.relatedKind} id={row.relatedId} />
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
              <Row label="Date" value={formatApptDate(row.start)} />
              <Row label="Time" value={formatApptTime(row.start)} />
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
                className="inline-flex h-9 items-center rounded-full bg-[#5A32A3] px-4 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#5A32A3] px-4 text-[13px] font-semibold text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const RELATED_RECORD_PATH: Record<RelatedKind, string> = {
  Lead: "/sales/leads/detail",
  Contact: "/sales/contacts/detail",
  Deal: "/sales/deals/detail",
  Company: "/sales/companies/detail",
};

/** The related record's name, fetched by id. Null when it can't be read. */
async function relatedRecordName(kind: RelatedKind, id: string): Promise<string | null> {
  if (kind === "Lead") {
    const lead = await fetchLeadById(id);
    return lead ? `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || null : null;
  }
  if (kind === "Contact") return (await getCrmContact(id))?.contact.name || null;
  if (kind === "Deal") return (await getCrmDeal(id))?.name || null;
  return (await getCrmCompany(id))?.company.name || null;
}

/**
 * Links to the appointment's related record in a new tab, labelled with its
 * name rather than its id. Until the name loads, or if it can't be read, the
 * link says "View lead" (or contact, deal, company) so it still works.
 */
function RelatedRecordLink({ kind, id }: { kind: RelatedKind; id: string }) {
  const [name, setName] = useState<string | null>(null);
  const linkable = !!id && id !== "—";

  useEffect(() => {
    if (!linkable) return;
    let alive = true;
    void relatedRecordName(kind, id)
      .then((value) => {
        if (alive) setName(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      setName(null);
    };
  }, [kind, id, linkable]);

  if (!linkable) return <span>—</span>;
  return (
    <a
      href={`${RELATED_RECORD_PATH[kind]}/${encodeURIComponent(id)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 text-[#5A32A3] hover:underline"
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

function ConsultantsPanel({
  consultants,
  loading,
  error,
}: {
  consultants: DashboardConsultant[];
  loading: boolean;
  error: string | null;
}) {
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

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {consultants.map((c) => (
        <div
          key={c.id}
          className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3ECFB] text-[13px] font-bold text-[#5A32A3]">
              {appointmentInitials(c.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{c.name}</p>
              <p className="text-[12px] text-slate-500">{c.role}</p>
            </div>
            <span className="text-[13px] font-bold tabular-nums text-slate-700">
              {c.bookings}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
