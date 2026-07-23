"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileBarChart,
  Database,
  Calendar,
  User,
  Type,
  Home,
  ArrowLeft,
  Filter,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import {
  REPORT_DATA_SOURCES,
  REPORT_DATE_RANGES,
  REPORT_FILTER_PRESETS,
  REPORT_GROUP_BY,
  REPORT_OWNERS,
  REPORT_SCHEDULES,
  REPORT_SORT_BY,
  REPORT_TYPE_STYLE,
  REPORT_TYPES,
  appendReportAudit,
  buildPreviewRows,
  formatReportDate,
  nextReportIds,
  upsertReport,
  type ReportSchedule,
  type ReportType,
} from "@/lib/reports/types";
import {
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";

interface Props {
  layoutId: string;
  redirect: boolean;
}

function CompactField({
  label,
  required,
  error,
  className,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-[11px] font-semibold text-slate-600">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-[10px] font-medium text-rose-500">{error}</p>
      ) : hint ? (
        <p className="text-[10px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function CreateReportForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ReportType>("Lead");
  const [dataSource, setDataSource] = useState<string>(REPORT_DATA_SOURCES[0]);
  const [dateRange, setDateRange] = useState<string>(REPORT_DATE_RANGES[1]);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filters, setFilters] = useState("");
  const [groupBy, setGroupBy] = useState<string>(REPORT_GROUP_BY[0]);
  const [sortBy, setSortBy] = useState<string>(REPORT_SORT_BY[0]);
  const [schedule, setSchedule] = useState<ReportSchedule>("None");
  const [createdBy, setCreatedBy] = useState<string>(REPORT_OWNERS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const preview = buildPreviewRows(type);

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!type) next.type = "Type is required";
    if (!dataSource) next.dataSource = "Data source is required";
    if (!dateRange) next.dateRange = "Date range is required";
    if (dateRange === "Custom" && (!customFrom || !customTo)) {
      next.custom = "Custom range needs From and To dates";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextReportIds();
    const status = schedule === "None" ? "Ready" : "Scheduled";
    let created = upsertReport(
      appendReportAudit(
        {
          id: ids.id,
          reportId: ids.reportId,
          name: name.trim(),
          type,
          status,
          dataSource,
          dateRange,
          customFrom: dateRange === "Custom" ? customFrom : undefined,
          customTo: dateRange === "Custom" ? customTo : undefined,
          filters: filters.trim() || undefined,
          groupBy: groupBy || undefined,
          sortBy: sortBy || undefined,
          schedule,
          createdBy,
          createdAt: formatReportDate(),
          previewRows: buildPreviewRows(type),
          audit: [],
        },
        "Created",
        createdBy,
      ),
    );
    if (schedule !== "None") {
      created = upsertReport(
        appendReportAudit(created, `Scheduled ${schedule}`, createdBy),
      );
    }
    if (createAnother) {
      setName("");
      setFilters("");
      setErrors({});
      return;
    }
    router.push(`/reports/${created.id}`);
  }

  const inputSm = (hasIcon?: boolean) =>
    cn(elevatedInputClass(hasIcon), "!h-9 !text-[12px] !rounded-lg");
  const selectSm = (hasIcon?: boolean) =>
    cn(elevatedSelectClass(hasIcon), "!h-9 !text-[12px] !rounded-lg");

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.09),_transparent_65%)]"
      />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/reports")}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600"
              aria-label="Back"
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
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              New report
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <FileBarChart className="h-2.5 w-2.5" />
              §14
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push("/reports")}
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(true)}
              className="inline-flex h-8 items-center rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700"
            >
              Save &amp; New
            </button>
            <button
              type="button"
              onClick={() => onSave(false)}
              className="inline-flex h-8 items-center rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-sm shadow-violet-600/20"
            >
              Create report
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.9fr)]">
            <div className="border-b border-slate-100 p-4 sm:p-5 lg:border-r lg:border-b-0">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Report definition
              </p>
              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                <CompactField
                  label="Name"
                  required
                  error={errors.name}
                  className="sm:col-span-2 xl:col-span-3"
                >
                  <InputShell icon={Type} error={!!errors.name}>
                    <input
                      className={inputSm(true)}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Monthly lead funnel"
                    />
                  </InputShell>
                </CompactField>

                <CompactField label="Type" required error={errors.type}>
                  <InputShell icon={FileBarChart} error={!!errors.type}>
                    <select
                      className={selectSm(true)}
                      value={type}
                      onChange={(e) => setType(e.target.value as ReportType)}
                    >
                      {REPORT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                <CompactField
                  label="Data source"
                  required
                  error={errors.dataSource}
                >
                  <InputShell icon={Database} error={!!errors.dataSource}>
                    <select
                      className={selectSm(true)}
                      value={dataSource}
                      onChange={(e) => setDataSource(e.target.value)}
                    >
                      {REPORT_DATA_SOURCES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                <CompactField
                  label="Date range"
                  required
                  error={errors.dateRange}
                >
                  <InputShell icon={Calendar} error={!!errors.dateRange}>
                    <select
                      className={selectSm(true)}
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                    >
                      {REPORT_DATE_RANGES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                {dateRange === "Custom" ? (
                  <>
                    <CompactField label="From" required error={errors.custom}>
                      <InputShell>
                        <input
                          type="date"
                          className={inputSm(false)}
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                        />
                      </InputShell>
                    </CompactField>
                    <CompactField label="To" required>
                      <InputShell>
                        <input
                          type="date"
                          className={inputSm(false)}
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                        />
                      </InputShell>
                    </CompactField>
                  </>
                ) : null}

                <CompactField label="Schedule">
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={schedule}
                      onChange={(e) =>
                        setSchedule(e.target.value as ReportSchedule)
                      }
                    >
                      {REPORT_SCHEDULES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                <CompactField label="Created by">
                  <InputShell icon={User}>
                    <select
                      className={selectSm(true)}
                      value={createdBy}
                      onChange={(e) => setCreatedBy(e.target.value)}
                    >
                      {REPORT_OWNERS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                <CompactField label="Group by">
                  <InputShell icon={Layers}>
                    <select
                      className={selectSm(true)}
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                    >
                      <option value="">—</option>
                      {REPORT_GROUP_BY.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                <CompactField label="Sort by">
                  <InputShell icon={ArrowUpDown}>
                    <select
                      className={selectSm(true)}
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="">—</option>
                      {REPORT_SORT_BY.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                <CompactField
                  label="Filters"
                  className="sm:col-span-2 xl:col-span-3"
                  hint="Pick a preset or type a custom expression"
                >
                  <InputShell icon={Filter}>
                    <input
                      className={inputSm(true)}
                      list="report-filter-presets"
                      value={filters}
                      onChange={(e) => setFilters(e.target.value)}
                      placeholder="e.g. Status ≠ Unqualified"
                    />
                  </InputShell>
                  <datalist id="report-filter-presets">
                    {REPORT_FILTER_PRESETS.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </CompactField>
              </div>
            </div>

            <aside className="flex flex-col bg-slate-50/60 p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Live preview
              </p>
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/25">
                    <FileBarChart className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-slate-900">
                      {name.trim() || "Untitled report"}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        REPORT_TYPE_STYLE[type],
                      )}
                    >
                      {type}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Source</span>
                    <span className="font-semibold text-slate-700">
                      {dataSource}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Range</span>
                    <span className="font-semibold text-slate-700">
                      {dateRange === "Custom"
                        ? `${customFrom || "…"} → ${customTo || "…"}`
                        : dateRange}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Schedule</span>
                    <span className="font-semibold text-slate-700">
                      {schedule}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Sample metrics
                  </p>
                  <ul className="space-y-1.5">
                    {preview.map((p) => (
                      <li
                        key={p.label}
                        className="flex items-center justify-between text-[12px]"
                      >
                        <span className="text-slate-500">{p.label}</span>
                        <span className="font-bold text-slate-900">
                          {p.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-auto pt-4 text-[11px] leading-relaxed text-slate-400">
                Export to CSV, Excel, or PDF after you run the report. Schedule
                None keeps it ad hoc for management reviews.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
