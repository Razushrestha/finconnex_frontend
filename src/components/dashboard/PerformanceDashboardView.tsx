"use client";

import { useMemo } from "react";
import {
  CircleDollarSign,
  Clock3,
  Handshake,
  Landmark,
  Percent,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
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
  formatCurrency,
  type DashboardFilters,
} from "@/lib/dashboard/layout";
import { computePerformanceDashboard } from "@/lib/dashboard/performance";
import { formatCompactMoney } from "@/lib/dashboard/executive";
import {
  DashboardViewGrid,
  type DashboardReorderProps,
} from "@/components/dashboard/DashboardWidgetSlot";
import { cn } from "@/lib/utils";

const FUNNEL_COLORS = ["#2563EB", "#0D9488", "#4F46E5", "#EA580C", "#DB2777", "#7C3AED", "#16A34A"];
const LOAN_COLORS = ["#2563EB", "#7C3AED", "#0D9488", "#F59E0B", "#64748B"];

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

function Delta({ value, suffix = "%", vs, invert }: { value: number; suffix?: string; vs: string; invert?: boolean }) {
  const up = invert ? value < 0 : value > 0;
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

function Donut({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[{ name: "done", value: pct }, { name: "rest", value: 100 - pct }]}
              dataKey="value"
              innerRadius={30}
              outerRadius={40}
              startAngle={90}
              endAngle={-270}
            >
              <Cell fill={color} />
              <Cell fill="#E2E8F0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] font-bold">
          {Math.round(pct)}%
        </div>
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-600">{label}</p>
    </div>
  );
}

export function PerformanceDashboardView({
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
  const data = useMemo(() => computePerformanceDashboard(filters), [filters]);
  const vs = data.comparisonLabel;
  const maxPipe = Math.max(...data.pipelineByStage.map((r) => r.value), 1);
  const loanTotal = data.loanTypes.reduce((n, r) => n + r.value, 0);

  const items = {
    kpis: {
      span: "full" as const,
      node: (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Settlements", value: String(data.settlements), delta: data.settlementsDelta, spark: data.settlementsSpark, icon: Landmark, color: "#16A34A", bg: "bg-emerald-50 text-emerald-600" },
          { label: "Settlement Value", value: formatCompactMoney(data.settlementValue), delta: data.settlementValueDelta, spark: data.settlementValueSpark, icon: CircleDollarSign, color: "#2563EB", bg: "bg-sky-50 text-sky-600" },
          { label: "Revenue / Commission", value: formatCompactMoney(data.commission), delta: data.commissionDelta, spark: data.commissionSpark, icon: Wallet, color: "#7C3AED", bg: "bg-violet-50 text-[#5A32A3]" },
          { label: "Average Deal Size", value: formatCompactMoney(data.avgDealSize), delta: data.avgDealSizeDelta, spark: data.avgDealSpark, icon: Handshake, color: "#EA580C", bg: "bg-orange-50 text-orange-600" },
          { label: "Conversion Rate", value: `${data.conversion}%`, delta: data.conversionDelta, spark: data.conversionSpark, icon: Percent, color: "#0D9488", bg: "bg-teal-50 text-teal-700", suffix: "pp" },
          { label: "Avg. Time to Settlement", value: data.avgSettleDays ? String(data.avgSettleDays) : "—", delta: data.avgSettleDaysDelta, spark: data.avgSettleSpark, icon: Clock3, color: "#E11D48", bg: "bg-rose-50 text-rose-600", invert: true },
        ].map((card) => (
          <div key={card.label} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-2">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", card.bg)}>
                <card.icon className="h-4 w-4" />
              </span>
              <p className="text-[12px] font-semibold text-slate-800">{card.label}</p>
            </div>
            <p className="mt-3 text-[22px] font-bold text-slate-900">{card.value}</p>
            <Delta value={card.delta} suffix={card.suffix ?? "%"} vs={vs} invert={card.invert} />
            <div className="mt-auto pt-3">
              <Spark points={card.spark} color={card.color} />
            </div>
          </div>
        ))}
      </div>
      ),
    },
    "conversion-funnel": {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Conversion Funnel</h3>
          <div className="flex flex-col items-center gap-1.5">
            {data.funnel.map((row, i) => (
              <div
                key={row.label}
                className="flex h-8 items-center justify-center rounded-sm text-[11px] font-semibold text-white"
                style={{
                  width: `${Math.max(28, 100 - i * 9)}%`,
                  backgroundColor: FUNNEL_COLORS[i],
                }}
              >
                {row.label} · {row.count}
              </div>
            ))}
          </div>
        </section>
      ),
    },
    trend: {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Performance Trend</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="settlements" name="Settlements" stroke="#16A34A" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="settlementValue" name="Settlement Value" stroke="#2563EB" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#7C3AED" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 text-[11px] text-slate-500">
            <p>Settlements <span className="font-semibold text-slate-800">{data.settlements}</span></p>
            <p>Value <span className="font-semibold text-slate-800">{formatCompactMoney(data.settlementValue)}</span></p>
            <p>Revenue <span className="font-semibold text-slate-800">{formatCompactMoney(data.commission)}</span></p>
          </div>
        </section>
      ),
    },
    "pipeline-stage": {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Pipeline Value by Stage</h3>
          <div className="space-y-2">
            {data.pipelineByStage.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-slate-600">{row.label}</span>
                  <span className="font-semibold">{formatCompactMoney(row.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#5A32A3]" style={{ width: `${Math.max(6, (row.value / maxPipe) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-slate-500">
            Total <span className="font-semibold text-slate-800">{formatCompactMoney(data.pipelineValue)}</span>
          </p>
        </section>
      ),
    },
    "stage-times": {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Average Time in Stage (Days)</h3>
          <table className="w-full text-left text-[12px]">
            <thead className="text-[10px] uppercase text-slate-400">
              <tr><th className="py-1">Stage</th><th>Days</th><th>vs last</th></tr>
            </thead>
            <tbody>
              {data.stageTimes.map((row) => (
                <tr key={row.stage} className="border-t border-slate-100">
                  <td className="py-1.5">{row.stage}</td>
                  <td className="font-semibold">{row.days || "—"}</td>
                  <td className="text-slate-500">{row.days ? `${row.delta}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-slate-500">
            Avg. time to settle <span className="font-semibold">{data.avgSettleDays || "—"} days</span>
          </p>
        </section>
      ),
    },
    "vs-target": {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Performance vs Target</h3>
          <div className="flex justify-around py-2">
            <Donut value={(data.settlements / data.settlementCountTarget) * 100} label="Settlements" color="#16A34A" />
            <Donut value={(data.commission / data.revenueTarget) * 100} label="Revenue" color="#7C3AED" />
            <Donut value={(data.settlementValue / data.settlementTarget) * 100} label="Settlement Value" color="#2563EB" />
          </div>
        </section>
      ),
    },
    bottleneck: {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-[11px] font-semibold tracking-wide text-amber-700 uppercase">Biggest Bottleneck</h3>
          <p className="mt-2 text-[16px] font-bold text-amber-950">{data.bottleneck}</p>
          <p className="mt-1 text-[12px] text-amber-800">
            Avg. {data.bottleneckDays} days in stage · {formatCompactMoney(data.bottleneckValue)} in pipeline
          </p>
        </section>
      ),
    },
    team: {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Team Performance</h3>
          <table className="w-full text-left text-[12px]">
            <thead className="text-[10px] uppercase text-slate-400">
              <tr>
                <th className="py-1">Broker</th>
                <th>Settled</th>
                <th>Value</th>
                <th>Rev.</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {data.team.map((row) => (
                <tr key={row.name} className="border-t border-slate-100">
                  <td className="py-1.5 font-medium">{row.name}</td>
                  <td>{row.settlements}</td>
                  <td>{formatCurrency(row.value)}</td>
                  <td>{formatCompactMoney(row.commission)}</td>
                  <td>{row.conversion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ),
    },
    "loan-type": {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Loan Type Performance</h3>
          <div className="flex items-center gap-3">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.loanTypes} dataKey="value" nameKey="name" innerRadius={40} outerRadius={62}>
                    {data.loanTypes.map((row, i) => (
                      <Cell key={row.name} fill={LOAN_COLORS[i % LOAN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 text-[12px]">
              {data.loanTypes.map((row, i) => (
                <div key={row.name} className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: LOAN_COLORS[i % LOAN_COLORS.length] }} />
                    {row.name}
                  </span>
                  <span className="font-semibold">{loanTotal ? Math.round((row.value / loanTotal) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ),
    },
    "mom-growth": {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-[13px] font-semibold">Month on Month Growth</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "settlements", label: "Settlements", color: "#16A34A" },
              { key: "settlementValue", label: "Settlement Value", color: "#2563EB" },
              { key: "revenue", label: "Revenue", color: "#7C3AED" },
              { key: "avgDeal", label: "Avg. Deal Size", color: "#EA580C" },
            ].map((chart) => (
              <div key={chart.key}>
                <p className="mb-1 text-[10px] text-slate-500">{chart.label}</p>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trend}>
                      <Bar dataKey={chart.key} fill={chart.color} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </section>
      ),
    },
  };

  return (
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
  );
}

