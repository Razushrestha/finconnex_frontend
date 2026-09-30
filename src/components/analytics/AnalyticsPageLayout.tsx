"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgePercent,
  Funnel,
  Handshake,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import {
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
import { formatCurrency, type DashboardDateRange } from "@/lib/dashboard/layout";
import type { SectionPageModel } from "@/lib/analytics/section-page";
import { DashboardDateRangePicker } from "@/components/dashboard/DashboardDateRangePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const SOURCE_COLORS = ["#5B6CFF", "#F59E0B", "#22D3EE", "#22C55E", "#8B5CF6", "#F43F5E"];

export const ANALYTICS_KPI_WRAP = [
  "bg-[#EDE9FE] text-[#6D5CE7]",
  "bg-[#E0F2FE] text-[#0EA5E9]",
  "bg-[#DCFCE7] text-[#16A34A]",
  "bg-[#FFEDD5] text-[#EA580C]",
  "bg-[#F3E8FF] text-[#9333EA]",
  "bg-[#E0E7FF] text-[#4F46E5]",
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
  return (
    <p
      className={cn(
        "mt-3 text-[11px] font-medium",
        value > 0 ? "text-emerald-500" : value < 0 ? "text-rose-500" : "text-slate-400",
      )}
    >
      {value > 0 ? "↑" : value < 0 ? "↓" : "→"}{" "}
      {value > 0 ? "+" : ""}
      {Math.abs(value)}
      {points ? " pts" : "%"} vs {previous}
      {vs ? ` ${vs}` : ""}
    </p>
  );
}

function MiniSpark({ values }: { values: number[] }) {
  const points = (values.length ? values : [0, 0, 0, 0]).map((value, i) => ({ i, value }));
  return (
    <div className="h-6 w-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Line type="monotone" dataKey="value" stroke="#C4B5FD" strokeWidth={1.6} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-white/80 bg-white p-4 shadow-[0_8px_24px_rgba(99,102,241,0.06)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-[14px] font-semibold text-slate-800">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
      <div className="relative mb-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F0FF] text-[#B4A7F5]">
          <span className="relative">
            <span className="block h-9 w-8 rounded-md border-2 border-current" />
            <Search className="absolute -bottom-1 -right-2 h-5 w-5" />
          </span>
        </span>
      </div>
      <p className="text-[12px] text-slate-400">{message}</p>
    </div>
  );
}

export function AnalyticsPageLayout({
  kpiIcons,
  filters,
  onFilters,
  data,
}: {
  kpiIcons: LucideIcon[];
  filters: { dateRange: DashboardDateRange; dateFrom?: string; dateTo?: string };
  onFilters: (next: Partial<{ dateRange: DashboardDateRange; dateFrom?: string; dateTo?: string }>) => void;
  data: SectionPageModel;
}) {
  const vs = data.comparisonShort;
  const liveSlices = data.slices.filter((slice) => slice.value > 0);

  return (
    <div className="min-h-full bg-[#F4F6FB]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-5 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/analytics"
            className="inline-flex w-fit items-center gap-1 text-[12px] font-semibold text-[#6D5CE7] hover:text-[#4F46E5]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Analytics
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-full border border-violet-100 bg-white px-3 text-[12px] font-semibold text-[#6D5CE7] outline-none hover:bg-violet-50">
              <Funnel className="h-3.5 w-3.5" />
              Filter
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48 p-1">
              <DashboardDateRangePicker
                filters={filters}
                onChange={(next) => onFilters(next)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          {data.kpis.map((kpi, index) => {
            const Icon = kpiIcons[index] ?? TrendingUp;
            return (
              <div
                key={kpi.id}
                className="rounded-[22px] border border-white bg-white p-4 shadow-[0_8px_24px_rgba(99,102,241,0.06)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        ANALYTICS_KPI_WRAP[index] ?? ANALYTICS_KPI_WRAP[0],
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="text-[13px] font-medium text-slate-500">{kpi.label}</p>
                  </div>
                  <MiniSpark values={kpi.spark ?? []} />
                </div>
                <p className="mt-3 text-[28px] font-semibold tracking-tight text-slate-900">
                  {kpi.value}
                </p>
                <Delta
                  value={kpi.delta}
                  previous={kpi.previous}
                  vs={vs}
                  points={kpi.points}
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]">
          <Card
            title={data.trendTitle}
            icon={<TrendingUp className="h-4 w-4 text-[#6D5CE7]" />}
            action={
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#6D5CE7]" /> {data.primaryLegend}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> {data.secondaryLegend}
                </span>
              </div>
            }
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF2F7" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value, name) => {
                      const n = Number(value ?? 0);
                      if (name === "primary" && data.primaryMoney) return formatCurrency(n);
                      if (name === "secondary" && data.secondaryMoney) return formatCurrency(n);
                      return n;
                    }}
                  />
                  <Line type="monotone" dataKey="primary" name="primary" stroke="#6D5CE7" strokeWidth={2} dot={{ r: 4, fill: "#6D5CE7", strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="secondary" name="secondary" stroke="#22C55E" strokeWidth={2} dot={{ r: 4, fill: "#22C55E", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title={data.sliceTitle} icon={<BadgePercent className="h-4 w-4 text-[#6D5CE7]" />}>
            {data.sliceTotal ? (
              <div className="flex h-[220px] flex-col items-center">
                <div className="relative h-36 w-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={liveSlices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={60}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {liveSlices.map((slice, i) => (
                          <Cell key={slice.name} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[14px] font-semibold text-slate-900">
                      {data.sliceMoney ? formatCurrency(data.sliceTotal) : data.sliceTotal}
                    </p>
                    <p className="text-[10px] text-slate-400">{data.sliceCenter}</p>
                  </div>
                </div>
                <ul className="mt-2 w-full space-y-1">
                  {liveSlices.map((slice, i) => (
                    <li key={slice.name} className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                        />
                        {slice.name}
                      </span>
                      <span>
                        {data.sliceMoney ? formatCurrency(slice.value) : slice.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState message={data.sliceEmpty} />
            )}
          </Card>

          <Card title={data.funnelTitle} icon={<Funnel className="h-4 w-4 text-[#6D5CE7]" />}>
            <div className="space-y-3">
              {data.funnel.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-semibold text-slate-700">
                      {row.value} · {row.pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-violet-50">
                    <div
                      className="h-full rounded-full bg-[#6D5CE7]"
                      style={{ width: `${Math.max(row.pct, row.value ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[12px] text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Handshake className="h-4 w-4 text-[#6D5CE7]" />
                {data.funnelFooterLabel}
              </span>
              <span className="font-semibold text-slate-800">{data.funnelFooterValue}</span>
            </div>
          </Card>
        </div>

        <Card title={data.listTitle} icon={<Users className="h-4 w-4 text-[#6D5CE7]" />}>
          {data.list.length ? (
            <div className="space-y-3">
              {data.list.map((row) => (
                <div key={row.name}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-slate-700">{row.name}</span>
                    <span className="font-semibold text-slate-900">{row.detail}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-violet-50">
                    <div
                      className="h-full rounded-full bg-[#6D5CE7]"
                      style={{ width: `${Math.max(8, row.bar)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[120px] flex-col items-center justify-center py-6">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F0FF] text-[#C4B5FD]">
                <Users className="h-5 w-5" />
              </span>
              <p className="text-[12px] text-slate-400">{data.listEmpty}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
