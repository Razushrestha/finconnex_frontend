"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Home,
  TrendingUp,
  Download,
  Share2,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  ANALYTICS_OWNERS,
  ANALYTICS_PERIODS,
  ANALYTICS_TEAMS,
  getAnalyticsSnapshot,
  type AnalyticsPeriod,
  type AnalyticsTeam,
} from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

export function AnalyticsDashboardClient() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [team, setTeam] = useState<AnalyticsTeam>("All");
  const [owner, setOwner] = useState<string>("All");
  const [compare, setCompare] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const snap = useMemo(
    () => getAnalyticsSnapshot({ period, team, owner }),
    [period, team, owner],
  );

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function exportData() {
    const header = ["KPI", "Value", "Delta"];
    const body = snap.kpis.map((k) =>
      [k.label, k.value, k.delta]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics-kpis.csv";
    a.click();
    URL.revokeObjectURL(url);
    flash("Exported KPI data");
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
          <div className="flex items-center gap-1.5">
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
              <Target className="h-3.5 w-3.5" />
              Compare
            </button>
            <button
              type="button"
              onClick={exportData}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={() => flash("Analytics link copied (mock)")}
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
        </div>

        <div className="mb-3 overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {snap.kpis.map((k) => (
              <div
                key={k.id}
                className="bg-white px-3.5 py-3 transition-colors hover:bg-violet-50/40"
              >
                <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  {k.label}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
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
                    {compare ? " vs prior" : ""}
                  </span>
                </div>
                {k.hint ? (
                  <div className="mt-0.5 text-[10px] text-slate-400">{k.hint}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[12px] font-bold text-slate-800">
              Revenue by month
            </h2>
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
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(v) =>
                      `$${Number(v).toLocaleString("en-AU")}`
                    }
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
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
                    stroke="#cbd5e1"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Benchmark"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[12px] font-bold text-slate-800">
              Revenue by source
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={snap.revenueBySource}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
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

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[12px] font-bold text-slate-800">
              Top performing users
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snap.topUsers} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
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
                  <th className="px-3 py-2 text-right">Deals won</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Activities</th>
                </tr>
              </thead>
              <tbody>
                {snap.topUsers.map((u) => (
                  <tr key={u.name} className="border-t border-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {u.name}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">
                      {u.dealsWon}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
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
    </div>
  );
}
