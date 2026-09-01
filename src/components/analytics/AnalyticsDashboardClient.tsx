"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Share2,
  Target,
  GitCompare,
  ImageDown,
  ChevronRight,
  X,
  MoreHorizontal,
  ChartNoAxesCombined,
  Crown,
  CircleDollarSign,
  Timer,
  Zap,
  ListChecks,
  CircleAlert,
  Mails,
  Megaphone,
  Headset,
  Heart,
  Activity,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  type AnalyticsKpi,
  type AnalyticsPeriod,
  type AnalyticsTeam,
  type BenchmarkMap,
  type RevenuePoint,
} from "@/lib/analytics/types";
import { useCrmAnalytics } from "@/lib/analytics/use-crm-analytics";
import { cn } from "@/lib/utils";

const SOURCE_COLORS = ["#7c3aed", "#0d9488", "#f59e0b", "#38bdf8", "#64748b"];
const OWNER_COLORS = ["#7c3aed", "#0d9488", "#f59e0b", "#38bdf8"];

type KpiChartKind =
  | "ring"
  | "semi"
  | "columns"
  | "bullet"
  | "spark"
  | "hbar"
  | "stack"
  | "donut"
  | "lollipop"
  | "dots";

const KPI_VISUAL: Record<
  string,
  {
    icon: ComponentType<{
      className?: string;
      fill?: string;
      strokeWidth?: number;
    }>;
    tint: string;
    spark: string;
    chart: KpiChartKind;
  }
> = {
  leadConv: {
    icon: ChartNoAxesCombined,
    tint: "bg-violet-50 text-violet-700",
    spark: "#7c3aed",
    chart: "ring",
  },
  winRate: {
    icon: Crown,
    tint: "bg-violet-50 text-violet-700",
    spark: "#d97706",
    chart: "semi",
  },
  avgDeal: {
    icon: CircleDollarSign,
    tint: "bg-violet-50 text-violet-700",
    spark: "#059669",
    chart: "columns",
  },
  cycle: {
    icon: Timer,
    tint: "bg-violet-50 text-violet-700",
    spark: "#0284c7",
    chart: "bullet",
  },
  velocity: {
    icon: Zap,
    tint: "bg-violet-50 text-violet-700",
    spark: "#059669",
    chart: "spark",
  },
  activities: {
    icon: ListChecks,
    tint: "bg-violet-50 text-violet-700",
    spark: "#4f46e5",
    chart: "hbar",
  },
  overdue: {
    icon: CircleAlert,
    tint: "bg-violet-50 text-violet-700",
    spark: "#e11d48",
    chart: "stack",
  },
  emailOpen: {
    icon: Mails,
    tint: "bg-violet-50 text-violet-700",
    spark: "#0284c7",
    chart: "donut",
  },
  campaignRoi: {
    icon: Megaphone,
    tint: "bg-violet-50 text-violet-700",
    spark: "#c026d3",
    chart: "lollipop",
  },
  ticketTime: {
    icon: Headset,
    tint: "bg-violet-50 text-violet-700",
    spark: "#475569",
    chart: "bullet",
  },
  csat: {
    icon: Heart,
    tint: "bg-violet-50 text-violet-700",
    spark: "#0d9488",
    chart: "dots",
  },
};

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
};

function sparkValues(kpi: AnalyticsKpi, months: RevenuePoint[]) {
  const last = months[months.length - 1]?.revenue || 1;
  const base = kpi.numericValue ?? 1;
  return months.map((m, i) => ({
    i,
    v: Number(
      (
        base *
        (0.82 + (m.revenue / last) * 0.22) *
        (1 + (((i + kpi.label.length) % 4) - 1.5) * 0.015)
      ).toFixed(2),
    ),
  }));
}

function MiniSpark({
  data,
  color,
}: {
  data: { i: number; v: number }[];
  color: string;
}) {
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            fill={color}
            fillOpacity={0.16}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, n));
}

function KpiMiniChart({
  kind,
  kpi,
  color,
  target,
  months,
}: {
  kind: KpiChartKind;
  kpi: AnalyticsKpi;
  color: string;
  target?: number;
  months: RevenuePoint[];
}) {
  const value = kpi.numericValue ?? 0;

  if (kind === "spark") {
    return <MiniSpark data={sparkValues(kpi, months)} color={color} />;
  }

  if (kind === "columns") {
    const data = sparkValues(kpi, months);
    return (
      <div className="h-8 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Bar
              dataKey="v"
              fill={color}
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (kind === "ring" || kind === "donut") {
    const pct = clampPct(value);
    const rest = 100 - pct;
    return (
      <div className="flex h-10 items-center gap-2">
        <svg viewBox="0 0 36 36" className="h-10 w-10 shrink-0 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="4"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${pct} ${rest}`}
            pathLength={100}
          />
        </svg>
        {kind === "donut" ? (
          <div className="min-w-0 text-[9px] leading-tight text-slate-400">
            <span className="font-semibold text-slate-600">Opened {pct}%</span>
            <span className="block">Unopened {rest}%</span>
          </div>
        ) : (
          <div className="text-[9px] font-semibold text-slate-400">
            of 100% possible
          </div>
        )}
      </div>
    );
  }

  if (kind === "semi") {
    const pct = clampPct(value);
    const dash = (pct / 100) * 50;
    return (
      <div className="flex h-10 items-end justify-center">
        <svg viewBox="0 0 36 20" className="h-10 w-full max-w-[120px]">
          <path
            d="M4 18 A14 14 0 0 1 32 18"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M4 18 A14 14 0 0 1 32 18"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dash} 100`}
            pathLength={50}
          />
        </svg>
      </div>
    );
  }

  if (kind === "bullet") {
    const max = Math.max(value, target ?? value, 1);
    return (
      <div className="relative mt-1 h-3 w-full rounded-full bg-slate-100">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${clampPct((value / max) * 100)}%`,
            background: color,
            opacity: 0.85,
          }}
        />
        {target != null ? (
          <span
            className="absolute top-[-2px] h-[16px] w-0.5 rounded-full bg-slate-700"
            style={{ left: `${clampPct((target / max) * 100)}%` }}
            title="Target"
          />
        ) : null}
      </div>
    );
  }

  if (kind === "hbar") {
    const pct = target ? clampPct((value / target) * 100) : clampPct(value);
    return (
      <div className="mt-1">
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    );
  }

  if (kind === "stack") {
    const bad = clampPct(value);
    return (
      <div className="mt-1">
        <div className="flex h-2.5 overflow-hidden rounded-full">
          <div className="bg-rose-400" style={{ width: `${bad}%` }} />
          <div className="bg-emerald-400" style={{ width: `${100 - bad}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[8px] font-semibold text-slate-400">
          <span className="text-rose-500">Overdue {bad}%</span>
          <span className="text-emerald-600">On time {100 - bad}%</span>
        </div>
      </div>
    );
  }

  if (kind === "lollipop") {
    const max = Math.max(value, target ?? 1, 3);
    const valueLeft = clampPct((value / max) * 100);
    const breakLeft = clampPct((1 / max) * 100);
    return (
      <div className="relative mt-2 h-4 w-full">
        <div className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 rounded bg-slate-100" />
        <div
          className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded"
          style={{ width: `${valueLeft}%`, background: color }}
        />
        <span
          className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-slate-400"
          style={{ left: `${breakLeft}%` }}
          title="1x break-even"
        />
        <span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${valueLeft}%`, background: color }}
        />
      </div>
    );
  }

  const filled = Math.round((value / 5) * 10) / 2;
  return (
    <div className="mt-1.5 flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const score = i + 1;
        const on = filled >= score;
        const half = !on && filled >= score - 0.5;
        return (
          <span
            key={i}
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              on ? "bg-teal-500" : half ? "bg-teal-300" : "bg-slate-200",
            )}
          />
        );
      })}
      <span className="ml-1 text-[9px] font-semibold text-slate-400">
        {value.toFixed(1)} / 5
      </span>
    </div>
  );
}

function money(n: number) {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export function AnalyticsDashboardClient() {
  const router = useRouter();
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [team, setTeam] = useState<AnalyticsTeam>("All");
  const [owner, setOwner] = useState<string>("All");
  const [compare, setCompare] = useState(false);
  const [benchmarksOpen, setBenchmarksOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [benchmarks, setBenchmarks] = useState<BenchmarkMap>(DEFAULT_BENCHMARKS);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setBenchmarks(loadBenchmarks());
  }, []);

  const live = useCrmAnalytics({ period, team, owner, compare });
  const snap = live.snapshot;

  const priorSnap = useMemo(
    () =>
      compare
        ? getAnalyticsSnapshot({ period, team, owner, priorScale: 0.86 })
        : null,
    [compare, period, team, owner],
  );

  const periodLabel =
    ANALYTICS_PERIODS.find((p) => p.id === period)?.label ?? period;

  const hero = useMemo(() => {
    const months = snap.revenueByMonth;
    const latest = months[months.length - 1];
    const prev = months[months.length - 2];
    const change =
      latest && prev && prev.revenue
        ? ((latest.revenue - prev.revenue) / prev.revenue) * 100
        : 0;
    const win = snap.kpis.find((k) => k.id === "winRate");
    const below = snap.kpis.find(
      (k) => vsBenchmark(k, benchmarks) === "below",
    );
    const pace =
      change >= 0
        ? `Up ${Math.abs(change).toFixed(0)}% vs last month`
        : `Down ${Math.abs(change).toFixed(0)}% vs last month`;
    const second = below
      ? `${below.label} is below target`
      : win
        ? `Win rate ${win.value}`
        : "On track vs last period";
    return {
      latest,
      change,
      headline: latest ? money(latest.revenue) : "—",
      month: latest?.month ?? "",
      sentence: `${pace} · ${second}`,
    };
  }, [snap, benchmarks]);

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
<p class="badge">FinConnex · Analytics</p>
<h1>Performance dashboard</h1>
<p class="meta">${periodLabel} · Team ${team} · Owner ${owner}${compare ? " · vs prior period" : ""}</p>
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

  const sourceTotal = snap.revenueBySource.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="relative h-auto w-full min-h-full shrink-0 overflow-y-auto bg-slate-50 pb-10">
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-[1920px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                live.source === "api"
                  ? "bg-violet-50 text-violet-700"
                  : live.source === "mixed"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-500",
              )}
            >
              {live.loading
                ? "Loading CRM…"
                : live.source === "api"
                  ? "Live CRM"
                  : live.source === "mixed"
                    ? "Live + demo"
                    : "Demo"}
            </span>
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
              Compare
            </button>
            <button
              type="button"
              onClick={() => setBenchmarksOpen(true)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Target className="h-3.5 w-3.5" />
              Benchmarks
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                More
              </button>
              {moreOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setMoreOpen(false);
                      exportAnalyticsCsv(snap, {
                        period: periodLabel,
                        team,
                        owner,
                        compare,
                      });
                      flash("Exported dashboard data");
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export data
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setMoreOpen(false);
                      exportChartPack();
                    }}
                  >
                    <ImageDown className="h-3.5 w-3.5" />
                    Export chart
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setMoreOpen(false);
                      share();
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share link
                  </button>
                </div>
              ) : null}
            </div>
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

        <div className="mb-3 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/70 p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                <Activity className="h-3.5 w-3.5 text-violet-500" />
                {periodLabel} · Team {team} · {owner === "All" ? "All owners" : owner}
              </div>
              <p className="mt-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Revenue {hero.month ? `· ${hero.month}` : ""}
              </p>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                <span className="text-[28px] font-bold tracking-tight text-slate-900">
                  {hero.headline}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    hero.change >= 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-600",
                  )}
                >
                  {hero.change >= 0 ? "+" : ""}
                  {hero.change.toFixed(1)}%
                </span>
              </div>
              <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-slate-600">
                {hero.sentence}
              </p>
            </div>
            <div className="h-24 min-h-[96px]">
              {live.loading ? (
                <div className="h-full animate-pulse rounded-xl bg-violet-100/60" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={snap.revenueByMonth}
                    margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="heroRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#7c3aed"
                      strokeWidth={2.2}
                      fill="url(#heroRev)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {live.loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[148px] animate-pulse rounded-2xl border border-slate-100 bg-white"
                />
              ))
            : snap.kpis.map((k, idx) => {
                const prior = priorSnap?.kpis[idx];
                const bench = vsBenchmark(k, benchmarks);
                const visual = KPI_VISUAL[k.id] ?? KPI_VISUAL.leadConv;
                const Icon = visual.icon;
                const target = benchmarks[k.id];
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => router.push(k.drillHref)}
                    className="group rounded-2xl border border-slate-100/90 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-xl",
                          visual.tint,
                        )}
                      >
                        <Icon
                          className="h-4 w-4"
                          fill="currentColor"
                          strokeWidth={1.75}
                        />
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition group-hover:opacity-100 group-hover:text-violet-500" />
                    </div>
                    <div className="mt-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      {k.label}
                    </div>
                    <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                      <span className="text-[18px] font-bold tracking-tight text-slate-900">
                        {k.value}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                          k.deltaPositive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-600",
                        )}
                      >
                        {k.delta}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <KpiMiniChart
                        kind={visual.chart}
                        kpi={k}
                        color={visual.spark}
                        target={target}
                        months={snap.revenueByMonth}
                      />
                    </div>
                    {compare && prior ? (
                      <div className="mt-1 text-[10px] text-sky-600">
                        Prior: {prior.value}
                      </div>
                    ) : null}
                    {target != null && visual.chart !== "dots" ? (
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
                        Target {formatBenchmark(k, target)} ·{" "}
                        {bench === "above"
                          ? "On track"
                          : bench === "below"
                            ? "Below"
                            : "At target"}
                      </div>
                    ) : k.hint ? (
                      <div className="mt-0.5 text-[10px] text-slate-400">
                        {k.hint}
                      </div>
                    ) : null}
                  </button>
                );
              })}
        </div>

        <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[12px] font-bold text-slate-800">
                Revenue by month
              </h2>
              <span className="text-[10px] text-slate-400">
                Area = actual · Dashed = benchmark
                {compare ? " · Thin = prior" : ""}
              </span>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snap.revenueByMonth}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 8"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
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
                    formatter={(v) => money(Number(v))}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#7c3aed"
                    strokeWidth={2.4}
                    fill="url(#revFill)"
                    name="Revenue"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="target"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    fill="none"
                    name="Benchmark"
                    dot={false}
                  />
                  {compare ? (
                    <Area
                      type="monotone"
                      dataKey="prior"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      fill="none"
                      name="Prior period"
                      dot={false}
                    />
                  ) : null}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-[12px] font-bold text-slate-800">
                Revenue by source
              </h2>
              <div className="flex items-center gap-3">
                <div className="h-36 w-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={snap.revenueBySource}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={56}
                        paddingAngle={3}
                      >
                        {snap.revenueBySource.map((_, i) => (
                          <Cell
                            key={i}
                            fill={SOURCE_COLORS[i % SOURCE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => `${v}%`}
                        contentStyle={TOOLTIP_STYLE}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="min-w-0 flex-1 space-y-1.5">
                  {snap.revenueBySource.map((s, i) => (
                    <li
                      key={s.name}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background:
                              SOURCE_COLORS[i % SOURCE_COLORS.length],
                          }}
                        />
                        <span className="truncate">{s.name}</span>
                      </span>
                      <span className="font-semibold text-slate-800">
                        {s.value}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Mix of {sourceTotal}% attributed sources
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <h2 className="text-[12px] font-bold text-slate-800">
                  Top performing users
                </h2>
              </div>
              <ul className="divide-y divide-slate-50">
                {snap.topUsers.map((u) => (
                  <li key={u.name}>
                    <button
                      type="button"
                      onClick={() => router.push(u.href)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-violet-50/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold text-slate-800">
                          {u.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {u.dealsWon} won · {u.activities} acts
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] font-bold text-slate-900">
                        {money(u.revenue)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-[12px] font-bold text-slate-800">
              Revenue by owner
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snap.revenueByOwner} margin={{ left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="4 8"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-18}
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
                    formatter={(v) => money(Number(v))}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} name="Revenue">
                    {snap.revenueByOwner.map((_, i) => (
                      <Cell
                        key={i}
                        fill={OWNER_COLORS[i % OWNER_COLORS.length]}
                      />
                    ))}
                  </Bar>
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
                      {money(u.revenue)}
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
