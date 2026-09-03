"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileWarning,
  GitBranch,
  Handshake,
  Landmark,
  Percent,
  ShieldAlert,
  Target,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/dashboard/layout";
import {
  formatCompactMoney,
  type ExecutiveOverview as ExecutiveData,
  type RankingRow,
} from "@/lib/dashboard/executive";
import { cn } from "@/lib/utils";

const FUNNEL_COLORS = [
  "#2563EB",
  "#0D9488",
  "#4F46E5",
  "#EA580C",
  "#DB2777",
  "#7C3AED",
  "#16A34A",
];

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
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

function Delta({
  value,
  invert,
  suffix = "%",
  vs,
}: {
  value: number;
  invert?: boolean;
  suffix?: string;
  vs?: string;
}) {
  const up = invert ? value < 0 : value > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const tone =
    up ? "text-emerald-600" : value === 0 ? "text-slate-400" : "text-rose-500";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", tone)}>
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
      {vs ? <span className="ml-1 font-medium text-slate-400">{vs}</span> : null}
    </span>
  );
}

function WidgetLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="mt-auto inline-flex shrink-0 items-center gap-1 pt-3 text-[11px] font-semibold text-[#5A32A3] hover:underline"
    >
      {children}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

function KpiCard({
  label,
  subtitle,
  value,
  delta,
  spark,
  icon: Icon,
  href,
  invert,
  warn,
  vs,
  iconClass,
  sparkColor,
}: {
  label: string;
  subtitle: string;
  value: string;
  delta: number;
  spark: number[];
  icon: typeof UserPlus;
  href: string;
  invert?: boolean;
  warn?: boolean;
  vs: string;
  iconClass: string;
  sparkColor: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-violet-200"
    >
      <div className="flex items-start gap-2">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-slate-800">{label}</p>
          <p className="truncate text-[10px] text-slate-400">{subtitle}</p>
        </div>
      </div>
      <p className={cn("mt-3 text-[22px] font-bold tracking-tight text-slate-900", warn && "text-orange-600")}>
        {value}
      </p>
      {warn ? (
        <p className="mt-1 text-[11px] font-semibold text-rose-500">
          {value} Overdue
        </p>
      ) : (
        <div className="mt-1">
          <Delta
            value={delta}
            invert={invert}
            suffix={invert ? "%" : value.includes("%") ? "pp" : "%"}
            vs={vs}
          />
        </div>
      )}
      {warn ? null : (
        <div className="mt-auto pt-3">
          <Spark points={spark} color={sparkColor} />
        </div>
      )}
    </Link>
  );
}

export function ExecutiveKpis({ data }: { data: ExecutiveData }) {
  const vs = data.comparisonLabel;
  const period = data.periodLabel;
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
      <KpiCard
        label="New Leads"
        subtitle={period}
        value={String(data.newLeads)}
        delta={data.newLeadsDelta}
        spark={data.newLeadsSpark}
        icon={Users}
        href="/sales/leads"
        vs={vs}
        iconClass="bg-sky-50 text-sky-600"
        sparkColor="#2563EB"
      />
      <KpiCard
        label="Active Pipeline"
        subtitle="(Excl. Settled)"
        value={formatCompactMoney(data.activePipeline)}
        delta={data.activePipelineDelta}
        spark={data.activePipelineSpark}
        icon={GitBranch}
        href="/sales/leads"
        vs={vs}
        iconClass="bg-emerald-50 text-emerald-600"
        sparkColor="#16A34A"
      />
      <KpiCard
        label="Settlements"
        subtitle={period}
        value={String(data.settlements)}
        delta={data.settlementsDelta}
        spark={data.settlementsSpark}
        icon={Handshake}
        href="/sales/deals"
        vs={vs}
        iconClass="bg-violet-50 text-[#5A32A3]"
        sparkColor="#7C3AED"
      />
      <KpiCard
        label="Settlement Value"
        subtitle={period}
        value={formatCompactMoney(data.settlementValue)}
        delta={data.settlementValueDelta}
        spark={data.settlementValueSpark}
        icon={Clock3}
        href="/sales/deals"
        vs={vs}
        iconClass="bg-orange-50 text-orange-600"
        sparkColor="#EA580C"
      />
      <KpiCard
        label="Revenue / Commission"
        subtitle={period}
        value={formatCompactMoney(data.commission)}
        delta={data.commissionDelta}
        spark={data.commissionSpark}
        icon={CircleDollarSign}
        href="/finance"
        vs={vs}
        iconClass="bg-cyan-50 text-cyan-600"
        sparkColor="#0891B2"
      />
      <KpiCard
        label="Conversion Rate"
        subtitle="Lead → Settlement"
        value={`${data.conversionRate}%`}
        delta={data.conversionDelta}
        spark={data.conversionSpark}
        icon={Target}
        href="/sales/leads"
        vs={vs}
        iconClass="bg-violet-50 text-violet-700"
        sparkColor="#6D28D9"
      />
      <KpiCard
        label="Avg. Time to Settle"
        subtitle="(Days)"
        value={data.avgSettleDays ? String(data.avgSettleDays) : "—"}
        delta={data.avgSettleDaysDelta}
        spark={data.avgSettleDaysSpark}
        icon={Clock3}
        href="/sales/leads"
        invert
        vs={vs}
        iconClass="bg-rose-50 text-rose-600"
        sparkColor="#E11D48"
      />
      <KpiCard
        label="Overdue"
        subtitle="Needs attention"
        value={String(data.overdue)}
        delta={0}
        spark={data.overdueSpark}
        icon={AlertTriangle}
        href="/work-queue"
        warn={data.overdue > 0}
        vs={vs}
        iconClass="bg-orange-50 text-orange-600"
        sparkColor="#EA580C"
      />
    </div>
  );
}

export function PipelineGlance({ data }: { data: ExecutiveData }) {
  const top = Math.max(...data.funnel.map((r) => r.count), 1);
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-[13px] font-semibold text-slate-900">Pipeline at a Glance</h3>
      <div className="mt-3 grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[8.5rem_1fr_7.5rem]">
        <div className="space-y-1.5">
          {data.funnel.map((row) => (
            <div key={row.label} className="flex h-7 items-center">
              <p className="truncate text-[11px] font-medium text-slate-700">{row.label}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 py-1">
          {data.funnel.map((row, i) => {
            const width = 100 - i * 9;
            const pct = Math.round((row.count / top) * 100);
            return (
              <div
                key={row.label}
                className="flex h-7 items-center justify-center rounded-sm text-[10px] font-semibold text-white"
                style={{
                  width: `${Math.max(28, width)}%`,
                  backgroundColor: FUNNEL_COLORS[i] ?? "#5A32A3",
                }}
              >
                {row.count} · {pct}%
              </div>
            );
          })}
        </div>
        <div className="space-y-3 self-center">
          <div>
            <p className="text-[10px] text-slate-400">Total Pipeline Value</p>
            <p className="text-[15px] font-semibold text-slate-900">
              {formatCompactMoney(data.pipelineValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Weighted Pipeline Value</p>
            <p className="text-[15px] font-semibold text-slate-900">
              {formatCompactMoney(data.weightedPipeline)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">Active Deals</p>
            <p className="text-[15px] font-semibold text-slate-900">{data.activeDeals}</p>
          </div>
        </div>
      </div>
      <WidgetLink href="/?view=sales">View Sales Dashboard</WidgetLink>
    </section>
  );
}

export function PerformanceSnapshot({ data }: { data: ExecutiveData }) {
  const rows = [
    {
      label: "Lead → Deal Conversion",
      value: `${data.leadToDeal}%`,
      delta: data.leadToDealDelta,
      suffix: "pp",
      icon: Users,
      iconClass: "bg-sky-50 text-sky-600",
    },
    {
      label: "Deal → Settlement Conversion",
      value: `${data.dealToSettle}%`,
      delta: data.dealToSettleDelta,
      suffix: "pp",
      icon: Handshake,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Avg. Deal Size",
      value: formatCompactMoney(data.avgDealSize),
      delta: data.avgDealSizeDelta,
      suffix: "%",
      icon: Briefcase,
      iconClass: "bg-violet-50 text-[#5A32A3]",
    },
  ];
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-[13px] font-semibold text-slate-900">Performance Snapshot</h3>
      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-hidden">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-[12px] text-slate-600">
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", row.iconClass)}>
                <row.icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{row.label}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-900">{row.value}</span>
              <Delta value={row.delta} suffix={row.suffix} />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
            Bottleneck
          </p>
          <p className="text-[13px] font-semibold text-amber-900">{data.bottleneck}</p>
          {data.bottleneckDays > 0 ? (
            <p className="text-[11px] text-amber-700">
              Avg. {data.bottleneckDays} days in stage
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            On track to target
          </span>
          <span className="font-semibold text-slate-800">{data.targetProgress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${data.targetProgress}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {formatCompactMoney(data.settlementValue)} of{" "}
          {formatCompactMoney(data.settlementTarget)}
        </p>
      </div>
      <WidgetLink href="/?view=performance">View Performance Dashboard</WidgetLink>
    </section>
  );
}

export function CriticalActions({ data }: { data: ExecutiveData }) {
  const items = [
    {
      label: "Overdue Tasks",
      value: data.overdueTasks,
      href: "/activities/tasks",
      icon: AlertTriangle,
      tone: "text-rose-600 bg-rose-50",
    },
    {
      label: "Follow-ups Due",
      value: data.followUpsDue,
      href: "/activities/reminders",
      icon: Clock3,
      tone: "text-amber-600 bg-amber-50",
    },
    {
      label: "Documents Pending",
      value: data.documentsPending,
      href: "/documents/requests",
      icon: FileWarning,
      tone: "text-sky-600 bg-sky-50",
    },
    {
      label: "Appointments Today",
      value: data.appointmentsToday,
      href: "/activities/meetings",
      icon: CalendarDays,
      tone: "text-violet-600 bg-violet-50",
    },
    {
      label: "SLA Breaches",
      value: data.slaBreaches,
      href: "/work-queue",
      icon: ShieldAlert,
      tone: "text-orange-600 bg-orange-50",
    },
  ];
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-[13px] font-semibold text-slate-900">Today’s Critical Actions</h3>
      <div className="mt-2 min-h-0 flex-1 divide-y divide-slate-100 overflow-hidden">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between py-2.5 text-[13px] hover:text-[#5A32A3]"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", item.tone)}>
                <item.icon className="h-3.5 w-3.5" />
              </span>
              {item.label}
            </span>
            <span
              className={cn(
                "inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-bold",
                item.value > 0
                  ? "bg-violet-50 text-[#5A32A3]"
                  : "bg-slate-50 text-slate-400",
              )}
            >
              {item.value}
            </span>
          </Link>
        ))}
      </div>
      <WidgetLink href="/?view=work-queue">Go to Work Queue</WidgetLink>
    </section>
  );
}

export function TrendOverview({ data }: { data: ExecutiveData }) {
  const leadTotal = data.trend.reduce((n, row) => n + row.leads, 0);
  const dealTotal = data.trend.reduce((n, row) => n + row.deals, 0);
  const settleTotal = data.trend.reduce((n, row) => n + row.settlements, 0);
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-[13px] font-semibold text-slate-900">Trend Overview</h3>
      <div className="mt-2 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="leads" name="Leads" stroke="#2563EB" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="deals" name="Deals Created" stroke="#16A34A" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="settlements" name="Settlements" stroke="#7C3AED" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[12px]">
        <p className="text-slate-500">
          Leads <span className="font-semibold text-slate-800">{leadTotal}</span>
        </p>
        <p className="text-slate-500">
          Deals <span className="font-semibold text-slate-800">{dealTotal}</span>
        </p>
        <p className="text-slate-500">
          Settlements <span className="font-semibold text-slate-800">{settleTotal}</span>
        </p>
      </div>
      <WidgetLink href="/?view=performance">View Full Trends</WidgetLink>
    </section>
  );
}

function RankTable({ rows, nameLabel }: { rows: RankingRow[]; nameLabel: string }) {
  if (!rows.length) {
    return <p className="px-3 py-8 text-center text-[12px] text-slate-400">No records in this view.</p>;
  }
  return (
    <table className="w-full text-left text-[12px]">
      <thead className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        <tr>
          <th className="px-3 py-2">#</th>
          <th className="px-3 py-2">{nameLabel}</th>
          <th className="px-3 py-2">Leads</th>
          <th className="px-3 py-2">Deals</th>
          <th className="px-3 py-2">Conversion</th>
          <th className="px-3 py-2">Pipeline Value</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.name} className="border-t border-slate-100">
            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
            <td className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
            <td className="px-3 py-2 text-slate-600">{row.leads}</td>
            <td className="px-3 py-2 text-slate-600">{row.deals}</td>
            <td className="px-3 py-2 text-slate-600">{row.conversion}%</td>
            <td className="px-3 py-2 text-slate-600">{formatCurrency(row.pipeline)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TopPerforming({ data }: { data: ExecutiveData }) {
  const [tab, setTab] = useState<"sources" | "brokers" | "loans">("sources");
  const rows =
    tab === "sources" ? data.sources : tab === "brokers" ? data.brokers : data.loanTypes;
  const nameLabel = tab === "sources" ? "Source" : tab === "brokers" ? "Broker" : "Loan Type";
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 pt-4">
        <h3 className="text-[13px] font-semibold text-slate-900">Top Performing</h3>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
          {(
            [
              ["sources", "Sources"],
              ["brokers", "Brokers"],
              ["loans", "Loan Types"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-semibold",
                tab === id ? "bg-white text-[#5A32A3] shadow-sm" : "text-slate-500",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <RankTable rows={rows} nameLabel={nameLabel} />
      </div>
      <div className="px-4 pb-3">
        <WidgetLink href="/?view=sales">View Sales Dashboard</WidgetLink>
      </div>
    </section>
  );
}

export function AlertsInsights({ data }: { data: ExecutiveData }) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex shrink-0 items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-900">Alerts & Insights</h3>
        <Link href="/?view=performance" className="text-[11px] font-semibold text-[#5A32A3] hover:underline">
          View All Insights
        </Link>
      </div>
      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-hidden">
        {data.alerts.map((alert) => {
          const Icon =
            alert.tone === "rose"
              ? AlertTriangle
              : alert.tone === "amber"
                ? Clock3
                : alert.tone === "emerald"
                  ? ThumbsUp
                  : Target;
          return (
            <Link
              key={alert.title}
              href={alert.href}
              className={cn(
                "flex items-start gap-2 rounded-xl px-3 py-2.5",
                alert.tone === "rose" && "bg-rose-50",
                alert.tone === "amber" && "bg-amber-50",
                alert.tone === "sky" && "bg-sky-50",
                alert.tone === "emerald" && "bg-emerald-50",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  alert.tone === "rose" && "text-rose-600",
                  alert.tone === "amber" && "text-amber-600",
                  alert.tone === "sky" && "text-sky-600",
                  alert.tone === "emerald" && "text-emerald-600",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-slate-800">{alert.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{alert.body}</p>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function ExecutiveFooter({ data }: { data: ExecutiveData }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-[#5A32A3]">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <h3 className="text-[13px] font-semibold text-slate-900">Executive Summary</h3>
      </div>
      <p className="mt-2 text-[13px] leading-6 text-slate-600">{data.summary}</p>
    </section>
  );
}
