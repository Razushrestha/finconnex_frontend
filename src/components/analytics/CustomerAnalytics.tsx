"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Funnel,
  Mail,
  Phone,
  RefreshCw,
  Repeat,
  Settings2,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/dashboard/layout";
import {
  computeCustomerAnalytics,
  type CustomerAnalyticsFilters,
} from "@/lib/analytics/customers";
import { DashboardDateRangePicker } from "@/components/dashboard/DashboardDateRangePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const SOURCE_COLORS = ["#5A32A3", "#0D9488", "#F59E0B", "#2563EB", "#DB2777", "#64748B"];
const FUNNEL_COLORS = ["#5A32A3", "#6D3FB8", "#7C4CC4", "#9B6FDB", "#C4A6F0"];
const KPI_ICONS = [
  { icon: UserPlus, className: "bg-violet-50 text-[#5A32A3]" },
  { icon: Funnel, className: "bg-sky-50 text-sky-600" },
  { icon: Users, className: "bg-emerald-50 text-emerald-600" },
  { icon: Repeat, className: "bg-orange-50 text-orange-600" },
  { icon: Sparkles, className: "bg-violet-50 text-[#5A32A3]" },
  { icon: Wallet, className: "bg-indigo-50 text-indigo-600" },
];

function Delta({ value, previous, vs, points }: { value: number; previous: string; vs: string; points?: boolean }) {
  const up = value > 0;
  return (
    <p className={cn("mt-2 text-[11px] font-semibold", up ? "text-emerald-600" : value < 0 ? "text-rose-500" : "text-slate-400")}>
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

function Gauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="relative mx-auto h-36 w-36">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[{ name: "done", value: pct }, { name: "rest", value: 100 - pct }]}
            dataKey="value"
            startAngle={210}
            endAngle={-30}
            innerRadius={48}
            outerRadius={62}
            stroke="none"
          >
            <Cell fill="#5A32A3" />
            <Cell fill="#E2E8F0" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
        <p className="text-[22px] font-bold text-slate-900">{pct}%</p>
        <p className="text-[10px] font-medium text-slate-500">Repeat Business Rate</p>
      </div>
    </div>
  );
}

export function CustomerAnalytics() {
  const [filters, setFilters] = useState<CustomerAnalyticsFilters>({
    dateRange: "this-year",
    owner: "All",
    source: "All",
  });
  const [tick, setTick] = useState(0);
  const now = useMemo(() => new Date(), [tick]);
  const data = useMemo(() => computeCustomerAnalytics(filters, now), [filters, now]);

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
            <h1 className="text-[22px] font-semibold text-slate-900">Customer Analytics</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Understand your customers across acquisition, engagement, conversion, retention and value.
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
                    owner: "All",
                    source: "All",
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
          <Card title="Customer Acquisition Trend" className="xl:col-span-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.acquisition}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="newCustomers" name="New Customers" fill="#5A32A3" radius={[3, 3, 0, 0]} />
                  <Line dataKey="cumulative" name="Cumulative Customers" stroke="#2563EB" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Customer Source">
            <div className="flex h-64 flex-col items-center justify-center">
              {data.sourceTotal ? (
                <>
                  <div className="relative h-40 w-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.sources} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2}>
                          {data.sources.map((slice, i) => (
                            <Cell key={slice.name} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[18px] font-bold text-slate-900">{data.sourceTotal}</p>
                      <p className="text-[10px] text-slate-500">New Customers</p>
                    </div>
                  </div>
                  <ul className="mt-2 w-full space-y-1">
                    {data.sources.map((slice, i) => (
                      <li key={slice.name} className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                          {slice.name}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {slice.value} · {data.sourceTotal ? Math.round((slice.value / data.sourceTotal) * 1000) / 10 : 0}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-[12px] text-slate-400">No new customers in this range.</p>
              )}
            </div>
          </Card>
          <Card title="Customer Conversion Funnel">
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
                      style={{ width: `${Math.max(row.pct, row.value ? 6 : 0)}%`, backgroundColor: FUNNEL_COLORS[i] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card title="Customer Engagement">
            <div className="grid grid-cols-2 gap-2">
              {data.engagement.map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-[20px] font-bold text-slate-900">{item.value.toLocaleString("en-AU")}</p>
                  <p className={cn("mt-1 text-[11px] font-semibold", item.delta >= 0 ? "text-emerald-600" : "text-rose-500")}>
                    {item.delta >= 0 ? "↑" : "↓"} {Math.abs(item.delta)}%
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> Voice</span>
            </div>
          </Card>
          <Card title="Customer Retention Trend">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.retentionTrend}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Line type="monotone" dataKey="retention" name="Retention" stroke="#5A32A3" strokeWidth={2.4} dot={{ r: 3, fill: "#5A32A3" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Repeat Business">
            <div className="flex items-center gap-3">
              <Gauge value={data.repeatRate} />
              <div className="grid flex-1 gap-2">
                <div className="rounded-xl bg-violet-50 px-3 py-3">
                  <p className="text-[11px] text-slate-500">Repeat Customers</p>
                  <p className="text-[20px] font-bold text-slate-900">{data.repeatCustomers}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] text-slate-500">Repeat Deals</p>
                  <p className="text-[20px] font-bold text-slate-900">{data.repeatDeals}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card
            title="Top Customers by Lifetime Value"
            className="xl:col-span-2"
            action={
              <Link href="/sales/contacts" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#5A32A3]">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Total Deals</th>
                    <th className="pb-2">Total Settlements</th>
                    <th className="pb-2">Total Revenue</th>
                    <th className="pb-2">Avg. Revenue / Deal</th>
                    <th className="pb-2">Customer Since</th>
                    <th className="pb-2">Lifetime Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCustomers.length ? data.topCustomers.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-2">
                          <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold", row.avatar)}>
                            {row.initials}
                          </span>
                          <Link href={`/sales/contacts/detail/${row.id}`} className="font-semibold text-slate-800 hover:text-[#5A32A3]">
                            {row.name}
                          </Link>
                        </span>
                      </td>
                      <td>{row.deals}</td>
                      <td>{row.settlements}</td>
                      <td>{formatCurrency(row.revenue)}</td>
                      <td>{formatCurrency(row.avgRevenue)}</td>
                      <td>{row.since}</td>
                      <td>
                        <div className="min-w-28">
                          <p className="font-semibold text-slate-800">{formatCurrency(row.lifetimeValue)}</p>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(8, row.bar)}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No customer value in this range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Customer Value Distribution">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.distribution}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="customers" name="Customers" fill="#5A32A3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <p>All comparisons are based on the previous period selected. Data is refreshed from live CRM records.</p>
          <p className="inline-flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Data as of {data.asOf.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      </div>
    </div>
  );
}
