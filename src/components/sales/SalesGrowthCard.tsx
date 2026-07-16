"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
} from "recharts";
import { MoreHorizontal } from "lucide-react";

interface DayData {
  day: string;
  sales: number;
}

const data: DayData[] = [
  { day: "Mon", sales: 12000 },
  { day: "Tue", sales: 22000 },
  { day: "Wed", sales: 28000 },
  { day: "Thu", sales: 44000 },
  { day: "Fri", sales: 40000 },
  { day: "Sat", sales: 18000 },
  { day: "Sun", sales: 44000 },
];

function formatCurrency(value: number) {
  return `$${(value / 1000).toFixed(0)}K`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: Pick<TooltipContentProps<number, string>, "active" | "payload" | "label">) {
  if (!active || !payload || payload.length === 0) return null;

  const sales = payload[0]?.value as number;

  return (
    <div className="rounded-lg bg-slate-100 px-4 py-3 shadow-md">
      <p className="mb-1 text-sm font-medium text-slate-500">{label}</p>
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
        <span className="text-slate-500">Sales:</span>
        <span className="font-semibold text-slate-800">
          ${sales.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function SalesGrowthCard() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Sales Growth</h3>
        <button
          type="button"
          aria-label="More options"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-6 text-3xl font-semibold text-slate-800">78.50%</p>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="salesGrowthGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              tickFormatter={formatCurrency}
            />

            <Tooltip
              content={({ active, payload, label }) => (
                <CustomTooltip active={active} payload={payload} label={label} />
              )}
            />

            <Area
              type="monotone"
              dataKey="sales"
              stroke="#7c3aed"
              strokeWidth={3}
              fill="url(#salesGrowthGradient)"
              activeDot={{
                r: 5,
                stroke: "#7c3aed",
                strokeWidth: 2,
                fill: "#fff",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
