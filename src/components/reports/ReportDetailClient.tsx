"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Play,
  Trash2,
  Download,
  Share2,
  Mail,
  Bookmark,
  Save,
  FileSpreadsheet,
  FileText,
  Pencil,
  Activity,
  LayoutGrid,
} from "lucide-react";
import {
  REPORT_DATA_SOURCES,
  REPORT_DATE_RANGES,
  REPORT_FILTER_PRESETS,
  REPORT_GROUP_BY,
  REPORT_OWNERS,
  REPORT_SCHEDULES,
  REPORT_SHARE_TARGETS,
  REPORT_SORT_BY,
  REPORT_STATUS_STYLE,
  REPORT_TYPES,
  REPORT_TYPE_STYLE,
  appendReportAudit,
  buildPreviewRows,
  deleteReport,
  exportReportCsv,
  exportReportExcel,
  exportReportPdf,
  formatReportAt,
  getReportById,
  resolveDateRangeLabel,
  saveReportAsTemplate,
  upsertReport,
  type ReportSchedule,
  type ReportType,
  type SavedReport,
} from "@/lib/reports/types";
import { cn } from "@/lib/utils";
import {
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import {
  assertRequired,
  fieldDiff,
  logEdit,
  softDeleteRecord,
  stripSystemFields,
} from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";

export function ReportDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<SavedReport | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<"results" | "edit" | "activity">("results");
  const [dirty, setDirty] = useState(false);
  const [shareTarget, setShareTarget] = useState("Managers");
  const [emailTo, setEmailTo] = useState("");

  // edit draft
  const [name, setName] = useState("");
  const [type, setType] = useState<ReportType>("Lead");
  const [dataSource, setDataSource] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filters, setFilters] = useState("");
  const [groupBy, setGroupBy] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [schedule, setSchedule] = useState<ReportSchedule>("None");
  const [createdBy, setCreatedBy] = useState("");

  useEffect(() => {
    const r = getReportById(id) ?? null;
    setRow(r);
    if (r) hydrate(r);
  }, [id]);

  function hydrate(r: SavedReport) {
    setName(r.name);
    setType(r.type);
    setDataSource(r.dataSource);
    setDateRange(r.dateRange);
    setCustomFrom(r.customFrom ?? "");
    setCustomTo(r.customTo ?? "");
    setFilters(r.filters ?? "");
    setGroupBy(r.groupBy ?? "");
    setSortBy(r.sortBy ?? "");
    setSchedule(r.schedule);
    setCreatedBy(r.createdBy);
    setShareTarget(r.sharedWith ?? "Managers");
    setEmailTo(r.emailedTo ?? "");
    setDirty(false);
  }

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
          status: next.schedule === "None" ? "Ready" : "Scheduled",
          lastRunAt: formatReportAt(),
          previewRows: buildPreviewRows(next.type),
        },
        "Run completed",
        "System",
      );
      save(next, "Run completed");
    }, 700);
  }

  function saveEdits() {
    if (!row) return;
    const req = assertRequired(
      { name, dataSource, dateRange },
      ["name", "dataSource", "dateRange"],
    );
    if (!req.ok) {
      flash(req.message);
      return;
    }
    if (dateRange === "Custom" && (!customFrom || !customTo)) {
      flash("Custom range needs From and To");
      return;
    }
    const nextStatus =
      schedule === "None"
        ? row.status === "Scheduled"
          ? ("Ready" as const)
          : row.status
        : ("Scheduled" as const);
    const patch = stripSystemFields({
      name: name.trim(),
      type,
      dataSource,
      dateRange,
      customFrom: dateRange === "Custom" ? customFrom : undefined,
      customTo: dateRange === "Custom" ? customTo : undefined,
      filters: filters.trim() || undefined,
      groupBy: groupBy || undefined,
      sortBy: sortBy || undefined,
      schedule,
      status: nextStatus,
      previewRows: buildPreviewRows(type),
    });
    const next = appendReportAudit(
      { ...row, ...patch, status: nextStatus },
      "Edited report definition",
      createdBy,
    );
    const changes = fieldDiff(
      row as unknown as Record<string, unknown>,
      next as unknown as Record<string, unknown>,
      ["name", "type", "dataSource", "dateRange", "filters", "groupBy", "sortBy", "schedule"],
    );
    logEdit("reports", createdBy, row.id, row.reportId, changes);
    save(next, "Changes saved");
    setDirty(false);
    setTab("results");
  }

  function onSchedule(s: ReportSchedule) {
    if (!row) return;
    setSchedule(s);
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

  function doShare() {
    if (!row) return;
    save(
      appendReportAudit(
        { ...row, sharedWith: shareTarget },
        `Shared with ${shareTarget}`,
        row.createdBy,
      ),
      `Shared with ${shareTarget}`,
    );
  }

  function doEmail() {
    if (!row) return;
    const to = emailTo.trim() || "team@finconnex.example";
    save(
      appendReportAudit(
        { ...row, emailedTo: to },
        `Emailed report to ${to}`,
        row.createdBy,
      ),
      `Email queued to ${to}`,
    );
  }

  function doTemplate() {
    if (!row) return;
    const tpl = saveReportAsTemplate(row, row.createdBy);
    save(
      appendReportAudit(row, `Saved as template ${tpl.reportId}`, row.createdBy),
      `Template ${tpl.reportId} saved`,
    );
  }

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Report not found
      </div>
    );
  }

  const inputSm = (hasIcon?: boolean) =>
    cn(elevatedInputClass(hasIcon), "!h-9 !text-[12px] !rounded-lg");
  const selectSm = (hasIcon?: boolean) =>
    cn(elevatedSelectClass(hasIcon), "!h-9 !text-[12px] !rounded-lg");

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

      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/reports")}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600"
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
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                REPORT_TYPE_STYLE[row.type],
              )}
            >
              {row.type}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
          <span className="mr-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Actions
          </span>
          <button
            type="button"
            onClick={run}
            disabled={row.status === "Running"}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </button>
          <button
            type="button"
            onClick={() => {
              exportReportCsv(row);
              save(
                appendReportAudit(row, "Exported CSV", row.createdBy),
                "Exported CSV",
              );
            }}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => {
              exportReportExcel(row);
              save(
                appendReportAudit(row, "Exported Excel", row.createdBy),
                "Exported Excel",
              );
            }}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </button>
          <button
            type="button"
            onClick={() => {
              exportReportPdf(row);
              save(
                appendReportAudit(row, "Exported PDF", row.createdBy),
                "Opened PDF print view",
              );
            }}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            type="button"
            onClick={doTemplate}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Save template
          </button>
          <button
            type="button"
            onClick={doShare}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            type="button"
            onClick={doEmail}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`Delete ${row.reportId}?`)) return;
              const gate = softDeleteRecord({
                action: "reports.delete",
                module: "reports",
                recordId: row.id,
                recordLabel: row.reportId,
                recordType: "Report",
                snapshot: row,
              });
              if (!gate.ok) {
                flash(gate.message);
                return;
              }
              deleteReport(row.id);
              router.push("/reports");
            }}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>

        <div className="mb-2.5 flex flex-wrap gap-1">
          {(
            [
              { id: "results" as const, label: "Results", icon: LayoutGrid },
              { id: "edit" as const, label: "Edit", icon: Pencil },
              { id: "activity" as const, label: "Activity", icon: Activity },
            ] as const
          ).map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              type="button"
              onClick={() => setTab(tid)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold",
                tab === tid
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          {tab === "results" ? (
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-bold text-slate-900">
                    {row.name}
                  </h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {row.dataSource} · {resolveDateRangeLabel(row)}
                    {row.groupBy ? ` · Group: ${row.groupBy}` : ""}
                    {row.sortBy ? ` · Sort: ${row.sortBy}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                    <span>
                      Created by{" "}
                      <strong className="text-slate-700">{row.createdBy}</strong>
                    </span>
                    <span>
                      Schedule{" "}
                      <strong className="text-slate-700">{row.schedule}</strong>
                    </span>
                    <span>
                      Last run{" "}
                      <strong className="text-slate-700">
                        {row.lastRunAt ?? "—"}
                      </strong>
                    </span>
                    {row.sharedWith ? (
                      <span>
                        Shared{" "}
                        <strong className="text-slate-700">
                          {row.sharedWith}
                        </strong>
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={row.schedule}
                    onChange={(e) =>
                      onSchedule(e.target.value as ReportSchedule)
                    }
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
                  >
                    {REPORT_SCHEDULES.map((s) => (
                      <option key={s} value={s}>
                        Schedule: {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={shareTarget}
                    onChange={(e) => setShareTarget(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
                  >
                    {REPORT_SHARE_TARGETS.map((s) => (
                      <option key={s} value={s}>
                        Share: {s}
                      </option>
                    ))}
                  </select>
                  <input
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="email@company.com"
                    className="h-8 w-[160px] rounded-lg border border-slate-200 px-2 text-[11px] outline-none focus:border-violet-400"
                  />
                </div>
              </div>

              {row.filters ? (
                <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-500">Filters · </span>
                  {row.filters}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {row.previewRows.map((p) => (
                  <div
                    key={p.label}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                  >
                    <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      {p.label}
                    </div>
                    <div className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                      {p.value}
                    </div>
                    {p.secondary ? (
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {p.secondary}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "edit" ? (
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-[13px] font-bold text-slate-900">
                    Edit report
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Update definition fields — Report ID stays fixed
                  </p>
                </div>
                <button
                  type="button"
                  onClick={saveEdits}
                  disabled={!dirty}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[11px] font-semibold text-white",
                    dirty
                      ? "bg-violet-600 hover:bg-violet-700"
                      : "cursor-not-allowed bg-slate-300",
                  )}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save changes
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="Report ID">
                  <InputShell>
                    <input
                      className={cn(
                        inputSm(false),
                        "cursor-not-allowed bg-slate-50 text-slate-500",
                      )}
                      value={row.reportId}
                      readOnly
                    />
                  </InputShell>
                </Field>
                <Field label="Name *" className="sm:col-span-2">
                  <InputShell>
                    <input
                      className={inputSm(false)}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setDirty(true);
                      }}
                    />
                  </InputShell>
                </Field>
                <Field label="Type *">
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={type}
                      onChange={(e) => {
                        setType(e.target.value as ReportType);
                        setDirty(true);
                      }}
                    >
                      {REPORT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </Field>
                <Field label="Data source *">
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={dataSource}
                      onChange={(e) => {
                        setDataSource(e.target.value);
                        setDirty(true);
                      }}
                    >
                      {REPORT_DATA_SOURCES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </Field>
                <Field label="Date range *">
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={dateRange}
                      onChange={(e) => {
                        setDateRange(e.target.value);
                        setDirty(true);
                      }}
                    >
                      {REPORT_DATE_RANGES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </Field>
                {dateRange === "Custom" ? (
                  <>
                    <Field label="From *">
                      <InputShell>
                        <input
                          type="date"
                          className={inputSm(false)}
                          value={customFrom}
                          onChange={(e) => {
                            setCustomFrom(e.target.value);
                            setDirty(true);
                          }}
                        />
                      </InputShell>
                    </Field>
                    <Field label="To *">
                      <InputShell>
                        <input
                          type="date"
                          className={inputSm(false)}
                          value={customTo}
                          onChange={(e) => {
                            setCustomTo(e.target.value);
                            setDirty(true);
                          }}
                        />
                      </InputShell>
                    </Field>
                  </>
                ) : null}
                <Field label="Schedule">
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={schedule}
                      onChange={(e) => {
                        setSchedule(e.target.value as ReportSchedule);
                        setDirty(true);
                      }}
                    >
                      {REPORT_SCHEDULES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </Field>
                <Field label="Created by">
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={createdBy}
                      onChange={(e) => {
                        setCreatedBy(e.target.value);
                        setDirty(true);
                      }}
                    >
                      {REPORT_OWNERS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </Field>
                <Field label="Group by">
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={groupBy}
                      onChange={(e) => {
                        setGroupBy(e.target.value);
                        setDirty(true);
                      }}
                    >
                      <option value="">—</option>
                      {REPORT_GROUP_BY.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </Field>
                <Field label="Sort by">
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setDirty(true);
                      }}
                    >
                      <option value="">—</option>
                      {REPORT_SORT_BY.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </Field>
                <Field label="Filters" className="sm:col-span-2 xl:col-span-3">
                  <InputShell>
                    <input
                      className={inputSm(false)}
                      list="edit-filter-presets"
                      value={filters}
                      onChange={(e) => {
                        setFilters(e.target.value);
                        setDirty(true);
                      }}
                      placeholder="Filter expression"
                    />
                  </InputShell>
                  <datalist id="edit-filter-presets">
                    {REPORT_FILTER_PRESETS.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </Field>
              </div>
            </div>
          ) : null}

          {tab === "activity" ? (
            <div className="p-4 sm:p-5">
              <h2 className="mb-3 text-[13px] font-bold text-slate-900">
                Activity
              </h2>
              <ul className="space-y-2">
                {[...row.audit].reverse().map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-baseline gap-2 border-b border-slate-50 pb-2 text-[12px] last:border-0"
                  >
                    <span className="font-semibold text-slate-800">
                      {a.action}
                    </span>
                    <span className="text-slate-500">{a.actor}</span>
                    <span className="ml-auto text-[11px] text-slate-400">
                      {a.at}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-2.5 pb-4 sm:px-3 lg:px-4">
        <RecordAuditHistory
          module="reports"
          recordId={row.id}
          localAudit={row.audit}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-[11px] font-semibold text-slate-600">{label}</label>
      {children}
    </div>
  );
}
