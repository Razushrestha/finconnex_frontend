"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
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
import { formatCurrency } from "@/lib/dashboard/layout";
import type { DashboardChartData } from "@/lib/dashboard/charts";

const VIOLET = ["#7c3aed", "#a78bfa", "#5b21b6", "#c4b5fd", "#4c1d95"];

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-3">
      <p className="mb-2 text-[11px] font-medium text-muted-foreground">{title}</p>
      <div className="h-52">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
};

export function DashboardKpiCharts({ charts }: { charts: DashboardChartData }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground">
        KPI charts
      </p>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <ChartCard title="Record volume">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.volumes} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {charts.volumes.map((_, i) => (
                  <Cell key={charts.volumes[i]!.name} fill={VIOLET[i % VIOLET.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pipeline vs won">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.values} barCategoryGap="36%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v))}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="#7c3aed" />
                <Cell fill="#22c55e" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Trend — leads & deals">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="leads" stroke="#7c3aed" strokeWidth={2} dot={false} name="Leads" />
              <Line type="monotone" dataKey="deals" stroke="#38bdf8" strokeWidth={2} dot={false} name="Deals" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Won value trend">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={charts.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v))}
                contentStyle={tooltipStyle}
              />
              <Area
                type="monotone"
                dataKey="won"
                stroke="#7c3aed"
                fill="#7c3aed"
                fillOpacity={0.18}
                name="Won"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Record mix">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={charts.mix} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={2}>
                {charts.mix.map((row, i) => (
                  <Cell key={row.name} fill={VIOLET[i % VIOLET.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tasks & activity">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.tasks} layout="vertical" barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={64} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                <Cell fill="#7c3aed" />
                <Cell fill="#e11d48" />
                <Cell fill="#38bdf8" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
