"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search, Download } from "lucide-react";
import { ResizableColumns } from "@/components/common/ResizableColumns";
import {
  REPORT_SCHEDULES,
  REPORT_STATUS_STYLE,
  REPORT_STATUSES,
  REPORT_TYPES,
  REPORT_TYPE_STYLE,
  listReports,
  savedReports as seed,
  type ReportSchedule,
  type ReportStatus,
  type ReportType,
  type SavedReport,
} from "@/lib/reports/types";
import { labelForDataSource } from "@/lib/reports/catalog";
import { useCrmReports } from "@/lib/reports/use-crm-reports";
import { cn } from "@/lib/utils";

export default function SavedReportsPage() {
  const router = useRouter();
  const crm = useCrmReports();
  const [rows, setRows] = useState<SavedReport[]>(seed);
  const [statusTab, setStatusTab] = useState<ReportStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState<ReportType | "All">("All");
  const [scheduleFilter, setScheduleFilter] = useState<ReportSchedule | "All">("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRows(listReports());
  }, [crm.source, crm.loading]);

  useEffect(() => {
    setPage(1);
  }, [statusTab, typeFilter, scheduleFilter, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(REPORT_STATUSES.map((s) => [s, 0])) as Record<ReportStatus, number>;
    for (const r of rows) map[r.status] += 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (typeFilter !== "All") data = data.filter((r) => r.type === typeFilter);
    if (scheduleFilter !== "All") data = data.filter((r) => r.schedule === scheduleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.reportId.toLowerCase().includes(q) ||
          r.dataSource.toLowerCase().includes(q) ||
          labelForDataSource(r.dataSource).toLowerCase().includes(q) ||
          r.createdBy.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, typeFilter, scheduleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function exportCsv() {
    const header = ["ID", "Name", "Type", "Status", "Source", "Range", "Schedule", "Last run"];
    const body = filtered.map((r) =>
      [r.reportId, r.name, r.type, r.status, labelForDataSource(r.dataSource), r.dateRange, r.schedule, r.lastRunAt ?? ""]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div className="relative mx-auto flex max-w-[1920px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link href="/reports" className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800">
              <ArrowLeft className="h-3.5 w-3.5" />
              Report library
            </Link>
            {crm.source === "api" ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                Live CRM
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={() => router.push("/reports/create?layoutid=standard&redirect=false")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New report
            </button>
          </div>
        </div>

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusTab("All")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              statusTab === "All" ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            All {rows.length}
          </button>
          {REPORT_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusTab(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                statusTab === s ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {s} {counts[s]}
            </button>
          ))}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ReportType | "All")}
            className="ml-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
          >
            <option value="All">All types</option>
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={scheduleFilter}
            onChange={(e) => setScheduleFilter(e.target.value as ReportSchedule | "All")}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
          >
            <option value="All">All schedules</option>
            {REPORT_SCHEDULES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <ResizableColumns storageKey="reports-list" className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Report</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Source</th>
                  <th className="px-3 py-2.5">Range</th>
                  <th className="px-3 py-2.5">Schedule</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Created by</th>
                  <th className="px-4 py-2.5">Last run</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/reports/${r.id}`)}
                    className="cursor-pointer border-t border-slate-50 hover:bg-violet-50/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.reportId}</div>
                      <div className="text-[11px] text-slate-500">{r.name}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold", REPORT_TYPE_STYLE[r.type])}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{labelForDataSource(r.dataSource)}</td>
                    <td className="px-3 py-3 text-slate-600">{r.dateRange}</td>
                    <td className="px-3 py-3 text-slate-600">{r.schedule}</td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold", REPORT_STATUS_STYLE[r.status])}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{r.createdBy}</td>
                    <td className="px-4 py-3 text-slate-600">{r.lastRunAt ?? ""}</td>
                  </tr>
                ))}
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No reports match
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </ResizableColumns>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
            <span>{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40">Prev</button>
              <span>{safePage} / {totalPages}</span>
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
