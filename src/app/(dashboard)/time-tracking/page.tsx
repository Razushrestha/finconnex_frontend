"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Download,
  Play,
  Square,
  FileText,
  CheckCheck,
  UserRound,
  Link2,
  Clock,
  Layers,
  Coins,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ResizableColumns } from "@/components/common/ResizableColumns";
import {
  RELATED_KINDS,
  TIME_STATUSES,
  TIME_STATUS_STYLE,
  amountFor,
  approveTimeEntry,
  exportTimesheetCsv,
  findRunningEntry,
  formatDuration,
  formatTimeDate,
  generateInvoiceFromTime,
  listTimeEntries,
  startTimer,
  stopTimer,
  timeEntries as seed,
  timesheetTotals,
  type RelatedKind,
  type TimeEntry,
  type TimeEntryStatus,
  RELATED_RECORD_OPTIONS,
} from "@/lib/time-tracking/types";
import { formatAUD } from "@/lib/finance/shared";
import { cn } from "@/lib/utils";
import { defaultActorName } from "@/lib/rules/actor";
import { notify } from "@/lib/notify/toast";
import { FINANCE_PRIMARY_BUTTON } from "@/components/finance/buttonStyles";
import { loadAssignableOwners } from "@/lib/users/assignable";
import {
  approveCrmTimeEntries,
  invoiceCrmTimeEntries,
  listTimeRelatedOptions,
  startCrmTimer,
  stopCrmTimer,
  type TimeRelatedOption,
} from "@/lib/time-tracking/api";
import { useCrmTimeEntries } from "@/lib/time-tracking/use-crm-time-entries";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function shiftDay(day: Date, delta: number) {
  const next = new Date(day);
  next.setDate(next.getDate() + delta);
  return next;
}

function Sparkline({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <svg viewBox="0 0 120 40" className="h-10 w-28" aria-hidden>
      <path
        d="M0 30 C12 30 16 22 28 24 C40 26 44 14 58 16 C72 18 76 10 90 12 C102 14 108 8 120 6 L120 40 L0 40 Z"
        fill={fill}
      />
      <path
        d="M0 30 C12 30 16 22 28 24 C40 26 44 14 58 16 C72 18 76 10 90 12 C102 14 108 8 120 6"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function TimeTrackingPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TimeEntry[]>(seed);
  const [statusTab, setStatusTab] = useState<TimeEntryStatus | "All">("All");
  const [kindFilter, setKindFilter] = useState<RelatedKind | "All">("All");
  const [billableFilter, setBillableFilter] = useState<"All" | "Yes" | "No">(
    "All",
  );
  const [userFilter, setUserFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [focusDate, setFocusDate] = useState<Date | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [relatedOptions, setRelatedOptions] = useState<TimeRelatedOption[]>([]);
  const crm = useCrmTimeEntries();
  const pageSize = 8;

  useEffect(() => {
    setFocusDate(new Date());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((owners) => {
      if (cancelled) return;
      const names = [
        ...new Set(
          owners.map((owner) => owner.name.trim()).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b));
      setUsers(names);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function refresh() {
    setRows(listTimeEntries());
  }

  useEffect(() => {
    refresh();
  }, [crm.source, crm.loading]);

  useEffect(() => {
    let cancelled = false;
    void listTimeRelatedOptions().then((options) => {
      if (!cancelled) setRelatedOptions(options);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusTab, kindFilter, billableFilter, userFilter, search, focusDate]);

  function flash(msg: string) {
    notify(msg);
  }

  const running = useMemo(
    () => rows.find((r) => r.status === "Running") ?? null,
    [rows],
  );

  const scoped = useMemo(() => {
    let data = rows;
    if (kindFilter !== "All")
      data = data.filter((r) => r.relatedTo.kind === kindFilter);
    if (billableFilter === "Yes") data = data.filter((r) => r.billable);
    if (billableFilter === "No") data = data.filter((r) => !r.billable);
    if (userFilter !== "All") data = data.filter((r) => r.user === userFilter);
    if (focusDate) {
      const day = formatTimeDate(focusDate);
      data = data.filter((r) => r.date === day);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.entryId.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.user.toLowerCase().includes(q) ||
          r.relatedTo.name.toLowerCase().includes(q) ||
          (r.invoiceRef ?? "").toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, kindFilter, billableFilter, userFilter, search, focusDate]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      TIME_STATUSES.map((s) => [s, 0]),
    ) as Record<TimeEntryStatus, number>;
    for (const r of scoped) map[r.status] += 1;
    return map;
  }, [scoped]);

  const filtered = useMemo(() => {
    if (statusTab === "All") return scoped;
    return scoped.filter((r) => r.status === statusTab);
  }, [scoped, statusTab]);

  const totals = useMemo(() => timesheetTotals(filtered), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPage() {
    const ids = paginated.map((r) => r.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function relatedForTimer() {
    const pool = relatedOptions.length
      ? relatedOptions
      : RELATED_RECORD_OPTIONS;
    return (
      (kindFilter === "All"
        ? pool[0]
        : pool.find((row) => row.kind === kindFilter)) ?? pool[0]
    );
  }

  async function onStartTimer() {
    const related = relatedForTimer();
    const user = userFilter === "All" ? defaultActorName() : userFilter;
    try {
      await startCrmTimer({
        related,
        description: "Timer session",
        billable: true,
      });
      crm.refresh();
      flash(`Timer started for ${user}`);
      return;
    } catch (err) {
      if (!related) {
        flash(
          err instanceof Error
            ? err.message
            : "No related record available from CRM yet",
        );
        return;
      }
      startTimer({ user, relatedTo: related });
      refresh();
      flash(`Timer started for ${user}`);
    }
  }

  async function onStopTimer() {
    const live = findRunningEntry() ?? running;
    if (!live) return;
    try {
      await stopCrmTimer(live.id);
      crm.refresh();
    } catch {
      stopTimer(live.id);
      refresh();
    }
    flash(`Timer stopped · ${live.entryId}`);
  }

  async function onApproveSelected() {
    const ids = [...selected].filter((id) => {
      const entry = rows.find((row) => row.id === id);
      return entry && (entry.status === "Submitted" || entry.status === "Logged");
    });
    if (!ids.length) {
      flash("Nothing to approve");
      return;
    }
    try {
      await approveCrmTimeEntries(ids);
      crm.refresh();
      flash(`Approved ${ids.length} entr${ids.length === 1 ? "y" : "ies"}`);
      return;
    } catch {
      let n = 0;
      for (const id of ids) {
        approveTimeEntry(id, defaultActorName());
        n += 1;
      }
      refresh();
      flash(n ? `Approved ${n} entr${n === 1 ? "y" : "ies"}` : "Nothing to approve");
    }
  }

  async function onInvoiceSelected() {
    const ids = [...selected];
    try {
      const invoice = await invoiceCrmTimeEntries(ids);
      if (!invoice.id) throw new Error("Invoice was not created");
      crm.refresh();
      setSelected(new Set());
      flash(`Invoice ${invoice.invoiceNumber ?? invoice.id} created`);
      router.push(`/finance/invoices/${invoice.id}`);
      return;
    } catch (err) {
      const result = generateInvoiceFromTime(ids, defaultActorName());
      if ("error" in result) {
        flash(err instanceof Error ? err.message : result.error);
        return;
      }
      refresh();
      setSelected(new Set());
      flash(`Invoice ${result.invoice.invoiceId} created`);
      router.push(`/finance/invoices/${result.invoice.id}`);
    }
  }

  const todayLabel =
    focusDate && isSameDay(focusDate, new Date()) ? "Today" : "Date";
  const focusLabel = focusDate
    ? focusDate.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  const fieldClass =
    "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-sm text-slate-700 shadow-sm outline-none focus:border-violet-300";

  return (
    <div className="relative min-h-full overflow-hidden bg-[#F5F7FB]">
      <div className="relative mx-auto flex max-w-[1920px] flex-col gap-4 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-4">
            <label className="w-full max-w-xs">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <UserRound className="h-3.5 w-3.5" />
                User
              </span>
              <span className="relative block">
                <UserRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className={fieldClass}
                >
                  <option value="All">All Users</option>
                  {users.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="w-full max-w-sm">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Link2 className="h-3.5 w-3.5" />
                Related To
              </span>
              <span className="relative block">
                <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={kindFilter}
                  onChange={(e) =>
                    setKindFilter(e.target.value as RelatedKind | "All")
                  }
                  className={fieldClass}
                >
                  <option value="All">All Related</option>
                  {RELATED_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportTimesheetCsv(filtered)}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/time-tracking/create?layoutid=standard&redirect=false",
                )
              }
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Log time
            </button>
            {running ? (
              <button
                type="button"
                onClick={onStopTimer}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-rose-500 px-5 text-sm font-semibold text-white shadow-md shadow-rose-500/25 hover:bg-rose-600"
              >
                <Square className="h-4 w-4 fill-current" />
                Stop timer
              </button>
            ) : (
              <button type="button" onClick={onStartTimer} className={`${FINANCE_PRIMARY_BUTTON} h-11 px-5`}>
                <Play className="h-4 w-4 fill-current" />
                Start timer
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Hours (Filtered)",
              value: formatDuration(totals.hours),
              icon: Clock,
              iconClass: "bg-emerald-50 text-emerald-500",
              stroke: "#34d399",
              fill: "#d1fae5",
            },
            {
              label: "Billable Hours",
              value: formatDuration(totals.billableHours),
              icon: Layers,
              iconClass: "bg-violet-50 text-violet-500",
              stroke: "#a78bfa",
              fill: "#ede9fe",
            },
            {
              label: "Billable Value",
              value: formatAUD(totals.amount),
              icon: Coins,
              iconClass: "bg-amber-50 text-amber-500",
              stroke: "#fbbf24",
              fill: "#fef3c7",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-4 py-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                    card.iconClass,
                  )}
                >
                  <card.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="text-2xl font-semibold tracking-tight text-slate-900">
                    {card.value}
                  </p>
                </div>
              </div>
              <Sparkline stroke={card.stroke} fill={card.fill} />
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{todayLabel}</p>
                <p className="text-lg font-semibold tracking-tight text-slate-900">
                  {focusLabel}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                aria-label="Previous day"
                onClick={() =>
                  setFocusDate((day) => shiftDay(day ?? new Date(), -1))
                }
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next day"
                onClick={() =>
                  setFocusDate((day) => shiftDay(day ?? new Date(), 1))
                }
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setStatusTab("All")}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-semibold",
              statusTab === "All"
                ? "bg-[#6D5AE6] text-white"
                : "text-slate-500 hover:bg-white hover:text-slate-800",
            )}
          >
            All ({scoped.length})
          </button>
          {TIME_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusTab(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                statusTab === s
                  ? "bg-[#6D5AE6] font-semibold text-white"
                  : "text-slate-500 hover:bg-white hover:text-slate-800",
              )}
            >
              {s} ({counts[s]})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, description, related..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-violet-300"
            />
          </div>
          <select
            value={kindFilter}
            onChange={(e) =>
              setKindFilter(e.target.value as RelatedKind | "All")
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm"
          >
            <option value="All">All related</option>
            {RELATED_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={billableFilter}
            onChange={(e) =>
              setBillableFilter(e.target.value as "All" | "Yes" | "No")
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm"
          >
            <option value="All">Billable: all</option>
            <option value="Yes">Billable</option>
            <option value="No">Non-billable</option>
          </select>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm"
          >
            <option value="All">All users</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onApproveSelected}
            disabled={selected.size === 0}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm enabled:hover:bg-slate-50 disabled:opacity-40"
          >
            <CheckCheck className="h-4 w-4" />
            Approve
          </button>
          <button
            type="button"
            onClick={onInvoiceSelected}
            disabled={selected.size === 0}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-violet-100 bg-violet-50 px-3 text-sm font-semibold text-violet-600 shadow-sm enabled:hover:bg-violet-100 disabled:opacity-40"
          >
            <FileText className="h-4 w-4" />
            Invoice selected
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
          <ResizableColumns storageKey="time-tracking-list" className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={
                        paginated.length > 0 &&
                        paginated.every((r) => selected.has(r.id))
                      }
                      onChange={toggleAllPage}
                      aria-label="Select page"
                    />
                  </th>
                  <th className="px-3 py-2">Entry ID</th>
                  <th className="px-3 py-2">Related to</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Billable</th>
                  <th className="px-3 py-2">Rate</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/time-tracking/${r.id}`)}
                    className="cursor-pointer border-b border-slate-50 text-[12px] hover:bg-violet-50/40"
                  >
                    <td
                      className="px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        aria-label={`Select ${r.entryId}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-violet-700">
                      {r.entryId}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {r.relatedTo.kind}
                      </span>
                      <br />
                      {r.relatedTo.name}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{r.user}</td>
                    <td className="px-3 py-2 text-slate-600">{r.date}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {formatDuration(r.durationHours)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          r.billable
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {r.billable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {formatAUD(r.rate)}/h
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {r.billable ? formatAUD(amountFor(r)) : ""}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          TIME_STATUS_STYLE[r.status],
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-slate-600">
                      {r.description}
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-16 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-400">
                        <Clock className="h-8 w-8" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-800">
                        No time entries match these filters.
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Try adjusting your filters or start a new timer.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ResizableColumns>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>
              {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
              {selected.size > 0 ? ` · ${selected.size} selected` : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg px-2 py-1 enabled:hover:bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-sm font-medium text-slate-700">
                {safePage}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg px-2 py-1 enabled:hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
