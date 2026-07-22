"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Play,
  Calendar,
  Trash2,
  Download,
  Share2,
  Mail,
  Copy,
} from "lucide-react";
import {
  REPORT_SCHEDULES,
  REPORT_STATUS_STYLE,
  appendReportAudit,
  deleteReport,
  formatReportAt,
  getReportById,
  upsertReport,
  type ReportSchedule,
  type SavedReport,
} from "@/lib/reports/types";
import { cn } from "@/lib/utils";
import { elevatedSelectClass } from "@/components/sales/CreateEntityForm";

export function ReportDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<SavedReport | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setRow(getReportById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: SavedReport, msg?: string) {
    upsertReport(next);
    setRow(next);
    if (msg) flash(msg);
  }

  function run() {
    if (!row) return;
    let next = appendReportAudit(
      { ...row, status: "Running" },
      "Run started",
      row.createdBy,
    );
    save(next, "Running…");
    window.setTimeout(() => {
      next = appendReportAudit(
        {
          ...next,
          status: row.schedule === "None" ? "Ready" : "Scheduled",
          lastRunAt: formatReportAt(),
        },
        "Run completed",
        "System",
      );
      save(next, "Run completed");
    }, 600);
  }

  function schedule(s: ReportSchedule) {
    if (!row) return;
    save(
      appendReportAudit(
        {
          ...row,
          schedule: s,
          status: s === "None" ? "Ready" : "Scheduled",
        },
        s === "None" ? "Schedule cleared" : `Scheduled ${s}`,
        row.createdBy,
      ),
      s === "None" ? "Unscheduled" : `Scheduled ${s}`,
    );
  }

  function exportCsv() {
    if (!row) return;
    const header = ["Label", "Value", "Secondary"];
    const body = row.previewRows.map((r) =>
      [r.label, r.value, r.secondary ?? ""]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.reportId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    save(appendReportAudit(row, "Exported CSV", row.createdBy), "Exported CSV");
  }

  function share() {
    if (!row) return;
    save(
      appendReportAudit(
        { ...row, sharedWith: row.sharedWith ?? "Managers" },
        "Shared with Managers",
        row.createdBy,
      ),
      "Shared (mock)",
    );
  }

  function emailReport() {
    if (!row) return;
    save(
      appendReportAudit(row, "Emailed report", row.createdBy),
      `Emailed to ${row.createdBy}`,
    );
  }

  function saveAsTemplate() {
    if (!row) return;
    save(
      appendReportAudit(row, "Saved as template", row.createdBy),
      "Saved as template",
    );
  }

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Report not found
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-[1100px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/reports")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link href="/" className="flex items-center gap-0.5 hover:text-slate-600">
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <Link href="/reports" className="hover:text-slate-600">
                Reports
              </Link>
              <span>/</span>
            </nav>
            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
              {row.reportId}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                REPORT_STATUS_STYLE[row.status],
              )}
            >
              {row.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={run}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              onClick={emailReport}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </button>
            <button
              type="button"
              onClick={saveAsTemplate}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Copy className="h-3.5 w-3.5" />
              Template
            </button>
            <button
              type="button"
              onClick={() => {
                deleteReport(row.id);
                router.push("/reports");
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[16px] font-bold text-slate-900">{row.name}</h2>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
              <span>
                Type: <strong className="text-slate-700">{row.type}</strong>
              </span>
              <span>
                Source:{" "}
                <strong className="text-slate-700">{row.dataSource}</strong>
              </span>
              <span>
                Range: <strong className="text-slate-700">{row.dateRange}</strong>
              </span>
              <span>
                Owner: <strong className="text-slate-700">{row.createdBy}</strong>
              </span>
              {row.lastRunAt ? (
                <span>
                  Last run:{" "}
                  <strong className="text-slate-700">{row.lastRunAt}</strong>
                </span>
              ) : null}
              {row.sharedWith ? (
                <span>
                  Shared:{" "}
                  <strong className="text-slate-700">{row.sharedWith}</strong>
                </span>
              ) : null}
            </div>
            {row.filters ? (
              <p className="mt-2 text-[12px] text-slate-500">
                Filters: {row.filters}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Schedule
              </span>
              <select
                className={cn(elevatedSelectClass(false), "h-8 w-auto text-[11px]")}
                value={row.schedule}
                onChange={(e) =>
                  schedule(e.target.value as ReportSchedule)
                }
              >
                {REPORT_SCHEDULES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-5 py-4">
            <h3 className="mb-3 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              Preview results
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {row.previewRows.map((p) => (
                <div
                  key={p.label}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                >
                  <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    {p.label}
                  </div>
                  <div className="mt-1 text-[18px] font-bold text-slate-900">
                    {p.value}
                  </div>
                  {p.secondary ? (
                    <div className="text-[10px] text-slate-400">{p.secondary}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <h3 className="mb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              History
            </h3>
            <ul className="space-y-1.5">
              {row.audit.map((a) => (
                <li key={a.id} className="text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700">{a.action}</span>
                  {" · "}
                  {a.actor} · {a.at}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
