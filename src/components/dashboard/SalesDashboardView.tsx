"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CircleDollarSign,
  Handshake,
  Percent,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatCurrency,
  type DashboardFilters,
} from "@/lib/dashboard/layout";
import { computeSalesDashboard } from "@/lib/dashboard/sales";
import { formatCompactMoney } from "@/lib/dashboard/executive";
import {
  DashboardViewGrid,
  type DashboardReorderProps,
} from "@/components/dashboard/DashboardWidgetSlot";
import { cn } from "@/lib/utils";

const LOAN_COLORS = ["#2563EB", "#7C3AED", "#0D9488", "#F59E0B", "#64748B"];
const SOURCE_COLORS = ["#2563EB", "#7C3AED", "#0D9488", "#F59E0B", "#DB2777", "#64748B"];
const FUNNEL_COLORS = ["#2563EB", "#0D9488", "#4F46E5", "#EA580C", "#DB2777", "#7C3AED", "#16A34A"];

function Spark({ points, color }: { points: number[]; color: string }) {
  const vals = points.length ? points : [0];
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const w = 120;
  const h = 28;
  const d = vals
    .map((p, i) => {
      const x = vals.length === 1 ? w : (i / (vals.length - 1)) * w;
      const y = h - ((p - min) / (max - min || 1)) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full">
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

function Delta({ value, suffix = "%", vs }: { value: number; suffix?: string; vs: string }) {
  const up = value > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const tone = up ? "text-emerald-600" : value === 0 ? "text-slate-400" : "text-rose-500";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", tone)}>
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
      <span className="ml-1 font-medium text-slate-400">{vs}</span>
    </span>
  );
}

function Kpi({
  label,
  subtitle,
  value,
  delta,
  spark,
  icon: Icon,
  iconClass,
  sparkColor,
  vs,
  suffix,
}: {
  label: string;
  subtitle: string;
  value: string;
  delta: number;
  spark: number[];
  icon: typeof Users;
  iconClass: string;
  sparkColor: string;
  vs: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-slate-800">{label}</p>
          <p className="truncate text-[10px] text-slate-400">{subtitle}</p>
        </div>
      </div>
      <p className="mt-3 text-[22px] font-bold tracking-tight text-slate-900">{value}</p>
      <div className="mt-1">
        <Delta value={delta} suffix={suffix ?? "%"} vs={vs} />
      </div>
      <div className="mt-auto pt-3">
        <Spark points={spark} color={sparkColor} />
      </div>
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
        {action ? (
          <Link href={action.href} className="text-[11px] font-semibold text-[#5A32A3] hover:underline">
            {action.label}
          </Link>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

export function SalesDashboardView({
  filters,
  hiddenWidgets = [],
  widgetOrder,
  reordering = false,
  dragging = null,
  over = null,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onArchive,
}: {
  filters: DashboardFilters;
} & DashboardReorderProps) {
  const [metric, setMetric] = useState<"deals" | "value">("deals");
  const data = useMemo(() => computeSalesDashboard(filters), [filters]);
  const vs = data.comparisonLabel;
  const top = Math.max(...data.funnel.map((r) => r.count), 1);
  const loanTotal = data.loanTypes.reduce((n, row) => n + row.value, 0);
  const sourceTotal = data.sources.reduce((n, row) => n + row.value, 0);
  const lostTotal = data.lostReasons.reduce((n, row) => n + row.value, 0) || 1;

  const items = {
    kpis: {
      span: "full" as const,
      node: (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="New Leads"
          subtitle={data.periodLabel}
          value={String(data.newLeads)}
          delta={data.newLeadsDelta}
          spark={data.newLeadsSpark}
          icon={Users}
          iconClass="bg-sky-50 text-sky-600"
          sparkColor="#2563EB"
          vs={vs}
        />
        <Kpi
          label="Qualified Leads"
          subtitle={data.periodLabel}
          value={String(data.qualifiedLeads)}
          delta={data.qualifiedDelta}
          spark={data.qualifiedSpark}
          icon={UserCheck}
          iconClass="bg-emerald-50 text-emerald-600"
          sparkColor="#16A34A"
          vs={vs}
        />
        <Kpi
          label="Appointments"
          subtitle={data.periodLabel}
          value={String(data.appointments)}
          delta={data.appointmentsDelta}
          spark={data.appointmentsSpark}
          icon={CalendarCheck}
          iconClass="bg-violet-50 text-[#5A32A3]"
          sparkColor="#7C3AED"
          vs={vs}
        />
        <Kpi
          label="Deals Created"
          subtitle={data.periodLabel}
          value={String(data.dealsCreated)}
          delta={data.dealsDelta}
          spark={data.dealsSpark}
          icon={Handshake}
          iconClass="bg-orange-50 text-orange-600"
          sparkColor="#EA580C"
          vs={vs}
        />
        <Kpi
          label="Pipeline Value"
          subtitle="(Excl. Settled)"
          value={formatCompactMoney(data.pipelineValue)}
          delta={data.pipelineDelta}
          spark={data.pipelineSpark}
          icon={CircleDollarSign}
          iconClass="bg-cyan-50 text-cyan-600"
          sparkColor="#0891B2"
          vs={vs}
        />
        <Kpi
          label="Lead → Deal Conversion"
          subtitle="This period"
          value={`${data.leadToDeal}%`}
          delta={data.leadToDealDelta}
          spark={data.leadToDealSpark}
          icon={Percent}
          iconClass="bg-violet-50 text-violet-700"
          sparkColor="#6D28D9"
          vs={vs}
          suffix="pp"
        />
      </div>
      ),
    },
    "pipeline-stage": {
      node: (
        <Card title="Pipeline Value by Stage">
          <div className="space-y-1.5">
            {data.funnel.map((row, i) => (
              <div key={row.label} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2">
                <span className="truncate text-[11px] text-slate-500">{row.label}</span>
                <div className="h-6 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="flex h-full items-center px-2 text-[10px] font-semibold text-white"
                    style={{
                      width: `${Math.max(16, (row.count / top) * 100)}%`,
                      backgroundColor: FUNNEL_COLORS[i],
                    }}
                  >
                    {row.count ? formatCompactMoney(row.value) : ""}
                  </div>
                </div>
                <span className="text-right text-[11px] font-semibold text-slate-700">
                  {row.count} · {Math.round((row.count / top) * 100)}%
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-slate-500">
            Total pipeline{" "}
            <span className="font-semibold text-slate-800">{formatCompactMoney(data.pipelineValue)}</span>
          </p>
        </Card>
      ),
    },
    "pipeline-loan": {
      node: (
        <Card title="Pipeline Value by Loan Type">
          <div className="flex items-center gap-3">
            <div className="relative h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.loanTypes}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {data.loanTypes.map((row, i) => (
                      <Cell key={row.name} fill={LOAN_COLORS[i % LOAN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] text-slate-400">Total</p>
                <p className="text-[13px] font-bold text-slate-900">{formatCompactMoney(loanTotal)}</p>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {data.loanTypes.length ? data.loanTypes.map((row, i) => (
                <div key={row.name} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="flex items-center gap-1.5 truncate text-slate-600">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: LOAN_COLORS[i % LOAN_COLORS.length] }}
                    />
                    {row.name}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {loanTotal ? Math.round((row.value / loanTotal) * 100) : 0}%
                  </span>
                </div>
              )) : (
                <p className="text-[12px] text-slate-400">No pipeline in this view.</p>
              )}
            </div>
          </div>
        </Card>
      ),
    },
    "deals-stage": {
      node: (
        <Card title="Deals by Stage">
          <div className="mb-2 flex justify-end">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as "deals" | "value")}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px]"
            >
              <option value="deals">Deals</option>
              <option value="value">Value</option>
            </select>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.funnel.map((row) => ({
                  name: row.label,
                  value: metric === "deals" ? row.count : row.value,
                }))}
              >
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.funnel.map((row, i) => (
                    <Cell key={row.label} fill={FUNNEL_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ),
    },
    "leads-source": {
      node: (
        <Card title="Leads by Source">
          <div className="flex items-center gap-3">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.sources} dataKey="value" nameKey="name" innerRadius={40} outerRadius={62}>
                    {data.sources.map((row, i) => (
                      <Cell key={row.name} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {data.sources.map((row, i) => (
                <div key={row.name} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="flex items-center gap-1.5 truncate text-slate-600">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                    />
                    {row.name}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {row.value} · {sourceTotal ? Math.round((row.value / sourceTotal) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ),
    },
    "lead-deal-conv": {
      node: (
        <Card title="Lead → Deal Conversion">
          <div className="flex flex-1 items-center justify-between gap-3 py-6">
            <div className="rounded-xl bg-sky-50 px-4 py-3 text-center">
              <p className="text-[10px] text-slate-500">Leads</p>
              <p className="text-xl font-bold text-slate-900">{data.newLeads}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400" />
            <div className="rounded-xl bg-violet-50 px-4 py-3 text-center">
              <p className="text-[10px] text-slate-500">Deals Created</p>
              <p className="text-xl font-bold text-slate-900">{data.dealsCreated}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
              <p className="text-[10px] text-slate-500">Conversion</p>
              <p className="text-xl font-bold text-emerald-700">{data.leadToDeal}%</p>
            </div>
          </div>
        </Card>
      ),
    },
    "deal-settle-conv": {
      node: (
        <Card title="Deal → Settlement Conversion">
          <div className="flex flex-1 items-center justify-between gap-3 py-6">
            <div className="rounded-xl bg-violet-50 px-4 py-3 text-center">
              <p className="text-[10px] text-slate-500">Deals Created</p>
              <p className="text-xl font-bold text-slate-900">{data.dealsCreated}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400" />
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
              <p className="text-[10px] text-slate-500">Settled Deals</p>
              <p className="text-xl font-bold text-slate-900">{data.settled}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
              <p className="text-[10px] text-slate-500">Conversion</p>
              <p className="text-xl font-bold text-emerald-700">{data.dealToSettle}%</p>
            </div>
          </div>
        </Card>
      ),
    },
    "top-sources": {
      node: (
        <Card title="Top Performing Sources" action={{ href: "/sales/leads", label: "View All Sources" }}>
          <table className="w-full text-left text-[12px]">
            <thead className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              <tr>
                <th className="py-1.5">Source</th>
                <th>Leads</th>
                <th>Deals</th>
                <th>Conv.</th>
                <th>Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {data.topSources.map((row) => (
                <tr key={row.name} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-slate-800">{row.name}</td>
                  <td>{row.leads}</td>
                  <td>{row.deals}</td>
                  <td>{row.conversion}%</td>
                  <td>{formatCurrency(row.pipeline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ),
    },
    "top-brokers": {
      node: (
        <Card title="Top Performing Brokers" action={{ href: "/sales/leads", label: "View All Brokers" }}>
          <table className="w-full text-left text-[12px]">
            <thead className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              <tr>
                <th className="py-1.5">Broker</th>
                <th>Deals</th>
                <th>Pipeline</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {data.topBrokers.map((row) => (
                <tr key={row.name} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-slate-800">{row.name}</td>
                  <td>{row.deals}</td>
                  <td>{formatCurrency(row.pipeline)}</td>
                  <td>{row.conversion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ),
    },
    "lost-deals": {
      node: (
        <Card title="Lost Deals Overview" action={{ href: "/sales/deals", label: "View All Lost Deals" }}>
          <p className="text-[11px] text-slate-500">Total lost deals</p>
          <p className="text-2xl font-bold text-slate-900">{data.lostDeals}</p>
          <Delta value={data.lostDelta} vs={vs} />
          <div className="mt-3 space-y-2">
            {data.lostReasons.map((row) => (
              <div key={row.name}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-slate-600">{row.name}</span>
                  <span className="font-semibold text-slate-800">
                    {row.value} · {Math.round((row.value / lostTotal) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-rose-400"
                    style={{ width: `${Math.max(8, (row.value / lostTotal) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
  };

  return (
    <div className="space-y-3">
      <DashboardViewGrid
        items={items}
        widgetOrder={widgetOrder}
        hiddenWidgets={hiddenWidgets}
        reordering={reordering}
        dragging={dragging}
        over={over}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onArchive={onArchive}
      />
    </div>
  );
}
