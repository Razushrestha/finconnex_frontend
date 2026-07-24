"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  TrendingUp,
  Download,
  Share2,
  Target,
  GitCompare,
  ImageDown,
  ChevronRight,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  ANALYTICS_OWNERS,
  ANALYTICS_PERIODS,
  ANALYTICS_TEAMS,
  DEFAULT_BENCHMARKS,
  exportAnalyticsCsv,
  formatBenchmark,
  getAnalyticsSnapshot,
  loadBenchmarks,
  saveBenchmarks,
  vsBenchmark,
  type AnalyticsPeriod,
  type AnalyticsTeam,
  type BenchmarkMap,
} from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

export function AnalyticsDashboardClient() {
  const router = useRouter();
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [team, setTeam] = useState<AnalyticsTeam>("All");
  const [owner, setOwner] = useState<string>("All");
  const [compare, setCompare] = useState(false);
  const [benchmarksOpen, setBenchmarksOpen] = useState(false);
  const [benchmarks, setBenchmarks] = useState<BenchmarkMap>(DEFAULT_BENCHMARKS);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setBenchmarks(loadBenchmarks());
  }, []);

  const snap = useMemo(
    () => getAnalyticsSnapshot({ period, team, owner }),
    [period, team, owner],
  );

  const priorSnap = useMemo(
    () =>
      compare
        ? getAnalyticsSnapshot({ period, team, owner, priorScale: 0.86 })
        : null,
    [compare, period, team, owner],
  );

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function share() {
    const url = `${window.location.origin}/analytics?period=${period}&team=${team}&owner=${encodeURIComponent(owner)}`;
    void navigator.clipboard?.writeText(url);
    flash("Analytics link copied");
  }

  function exportChartPack() {
    // Lightweight “chart export”: HTML snapshot printable / save as PDF
    const rows = snap.kpis
      .map(
        (k) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${k.label}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:700">${k.value}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:${k.deltaPositive ? "#059669" : "#e11d48"}">${k.delta}</td></tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Analytics</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;color:#0f172a}
h1{font-size:20px;margin:0}.meta{color:#64748b;font-size:12px;margin:8px 0 20px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px;border-bottom:2px solid #cbd5e1;color:#64748b;font-size:11px;text-transform:uppercase}
.badge{display:inline-block;background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}</style></head><body>
<p class="badge">FinConnex · §15 Analytics</p>
<h1>Performance dashboard</h1>
<p class="meta">${ANALYTICS_PERIODS.find((p) => p.id === period)?.label} · Team ${team} · Owner ${owner}${compare ? " · vs prior period" : ""}</p>
<table><thead><tr><th>KPI</th><th>Value</th><th>Delta</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    flash("Chart pack opened: print / save as PDF");
  }

  function persistBenchmarks(next: BenchmarkMap) {
    setBenchmarks(next);
    saveBenchmarks(next);
  }

  const periodLabel =
    ANALYTICS_PERIODS.find((p) => p.id === period)?.label ?? period;

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
              Analytics
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <TrendingUp className="h-2.5 w-2.5" />
              §15
            </span>
            {compare ? (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700">
                vs prior period
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setCompare((v) => !v);
                flash(compare ? "Compare off" : "Comparing to prior period");
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold",
                compare
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-600",
              )}
            >
              <GitCompare className="h-3.5 w-3.5" />
              Compare periods
            </button>
            <button
              type="button"
              onClick={() => setBenchmarksOpen(true)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Target className="h-3.5 w-3.5" />
              Benchmarks
            </button>
            <button
              type="button"
              onClick={() => {
                exportAnalyticsCsv(snap, {
                  period: periodLabel,
                  team,
                  owner,
                  compare,
                });
                flash("Exported dashboard data");
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Download className="h-3.5 w-3.5" />
              Export data
            </button>
            <button
              type="button"
              onClick={exportChartPack}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <ImageDown className="h-3.5 w-3.5" />
              Export chart
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {ANALYTICS_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                period === p.id
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {p.label}
            </button>
          ))}
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value as AnalyticsTeam)}
            className="ml-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
          >
            {ANALYTICS_TEAMS.map((t) => (
              <option key={t} value={t}>
                Team: {t}
              </option>
            ))}
          </select>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
          >
            {ANALYTICS_OWNERS.map((o) => (
              <option key={o} value={o}>
                Owner: {o}
              </option>
            ))}
          </select>
          <span className="ml-auto text-[10px] text-slate-400">
            Click a KPI to drill down
          </span>
        </div>

        {/* KPI grid */}
        <div className="mb-3 overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 lg:grid-cols-4">
            {snap.kpis.map((k, idx) => {
              const prior = priorSnap?.kpis[idx];
              const bench = vsBenchmark(k, benchmarks);
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => router.push(k.drillHref)}
                  className="group bg-white px-3.5 py-3 text-left transition-colors hover:bg-violet-50/50"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      {k.label}
                    </div>
                    <ChevronRight className="h-3 w-3 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 group-hover:text-violet-500" />
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-[18px] font-bold tracking-tight text-slate-900">
                      {k.value}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        k.deltaPositive ? "text-emerald-600" : "text-rose-500",
                      )}
                    >
                      {k.delta}
                    </span>
                  </div>
                  {compare && prior ? (
                    <div className="mt-0.5 text-[10px] text-sky-600">
                      Prior: {prior.value}
                    </div>
                  ) : null}
                  {bench ? (
                    <div
                      className={cn(
                        "mt-1 text-[9px] font-semibold",
                        bench === "above"
                          ? "text-emerald-600"
                          : bench === "below"
                            ? "text-rose-500"
                            : "text-slate-400",
                      )}
                    >
                      Target {formatBenchmark(k, benchmarks[k.id]!)} ·{" "}
                      {bench === "above"
                        ? "On track"
                        : bench === "below"
                          ? "Below"
                          : "At target"}
                    </div>
                  ) : null}
                  {k.hint && !bench ? (
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {k.hint}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[12px] font-bold text-slate-800">
                Revenue by month
              </h2>
              <span className="text-[10px] text-slate-400">
                Solid = actual · Dashed = benchmark
                {compare ? " · Thin = prior" : ""}
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snap.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(v) => `$${Number(v).toLocaleString("en-AU")}`}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={false}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Benchmark"
                  />
                  {compare ? (
                    <Line
                      type="monotone"
                      dataKey="prior"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      dot={false}
                      name="Prior period"
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[12px] font-bold text-slate-800">
              Revenue by source
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={snap.revenueBySource}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={2}
                  >
                    {snap.revenueBySource.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => `${v}%`}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {snap.revenueBySource.map((s, i) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-500"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {s.name} {s.value}%
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[12px] font-bold text-slate-800">
              Revenue by owner
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snap.revenueByOwner} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(v) => `$${Number(v).toLocaleString("en-AU")}`}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[12px] font-bold text-slate-800">
              Top performing users
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={snap.topUsers}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    horizontal={false}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => Number(v).toLocaleString("en-AU")}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Bar
                    dataKey="dealsWon"
                    fill="#7c3aed"
                    radius={[0, 4, 4, 0]}
                    name="Deals won"
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-[12px] font-bold text-slate-800">
                Performance table
              </h2>
            </div>
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2">User</th>
                  <th className="px-2 py-2 text-right">Won</th>
                  <th className="px-2 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Acts</th>
                </tr>
              </thead>
              <tbody>
                {snap.topUsers.map((u) => (
                  <tr
                    key={u.name}
                    className="cursor-pointer border-t border-slate-50 hover:bg-violet-50/40"
                    onClick={() => router.push(u.href)}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {u.name}
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-600">
                      {u.dealsWon}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-slate-900">
                      ${u.revenue.toLocaleString("en-AU")}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {u.activities}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Benchmarks drawer */}
      {benchmarksOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
          <button
            type="button"
            className="flex-1"
            aria-label="Close"
            onClick={() => setBenchmarksOpen(false)}
          />
          <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-[14px] font-bold text-slate-900">
                  Set benchmarks
                </h2>
                <p className="text-[11px] text-slate-500">
                  Targets shown under each KPI
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBenchmarksOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {snap.kpis.map((k) => (
                <label key={k.id} className="block">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {k.label}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={benchmarks[k.id] ?? ""}
                    onChange={(e) =>
                      persistBenchmarks({
                        ...benchmarks,
                        [k.id]: Number(e.target.value),
                      })
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
                  />
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    Current {k.value}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => {
                  persistBenchmarks({ ...DEFAULT_BENCHMARKS });
                  flash("Benchmarks reset");
                }}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-600"
              >
                Reset defaults
              </button>
              <button
                type="button"
                onClick={() => {
                  setBenchmarksOpen(false);
                  flash("Benchmarks saved");
                }}
                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-violet-600 text-[12px] font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
