"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Search,
  Download,
  Timer,
  Play,
  Square,
  FileText,
  CheckCheck,
} from "lucide-react";
import {
  RELATED_KINDS,
  TIME_STATUSES,
  TIME_STATUS_STYLE,
  TIME_USERS,
  amountFor,
  approveTimeEntry,
  exportTimesheetCsv,
  findRunningEntry,
  formatDuration,
  generateInvoiceFromTime,
  listTimeEntries,
  relatedLabel,
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
  const [toast, setToast] = useState<string | null>(null);
  const [timerUser, setTimerUser] = useState<string>(TIME_USERS[0]);
  const [timerRelated, setTimerRelated] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  function refresh() {
    setRows(listTimeEntries());
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusTab, kindFilter, billableFilter, userFilter, search]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  const running = useMemo(
    () => rows.find((r) => r.status === "Running") ?? null,
    [rows],
  );

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      TIME_STATUSES.map((s) => [s, 0]),
    ) as Record<TimeEntryStatus, number>;
    for (const r of rows) map[r.status] += 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (kindFilter !== "All")
      data = data.filter((r) => r.relatedTo.kind === kindFilter);
    if (billableFilter === "Yes") data = data.filter((r) => r.billable);
    if (billableFilter === "No") data = data.filter((r) => !r.billable);
    if (userFilter !== "All") data = data.filter((r) => r.user === userFilter);
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
  }, [rows, statusTab, kindFilter, billableFilter, userFilter, search]);

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

  function onStartTimer() {
    const related = RELATED_RECORD_OPTIONS[timerRelated];
    startTimer({ user: timerUser, relatedTo: related });
    refresh();
    flash(`Timer started for ${timerUser}`);
  }

  function onStopTimer() {
    const live = findRunningEntry() ?? running;
    if (!live) return;
    stopTimer(live.id);
    refresh();
    flash(`Timer stopped · ${live.entryId}`);
  }

  function onApproveSelected() {
    const ids = [...selected];
    let n = 0;
    for (const id of ids) {
      const e = rows.find((r) => r.id === id);
      if (e && (e.status === "Submitted" || e.status === "Logged")) {
        approveTimeEntry(id, "John Smith");
        n += 1;
      }
    }
    refresh();
    flash(n ? `Approved ${n} entr${n === 1 ? "y" : "ies"}` : "Nothing to approve");
  }

  function onInvoiceSelected() {
    const result = generateInvoiceFromTime([...selected], "John Smith");
    if ("error" in result) {
      flash(result.error);
      return;
    }
    refresh();
    setSelected(new Set());
    flash(`Invoice ${result.invoice.invoiceId} created`);
    router.push(`/finance/invoices/${result.invoice.id}`);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Time Tracking
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Timer className="h-2.5 w-2.5" />
              §23
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => exportTimesheetCsv(filtered)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export timesheet
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/time-tracking/create?layoutid=standard&redirect=false",
                )
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Log time
            </button>
          </div>
        </div>

        {/* Timer bar */}
        <div className="mb-2.5 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
          <div className="min-w-[120px] flex-1">
            <label className="mb-0.5 block text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
              User
            </label>
            <select
              value={timerUser}
              onChange={(e) => setTimerUser(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-800"
            >
              {TIME_USERS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-[2]">
            <label className="mb-0.5 block text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
              Related to
            </label>
            <select
              value={timerRelated}
              onChange={(e) => setTimerRelated(Number(e.target.value))}
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-800"
            >
              {RELATED_RECORD_OPTIONS.map((r, i) => (
                <option key={`${r.kind}-${r.name}`} value={i}>
                  {relatedLabel(r)}
                </option>
              ))}
            </select>
          </div>
          {running ? (
            <button
              type="button"
              onClick={onStopTimer}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-[11px] font-semibold text-white hover:bg-rose-700"
            >
              <Square className="h-3.5 w-3.5" />
              Stop · {running.entryId}
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartTimer}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              <Play className="h-3.5 w-3.5" />
              Start timer
            </button>
          )}
          {running && (
            <span className="text-[11px] font-medium text-emerald-700">
              Running for {running.user}
            </span>
          )}
        </div>

        {/* Snapshot */}
        <div className="mb-2.5 grid grid-cols-3 gap-2">
          {[
            { label: "Hours (filtered)", value: formatDuration(totals.hours) },
            {
              label: "Billable hours",
              value: formatDuration(totals.billableHours),
            },
            { label: "Billable value", value: formatAUD(totals.amount) },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
            >
              <p className="text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
                {s.label}
              </p>
              <p className="text-[15px] font-bold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusTab("All")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              statusTab === "All"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            All {rows.length}
          </button>
          {TIME_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusTab(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                statusTab === s
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {s} {counts[s]}
            </button>
          ))}
        </div>

        {/* Filters + bulk */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, description, related…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-2 pl-7 text-[11px] text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <select
            value={kindFilter}
            onChange={(e) =>
              setKindFilter(e.target.value as RelatedKind | "All")
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700"
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
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700"
          >
            <option value="All">Billable: all</option>
            <option value="Yes">Billable</option>
            <option value="No">Non-billable</option>
          </select>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700"
          >
            <option value="All">All users</option>
            {TIME_USERS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onApproveSelected}
            disabled={selected.size === 0}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 enabled:hover:bg-slate-50 disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            type="button"
            onClick={onInvoiceSelected}
            disabled={selected.size === 0}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 enabled:hover:bg-violet-100 disabled:opacity-40"
          >
            <FileText className="h-3.5 w-3.5" />
            Invoice selected
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
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
                    <td
                      colSpan={11}
                      className="px-3 py-10 text-center text-[12px] text-slate-400"
                    >
                      No time entries match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
            <span>
              {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
              {selected.size > 0 ? ` · ${selected.size} selected` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md px-2 py-1 enabled:hover:bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md px-2 py-1 enabled:hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
