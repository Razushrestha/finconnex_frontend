"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { crmRecordHref, useCrmRecordName } from "@/lib/crm/related-record";
import { toast } from "@/lib/notify/toast";
import { ResizableColumns } from "@/components/common/ResizableColumns";
import { publicBookUrl, type BookingCurrency, type BookingPage } from "@/lib/booking/types";
import {
  currencyPrefix,
  eventTypeInitials,
} from "@/lib/booking/new-appointment";
import { ConsultationsBoard } from "@/components/booking/ConsultationsBoard";
import { NewAppointmentModal } from "@/components/booking/NewAppointmentModal";
import type { ScheduleMeetingSeed } from "@/app/(dashboard)/activities/meetings/create/page";
import { AppointmentDateField } from "@/components/booking/DateTimeSection";
import { FINANCE_PRIMARY_BUTTON, FINANCE_PRIMARY_BUTTON_SM } from "@/components/finance/buttonStyles";
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
              hideTitle
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
  const [reschedule, setReschedule] = useState<DashboardAppointment | null>(null);
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
    setReschedule(row);
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
                <col className="w-[14%]" />
                <col className="w-[9%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="bg-white">
                <tr className="border-b border-[#EEF0F3] text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-2 py-2 font-semibold">Booking ID</th>
                  <th className="px-2 py-2 font-semibold">Event Type</th>
                  <th className="px-2 py-2 font-semibold">Users/Resources</th>
                  <th className="px-2 py-2 font-semibold">Customers</th>
                  <th className="px-2 py-2 font-semibold">Payment</th>
                  <th className="px-2 py-2 font-semibold">Price</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-[13px] text-slate-400">
                      Loading appointments…
                    </td>
                  </tr>
                ) : null}
                {!loading && pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-[13px] text-slate-400">
                      No appointments from CRM meetings yet.
                    </td>
                  </tr>
                ) : null}
                {groupAppointmentsByDate(pageRows).map((group) => (
                  <AppointmentDayGroup
                    key={group.key}
                    label={group.label}
                    rows={group.rows}
                    dimmedFor={(row) =>
                      !!kpiFilter && !appointmentMatchesKpi(row, kpiFilter, now)
                    }
                    onView={openView}
                    onEdit={openEdit}
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
          onReschedule={() => {
            const row = detail;
            setDetail(null);
            setEditing(false);
            if (row) setReschedule(row);
          }}
          onCancel={() => {
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
        open={reschedule != null}
        initial={reschedule ? scheduleSeed(reschedule) : undefined}
        onClose={() => setReschedule(null)}
        onCreated={() => {
          setReschedule(null);
          onRefresh();
        }}
      />
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
  return {
    title: row.eventTypeName || row.guestName,
    contactName: row.guestName,
    relatedKind: linked ? row.relatedKind : "",
    relatedName: linked ? relatedId : "",
    relatedId: linked ? relatedId : "",
    date: valid
      ? `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
      : undefined,
    time: valid ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : undefined,
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

function groupAppointmentsByDate(rows: DashboardAppointment[]) {
  const groups: { key: string; label: string; rows: DashboardAppointment[] }[] = [];
  for (const row of rows) {
    const key = appointmentDateKey(row.start);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.rows.push(row);
    else groups.push({ key, label: formatGroupDate(row.start), rows: [row] });
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
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(" AM", " am")
    .replace(" PM", " pm");
}

function formatTimeRange(row: DashboardAppointment) {
  const start = formatClock(row.start);
  const end = row.end ? formatClock(row.end) : "";
  return end && end !== start ? `${start} - ${end}` : start;
}

function listPriceLabel(row: DashboardAppointment) {
  if (!row.price || row.price <= 0) return null;
  const known = ["NPR", "INR", "AUD", "USD", "GBP"];
  const currency = (
    known.includes(row.currency || "") ? row.currency : "NPR"
  ) as BookingCurrency;
  return `${currencyPrefix(currency)}${row.price.toFixed(2)}`;
}

function consultantLabel(row: DashboardAppointment) {
  return (
    consultantById(row.consultantId)?.name ||
    row.consultantName ||
    appointmentConsultantName(row.consultantId) ||
    "—"
  );
}

function BookingStatusMenu({
  onReschedule,
  onCancel,
  tone = "neutral",
}: {
  onReschedule: () => void;
  onCancel: () => void;
  tone?: "neutral" | "blue";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: Event) {
      const target = event.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 168;
    setPos({
      top: rect.bottom + 6,
      left: Math.max(8, rect.right - width),
    });
    setOpen((value) => !value);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-[11px] font-medium shadow-sm",
          tone === "blue"
            ? "border-blue-200 text-blue-600 hover:bg-blue-50"
            : "border-[#E5E7EB] text-slate-700 hover:bg-slate-50",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Upcoming
        {open ? (
          <ChevronUp className="h-3 w-3 text-slate-400" />
        ) : (
          <ChevronDown className="h-3 w-3 text-slate-400" />
        )}
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[80] w-[168px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.12)]"
              style={{ top: pos.top, left: pos.left }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onReschedule();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                Reschedule
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onCancel();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                Cancel
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function AppointmentDayGroup({
  label,
  rows,
  dimmedFor,
  onView,
  onEdit,
  onDelete,
}: {
  label: string;
  rows: DashboardAppointment[];
  dimmedFor: (row: DashboardAppointment) => boolean;
  onView: (row: DashboardAppointment) => void;
  onEdit: (row: DashboardAppointment) => void;
  onDelete: (row: DashboardAppointment) => void;
}) {
  return (
    <>
      <tr className="border-b border-[#EEF0F3] bg-white">
        <td colSpan={8} className="px-3 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
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
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <BookingStatusMenu onReschedule={onEdit} onCancel={onDelete} />
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
  const eventName = row.eventTypeName || row.type;
  const price = listPriceLabel(row);

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
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-700">
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{formatTimeRange(row)}</span>
        </span>
      </td>
      <td className="truncate px-2 py-2 align-middle text-[11px] font-medium text-slate-800">
        {row.bookingCode || "—"}
      </td>
      <td className="px-2 py-2 align-middle">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#7C6AE8] text-[9px] font-bold text-white">
            {eventTypeInitials(eventName)}
          </span>
          <span className="truncate text-[11px] text-slate-800">{eventName}</span>
        </span>
      </td>
      <td className="px-2 py-2 align-middle">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <User className="h-3 w-3" />
          </span>
          <span className="truncate text-[11px] text-slate-800">{consultantLabel(row)}</span>
        </span>
      </td>
      <td className="px-2 py-2 align-middle">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-700">
          <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{row.guestName}</span>
        </span>
      </td>
      <td className="truncate px-2 py-2 align-middle text-[11px] text-slate-700">
        {row.paymentStatus || "—"}
      </td>
      <td className="px-2 py-2 align-middle">
        {price ? (
          <span className="inline-flex rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
            {price}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">—</span>
        )}
      </td>
      <td className="px-2 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
        <BookingStatusMenu onReschedule={onEdit} onCancel={onDelete} />
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
  onReschedule,
  onCancel,
  onSaved,
}: {
  row: DashboardAppointment;
  editing: boolean;
  onClose: () => void;
  onEdit: () => void;
  onReschedule: () => void;
  onCancel: () => void;
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
        onReschedule={onReschedule}
        onCancel={onCancel}
      />
    );
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
                className={cn(FINANCE_PRIMARY_BUTTON_SM, "h-9 px-4 text-[13px]")}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className={cn(FINANCE_PRIMARY_BUTTON_SM, "h-9 px-4 text-[13px]")}
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
  if (!end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const mins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
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
  onReschedule,
  onCancel,
}: {
  row: DashboardAppointment;
  email: string;
  eventName: string;
  whenLabel: string;
  timeLabel: string;
  onClose: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<"appointment" | "customer" | "audit">("appointment");
  const price = listPriceLabel(row);
  const tabs = [
    { id: "appointment" as const, label: "Appointment Info" },
    { id: "customer" as const, label: "Customer Info" },
    { id: "audit" as const, label: "Audit Info" },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/35" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="appointment-summary-title"
        className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 id="appointment-summary-title" className="text-[15px] font-semibold text-slate-800">
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
              <p className="text-[15px] font-semibold leading-snug text-slate-900">{whenLabel}</p>
              <BookingStatusMenu tone="blue" onReschedule={onReschedule} onCancel={onCancel} />
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
                      ? "border-[#5B4FE8] text-[#5B4FE8]"
                      : "border-transparent text-slate-500 hover:text-slate-700",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === "appointment" ? (
              <div>
                <SummaryRow label="Event Type">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#7C6BF2] text-[9px] font-bold text-white">
                      {eventTypeInitials(eventName)}
                    </span>
                    <span className="truncate">{eventName}</span>
                  </span>
                </SummaryRow>
                <SummaryRow label="User">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <User className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{consultantLabel(row)}</span>
                  </span>
                </SummaryRow>
                <SummaryRow label="Time">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{timeLabel}</span>
                  </span>
                </SummaryRow>
                <SummaryRow label="Booked IP Address">—</SummaryRow>
                <SummaryRow label="Booked Source">In App</SummaryRow>
              </div>
            ) : null}

            {tab === "customer" ? (
              <CustomerInfoTab row={row} email={email} price={price} />
            ) : null}

            {tab === "audit" ? <AuditInfoTab row={row} email={email} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerInfoTab({
  row,
  email,
  price,
}: {
  row: DashboardAppointment;
  email: string;
  price: string | null;
}) {
  const [section, setSection] = useState<"booking" | "questions" | "payment">("booking");
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
            <span className="block truncate text-[12px] text-slate-400">{email || "—"}</span>
          </span>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-[13px] font-medium",
            paid ? "text-red-500" : row.paymentStatus === "Due" ? "text-amber-600" : "text-slate-400",
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
                ? "border-[#5B4FE8] text-[#5B4FE8]"
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
          <SummaryRow label="Booked On">{formatBookedOn(row.bookedOn)}</SummaryRow>
          <SummaryRow label="Contact Number">{row.phone || "—"}</SummaryRow>
          <SummaryRow label="Notes">{row.notes || "—"}</SummaryRow>
        </div>
      ) : null}
      {section === "questions" ? (
        <p className="px-4 py-6 text-[13px] text-slate-400">No answers yet.</p>
      ) : null}
      {section === "payment" ? (
        <div>
          <SummaryRow label="Status">{row.paymentStatus || "—"}</SummaryRow>
          <SummaryRow label="Price">{price || "—"}</SummaryRow>
        </div>
      ) : null}
    </div>
  );
}

function AuditInfoTab({ row, email }: { row: DashboardAppointment; email: string }) {
  const when = row.bookedOn ? parseAppointmentStart(row.bookedOn) : null;
  const valid = !!when && !Number.isNaN(when.getTime());
  const actor = row.createdBy || consultantLabel(row);
  const events = [
    ...(email
      ? [{ id: "email" as const, text: "Email notification to Customer sent for appointment" }]
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
            <span className="inline-flex rounded-md bg-[#F3F0FF] px-2 py-0.5 text-[11px] font-medium tracking-wide text-[#7C6BF2]">
              {AUDIT_WEEKDAYS[when.getDay()]}
            </span>
          ) : null}
        </div>

        {events.map((event, index) => (
          <div key={event.id} className="contents">
            <div className="pt-5 text-right text-[12px] leading-7 text-slate-400">{timeLabel}</div>
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

const AUDIT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const AUDIT_WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function formatBookedOn(value?: string) {
  if (!value) return "—";
  const date = parseAppointmentStart(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  const time = date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
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
    .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
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
