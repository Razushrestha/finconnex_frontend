"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  ChevronDown,
  Download,
  Handshake,
  ListFilter,
  MoreHorizontal,
  Percent,
  RotateCcw,
  Search,
  Star,
  Table2,
  Users,
  Wallet,
} from "lucide-react";
import { AddToFolderMenu } from "@/components/reports/library/AddToFolderMenu";
import { ResizableColumns } from "@/components/common/ResizableColumns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DASHBOARD_LOAN_TYPES,
  DASHBOARD_OWNERS,
  DASHBOARD_TEAMS,
  type DashboardDateRange,
} from "@/lib/dashboard/layout";
import { LEAD_SOURCES } from "@/lib/leads/types";
import { LEAD_PIPELINE_STAGES } from "@/lib/leads/types";
import { categoryById, reportById } from "@/lib/reports/library/catalog";
import { formatCell } from "@/lib/reports/library/format";
import {
  exportLibraryCsv,
  exportLibraryExcel,
  exportLibraryPdf,
} from "@/lib/reports/library/export";
import {
  isFavoriteReport,
  loadLibraryRange,
  scheduleLibraryReport,
  toggleFavoriteReport,
  touchRecentReport,
} from "@/lib/reports/library/prefs";
import { runLibraryReport } from "@/lib/reports/library/run";
import { reportAccess } from "@/lib/reports/library/scope";
import {
  defaultLibraryFilters,
  type LibraryFilters,
  type ReportFilterId,
} from "@/lib/reports/library/types";
import { loadCampaigns } from "@/lib/reports/library/records";
import { cn } from "@/lib/utils";

const FILTER_LABELS: Record<ReportFilterId, string> = {
  dateRange: "Date range",
  owner: "Owner",
  team: "Team",
  status: "Status",
  source: "Source",
  loanType: "Loan type",
  loanPurpose: "Loan purpose",
  stage: "Stage",
  campaign: "Campaign",
};

function activeFilterCount(
  ids: ReportFilterId[],
  filters: LibraryFilters,
  groupBy?: { id: string }[],
) {
  const defaults = defaultLibraryFilters();
  let count = ids.filter((id) => filters[id] !== defaults[id]).length;
  if (filters.search.trim()) count += 1;
  if (groupBy?.length && filters.groupBy && filters.groupBy !== groupBy[0]?.id) count += 1;
  return count;
}

const DATE_OPTIONS: { value: DashboardDateRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "month", label: "This month" },
  { value: "ytd", label: "Year to date" },
];

const CHART_COLORS = ["#5A32A3", "#2563EB", "#0D9488", "#EA580C", "#DB2777", "#64748B"];
const FUNNEL_KEYS = [
  { id: "leads", label: "Leads", color: "#5A32A3" },
  { id: "qualified", label: "Qualified", color: "#7C5CBF" },
  { id: "appointments", label: "Appointments", color: "#A78BFA" },
  { id: "deals", label: "Deals", color: "#DDD6FE" },
] as const;
const PRIMARY_FILTERS: ReportFilterId[] = ["dateRange", "team", "owner", "source", "status"];
const FILTER_SELECT =
  "h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px]";
const FILTER_INLINE =
  "h-8 min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-2 text-[12px]";

export function ReportWorkspace({
  categoryId,
  reportId,
}: {
  categoryId: string;
  reportId: string;
}) {
  const def = reportById(reportId);
  const category = categoryById(categoryId);
  const access = reportAccess();
  const [filters, setFilters] = useState<LibraryFilters>(() => ({
    ...defaultLibraryFilters(),
    dateRange: loadLibraryRange(),
  }));
  const [favorite, setFavorite] = useState(false);
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportOpen, setExportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tab, setTab] = useState<"summary" | "detail">("summary");
  const [viz, setViz] = useState<"chart" | "table">("chart");
  const [flash, setFlash] = useState<string | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!def) return;
    touchRecentReport(def.id);
    setFavorite(isFavoriteReport(def.id));
  }, [def?.id]);

  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [moreOpen]);

  const { data: result, error } = useMemo(() => {
    if (!def) return { data: null, error: null };
    try {
      return { data: runLibraryReport(def.id, filters), error: null };
    } catch (err) {
      return {
        data: { kpis: [], rows: [], emptyReason: "The report could not be built." },
        error: err instanceof Error ? err.message : "The report could not be built.",
      };
    }
  }, [def, filters]);

  if (!def || !category || def.category !== category.id) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Report not found.{" "}
        <Link href="/reports" className="text-[#5A32A3] underline">Back to reports</Link>
      </div>
    );
  }

  const columns = def.columns;
  const sorted = [...(result?.rows ?? [])].sort((a, b) => {
    if (!sort) return 0;
    const av = a.cells[sort.id];
    const bv = b.cells[sort.id];
    const an = typeof av === "number" ? av : String(av ?? "");
    const bn = typeof bv === "number" ? bv : String(bv ?? "");
    if (an < bn) return sort.dir === "asc" ? -1 : 1;
    if (an > bn) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function patch(next: Partial<LibraryFilters>) {
    setPage(1);
    setFilters((cur) => ({ ...cur, ...next }));
  }

  const appliedFilters = activeFilterCount(def.filters, filters, def.groupBy);
  const inlineFilters = PRIMARY_FILTERS.filter((id) => def.filters.includes(id));
  const extraFilters = def.filters.filter((id) => !PRIMARY_FILTERS.includes(id));
  const funnelRows = sorted
    .map((row) => ({
      name: String(row.cells.source ?? row.cells.owner ?? row.cells.stage ?? row.id),
      leads: Number(row.cells.leads ?? 0),
      qualified: Number(row.cells.qualified ?? 0),
      appointments: Number(row.cells.appointments ?? 0),
      deals: Number(row.cells.deals ?? 0),
    }))
    .filter((row) => row.leads || row.qualified || row.appointments || row.deals);
  const showFunnel = funnelRows.length > 1 && funnelRows.some((row) => row.qualified || row.appointments || row.deals);
  const from = sorted.length ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(sorted.length, safePage * pageSize);
  const rowNoun = def.id.includes("source") ? "sources" : "rows";

  function clearFilters() {
    setFilters({
      ...defaultLibraryFilters(),
      dateRange: loadLibraryRange(),
      groupBy: def.groupBy?.[0]?.id,
    });
    setPage(1);
  }

  return (
    <div className="min-h-full bg-[#F4F6F9]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 lg:px-6 2xl:px-8 2xl:py-5">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Reports
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h1 className="inline-flex items-center gap-2 text-[22px] font-semibold text-slate-900">
              {def.name}
              <button
                type="button"
                title={favorite ? "Remove from My Favourites" : "Add to My Favourites"}
                onClick={() => {
                  toggleFavoriteReport(def.id);
                  setFavorite(isFavoriteReport(def.id));
                }}
              >
                <Star className={cn("h-4 w-4", favorite ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
              </button>
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">{def.purpose}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {flash ? <span className="text-[11px] font-medium text-emerald-700">{flash}</span> : null}
            <button
              type="button"
              onClick={() => {
                toggleFavoriteReport(def.id);
                setFavorite(isFavoriteReport(def.id));
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Star className={cn("h-3.5 w-3.5", favorite && "fill-amber-400 text-amber-400")} />
              {favorite ? "Favourited" : "Add to Favorites"}
            </button>
            <button
              type="button"
              onClick={() => {
                scheduleLibraryReport(def.id, "Weekly");
                setFlash("Scheduled weekly");
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Schedule Report
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 outline-none">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44 p-1">
                <div className="px-1 py-0.5">
                  <AddToFolderMenu
                    reportId={def.id}
                    refreshKey={favorite ? "fav" : "open"}
                    triggerClassName="h-8 w-full justify-start rounded-md px-1.5 text-slate-700"
                    onAdded={(name) => {
                      setFavorite(isFavoriteReport(def.id));
                      setFlash(`Added to ${name}`);
                    }}
                  />
                </div>
                <DropdownMenuItem
                  className="text-[12px]"
                  onClick={() => {
                    scheduleLibraryReport(def.id, "Monthly");
                    setFlash("Scheduled monthly");
                  }}
                >
                  Schedule monthly
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {access.canExport ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((v) => !v)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#5A32A3] px-2.5 text-[11px] font-semibold text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                  <ChevronDown className="h-3 w-3" />
                </button>
                {exportOpen && result ? (
                  <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <button type="button" className="block w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50" onClick={() => { exportLibraryCsv(def, result); setExportOpen(false); }}>CSV</button>
                    <button type="button" className="block w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50" onClick={() => { exportLibraryExcel(def, result); setExportOpen(false); }}>Excel</button>
                    <button type="button" className="block w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50" onClick={() => { exportLibraryPdf(def, result); setExportOpen(false); }}>PDF</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-wrap items-end gap-2">
            {inlineFilters.map((id) => (
              <label key={id} className="block">
                <span className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  {FILTER_LABELS[id]}
                </span>
                <FilterControl id={id} filters={filters} onChange={patch} compact />
              </label>
            ))}
          </div>
          <div ref={moreRef} className="relative flex items-center gap-2 pb-0.5">
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600"
            >
              <ListFilter className="h-3.5 w-3.5 text-[#5A32A3]" />
              More Filters
              {appliedFilters ? (
                <span className="rounded-full bg-[#5A32A3] px-1.5 text-[10px] font-semibold text-white">
                  {appliedFilters}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-8 items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Filters
            </button>
            {moreOpen ? (
              <div className="absolute top-full right-0 z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                <p className="mb-2 text-[12px] font-semibold text-slate-800">More filters</p>
                <div className="space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-500">Search rows</span>
                    <span className="relative block">
                      <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={filters.search}
                        onChange={(e) => patch({ search: e.target.value })}
                        placeholder="Search in this report"
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-2 pl-7 text-[12px] outline-none"
                      />
                    </span>
                  </label>
                  {extraFilters.map((id) => (
                    <label key={id} className="block">
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">
                        {FILTER_LABELS[id]}
                      </span>
                      <FilterControl id={id} filters={filters} onChange={patch} />
                    </label>
                  ))}
                  {def.groupBy?.length ? (
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">Group by</span>
                      <select
                        value={filters.groupBy ?? def.groupBy[0]?.id ?? ""}
                        onChange={(e) => patch({ groupBy: e.target.value })}
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px]"
                      >
                        {def.groupBy.map((g) => (
                          <option key={g.id} value={g.id}>{g.label}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
          <div className="flex items-center gap-4">
            {(["summary", "detail"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px border-b-2 px-0.5 pb-2 text-[13px] font-semibold",
                  tab === id
                    ? "border-[#5A32A3] text-[#5A32A3]"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                )}
              >
                {id === "summary" ? "Summary" : "Detailed View"}
              </button>
            ))}
          </div>
          {tab === "summary" ? (
            <div className="mb-2 inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViz("chart")}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-semibold",
                  viz === "chart" ? "bg-[#5A32A3] text-white" : "text-slate-500",
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Chart View
              </button>
              <button
                type="button"
                onClick={() => setViz("table")}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-semibold",
                  viz === "table" ? "bg-[#5A32A3] text-white" : "text-slate-500",
                )}
              >
                <Table2 className="h-3.5 w-3.5" />
                Table View
              </button>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div>
        ) : null}

        {tab === "summary" && result?.kpis.length ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {result.kpis.map((item) => {
              const Icon = kpiIcon(item.id);
              return (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-[#5A32A3]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-1 text-[20px] font-semibold text-slate-900">{item.value}</p>
                  {item.hint ? <p className="mt-0.5 text-[11px] text-slate-400">{item.hint}</p> : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {tab === "summary" && viz === "chart" && result?.chart?.points.length ? (
          <div className={cn("grid gap-3", showFunnel ? "xl:grid-cols-2" : "")}>
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-[13px] font-semibold text-slate-900">{result.chart.title}</h3>
              <div className="mt-2 h-56">
                <ReportChart
                  type={result.chart.type}
                  points={result.chart.points}
                  donutTotal={typeof result.kpis[0]?.value === "number" ? result.kpis[0].value : result.chart.points.reduce((n, p) => n + p.value, 0)}
                />
              </div>
            </section>
            {showFunnel ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-[13px] font-semibold text-slate-900">Conversion Funnel by Source</h3>
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelRows} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      {FUNNEL_KEYS.map((key) => (
                        <Bar key={key.id} dataKey={key.id} name={key.label} stackId="funnel" fill={key.color} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                  {FUNNEL_KEYS.map((key) => (
                    <span key={key.id} className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: key.color }} />
                      {key.label}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        <section className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white", tab === "summary" && viz === "chart" ? "" : "")}>
          <div className="px-4 pt-3 pb-1">
            <h3 className="text-[13px] font-semibold text-slate-900">
              {def.id === "lead-source-performance" ? "Source Performance Details" : `${def.name} details`}
            </h3>
          </div>
          <ResizableColumns
            storageKey={`report-library:${def.id}`}
            className="overflow-x-auto"
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
          >
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50/80 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  {columns.map((col) => (
                    <th key={col.id} data-col-id={col.id} className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSort((cur) =>
                            cur?.id === col.id
                              ? { id: col.id, dir: cur.dir === "asc" ? "desc" : "asc" }
                              : { id: col.id, dir: "asc" },
                          )
                        }
                        className="hover:text-slate-800"
                      >
                        {col.label}
                      </button>
                    </th>
                  ))}
                  <th data-col-id="options" className="w-12 min-w-12 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          "px-3 py-2.5 text-slate-700",
                          col.align === "right" && "text-right",
                          col.kind === "badge" && "font-semibold",
                        )}
                      >
                        {col.kind === "badge" ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {formatCell(row.cells[col.id], col.kind)}
                          </span>
                        ) : (
                          formatCell(row.cells[col.id], col.kind)
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-2.5" />
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400">
                      {result?.emptyReason || "No rows match these filters. Try All time or clear owner/team."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ResizableColumns>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
            <span>
              Showing {from} to {to} of {sorted.length} {rowNoun}
            </span>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40">Prev</button>
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-[#5A32A3] px-2 font-semibold text-white">{safePage}</span>
              <button type="button" disabled={safePage >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function kpiIcon(id: string) {
  if (id.includes("qual") || id.includes("qualified")) return BadgeCheck;
  if (id.includes("appt")) return CalendarClock;
  if (id.includes("deal") || id.includes("conv") && id === "deals") return Handshake;
  if (id.includes("conv")) return Percent;
  if (id.includes("value") || id.includes("pipeline") || id.includes("money")) return Wallet;
  return Users;
}

function FilterControl({
  id,
  filters,
  onChange,
  compact,
}: {
  id: ReportFilterId;
  filters: LibraryFilters;
  onChange: (next: Partial<LibraryFilters>) => void;
  compact?: boolean;
}) {
  const campaigns = loadCampaigns();
  const selectClass = compact ? FILTER_INLINE : FILTER_SELECT;
  if (id === "dateRange") {
    return (
      <select
        value={filters.dateRange}
        onChange={(e) => onChange({ dateRange: e.target.value as DashboardDateRange })}
        className={selectClass}
      >
        {DATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (id === "owner") {
    return (
      <select value={filters.owner} onChange={(e) => onChange({ owner: e.target.value })} className={selectClass}>
        {DASHBOARD_OWNERS.map((o) => (
          <option key={o} value={o}>{o === "All" ? "All owners" : o}</option>
        ))}
      </select>
    );
  }
  if (id === "team") {
    return (
      <select value={filters.team} onChange={(e) => onChange({ team: e.target.value })} className={selectClass}>
        {DASHBOARD_TEAMS.map((t) => (
          <option key={t} value={t}>{t === "All teams" ? "All teams" : t}</option>
        ))}
      </select>
    );
  }
  if (id === "loanType" || id === "loanPurpose") {
    return (
      <select
        value={id === "loanType" ? filters.loanType : filters.loanPurpose}
        onChange={(e) => onChange(id === "loanType" ? { loanType: e.target.value as LibraryFilters["loanType"] } : { loanPurpose: e.target.value })}
        className={selectClass}
      >
        {id === "loanType"
          ? DASHBOARD_LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)
          : ["All", "Purchase", "Refinance", "Investment"].map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    );
  }
  if (id === "source") {
    return (
      <select value={filters.source} onChange={(e) => onChange({ source: e.target.value })} className={selectClass}>
        <option value="All">All sources</option>
        {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }
  if (id === "stage") {
    return (
      <select value={filters.stage} onChange={(e) => onChange({ stage: e.target.value })} className={selectClass}>
        <option value="All">All stages</option>
        {LEAD_PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }
  if (id === "campaign") {
    return (
      <select value={filters.campaign} onChange={(e) => onChange({ campaign: e.target.value })} className={selectClass}>
        <option value="All">All campaigns</option>
        {campaigns.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
      </select>
    );
  }
  return (
    <select value={filters.status} onChange={(e) => onChange({ status: e.target.value })} className={selectClass}>
      <option value="All">All statuses</option>
      {["New", "Contacted", "Qualified", "Unqualified", "Converted", "Open", "Won", "Lost", "Requested", "Pending", "Received", "Approved"].map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

function ReportChart({
  type,
  points,
  donutTotal,
}: {
  type: "bar" | "line" | "pie" | "funnel";
  points: { name: string; value: number }[];
  donutTotal?: number;
}) {
  if (type === "pie") {
    const total = donutTotal ?? points.reduce((n, p) => n + p.value, 0);
    return (
      <div className="flex h-full items-center gap-4">
        <div className="relative h-full min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={points} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={1}>
                {points.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[16px] font-semibold text-slate-900">{total.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">Total</p>
          </div>
        </div>
        <ul className="w-36 shrink-0 space-y-1.5 text-[11px] text-slate-600">
          {points.map((point, i) => (
            <li key={point.name} className="flex items-center justify-between gap-2">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="truncate">{point.name}</span>
              </span>
              <span className="font-semibold text-slate-800">{point.value}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#5A32A3" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={points} layout={type === "funnel" ? "vertical" : "horizontal"}>
        {type === "funnel" ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
          </>
        )}
        <Tooltip />
        <Bar dataKey="value" fill="#5A32A3" radius={[4, 4, 4, 4]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
