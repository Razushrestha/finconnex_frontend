"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgePercent,
  Funnel,
  Handshake,
  RefreshCw,
  Settings2,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/dashboard/layout";
import {
  computeBusinessAnalytics,
  type BusinessAnalyticsFilters,
} from "@/lib/analytics/business";
import { DashboardDateRangePicker } from "@/components/dashboard/DashboardDateRangePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const SOURCE_COLORS = ["#5A32A3", "#0D9488", "#F59E0B", "#2563EB", "#DB2777", "#64748B"];
const FUNNEL_COLORS = ["#5A32A3", "#6D3FB8", "#7C4CC4", "#9B6FDB"];
const KPI_ICONS = [
  { icon: UserPlus, className: "bg-violet-50 text-[#5A32A3]" },
  { icon: Funnel, className: "bg-sky-50 text-sky-600" },
  { icon: Wallet, className: "bg-emerald-50 text-emerald-600" },
  { icon: Handshake, className: "bg-orange-50 text-orange-600" },
  { icon: BadgePercent, className: "bg-violet-50 text-[#5A32A3]" },
  { icon: TrendingUp, className: "bg-indigo-50 text-indigo-600" },
];

function Delta({
  value,
  previous,
  vs,
  points,
}: {
  value: number;
  previous: string;
  vs: string;
  points?: boolean;
}) {
  const up = value > 0;
  return (
    <p
      className={cn(
        "mt-2 text-[11px] font-semibold",
        up ? "text-emerald-600" : value < 0 ? "text-rose-500" : "text-slate-400",
      )}
    >
      {value > 0 ? "↑" : value < 0 ? "↓" : "→"} {Math.abs(value)}
      {points ? " pts" : "%"} vs {previous}
      {vs ? ` ${vs}` : ""}
    </p>
  );
}

function Card({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function BusinessAnalytics() {
  const [filters, setFilters] = useState<BusinessAnalyticsFilters>({
    dateRange: "this-year",
    owner: "All",
  });
  const [tick, setTick] = useState(0);
  const now = useMemo(() => new Date(), [tick]);
  const data = useMemo(() => computeBusinessAnalytics(filters, now), [filters, now]);
  const maxOwnerRevenue = Math.max(1, ...data.owners.map((row) => row.revenue));

  return (
    <div className="min-h-full bg-[#F4F6F9]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 lg:px-6 2xl:px-8 2xl:py-5">
        <Link
          href="/analytics"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Analytics
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900">Business Analytics</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Overall growth, KPIs, revenue, settlements, conversion and business trends.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Manage analytics"
              title="Manage analytics"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#5A32A3] outline-none hover:bg-violet-50"
            >
              <Settings2 className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem className="text-[13px]" onClick={() => setTick((n) => n + 1)}>
                <RefreshCw className="h-4 w-4 text-[#5A32A3]" />
                Refresh data
              </DropdownMenuItem>
              <DashboardDateRangePicker
                filters={filters}
                onChange={(next) =>
                  setFilters((current) => ({
                    ...current,
                    ...next,
                    owner: current.owner,
                  }))
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          {data.kpis.map((kpi, index) => {
            const visual = KPI_ICONS[index] ?? KPI_ICONS[0];
            const Icon = visual.icon;
            return (
              <div key={kpi.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", visual.className)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-[12px] font-semibold text-slate-700">{kpi.label}</p>
                </div>
                <p className="mt-3 text-[22px] font-bold tracking-tight text-slate-900">{kpi.value}</p>
                <Delta value={kpi.delta} previous={kpi.previous} vs={data.comparisonShort} points={kpi.points} />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <Card title="Revenue & growth trend" className="xl:col-span-2">
            <div className="h-64">
              {data.trend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.trend}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value, name) =>
                        name === "revenue" ? formatCurrency(Number(value ?? 0)) : Number(value ?? 0)
                      }
                    />
                    <Bar yAxisId="left" dataKey="revenue" name="revenue" fill="#5A32A3" radius={[3, 3, 0, 0]} />
                    <Line yAxisId="right" dataKey="leads" name="leads" stroke="#2563EB" strokeWidth={2} dot={false} />
                    <Line
                      yAxisId="right"
                      dataKey="settlements"
                      name="settlements"
                      stroke="#0D9488"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-[12px] text-slate-400">
                  No trend data in this range.
                </p>
              )}
            </div>
          </Card>
          <Card title="Revenue by source">
            <div className="flex h-64 flex-col items-center justify-center">
              {data.sourceTotal ? (
                <>
                  <div className="relative h-40 w-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.sources} dataKey="revenue" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2}>
                          {data.sources.map((slice, i) => (
                            <Cell key={slice.name} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[14px] font-bold text-slate-900">{formatCurrency(data.sourceTotal)}</p>
                      <p className="text-[10px] text-slate-500">Settled</p>
                    </div>
                  </div>
                  <ul className="mt-2 w-full space-y-1">
                    {data.sources.map((slice, i) => (
                      <li key={slice.name} className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                          />
                          {slice.name}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {slice.deals} · {Math.round((slice.revenue / data.sourceTotal) * 1000) / 10}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-[12px] text-slate-400">No settlements in this range.</p>
              )}
            </div>
          </Card>
          <Card title="Conversion funnel">
            <div className="space-y-2.5">
              {data.funnel.map((row, i) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-600">{row.label}</span>
                    <span className="font-semibold text-slate-800">
                      {row.value} · {row.pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(row.pct, row.value ? 6 : 0)}%`,
                        backgroundColor: FUNNEL_COLORS[i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-slate-500">
              Avg settled deal {data.avgDeal}
              {data.avgDealDelta ? ` (${data.avgDealDelta > 0 ? "+" : ""}${data.avgDealDelta}% vs last period)` : ""}.
            </p>
          </Card>
        </div>

        <Card title="Settlements by owner">
          {data.owners.length ? (
            <div className="space-y-3">
              {data.owners.map((row) => (
                <div key={row.name}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-slate-700">{row.name}</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(row.revenue)} · {row.settlements} settled
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#5A32A3]"
                      style={{ width: `${Math.max(6, (row.revenue / maxOwnerRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-slate-400">No settlements in this range.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
