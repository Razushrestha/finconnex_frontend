"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
} from "recharts";
import { ChevronDown } from "lucide-react";

type RangeOption = "This Year" | "Last Year" | "This Quarter";

interface DataPoint {
  month: string;
  revenue: number;
  expenses: number;
}

// Matches the source design's x-axis labels (Jan, Feb, Mar, May, Jun, July, Aug, Sep).
const data: DataPoint[] = [
  { month: "Jan", revenue: 20000, expenses: 300000 },
  { month: "Feb", revenue: 100000, expenses: 130000 },
  { month: "Mar", revenue: 290000, expenses: 290000 },
  { month: "May", revenue: 210000, expenses: 280000 },
  { month: "Jun", revenue: 210000, expenses: 220000 },
  { month: "July", revenue: 400000, expenses: 400000 },
  { month: "Aug", revenue: 320000, expenses: 480000 },
  { month: "Sep", revenue: 280000, expenses: 400000 },
];

function formatCurrency(value: number) {
  return `${(value / 1000).toFixed(0)}K`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: Pick<TooltipContentProps<number, string>, "active" | "payload" | "label">) {
  if (!active || !payload || payload.length === 0) return null;

  const revenue = payload.find((p) => p.dataKey === "revenue")?.value as number;
  const expenses = payload.find((p) => p.dataKey === "expenses")
    ?.value as number;

  return (
    <div className="rounded-lg bg-slate-100 px-4 py-3 shadow-md">
      <p className="mb-2 text-sm font-medium text-slate-500">{label}</p>
      <div className="mb-1 flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
        <span className="text-slate-500">Revenue:</span>
        <span className="font-semibold text-slate-800">
          ${revenue.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
        <span className="text-slate-500">Expenses:</span>
        <span className="font-semibold text-slate-800">
          ${expenses.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function RevenueExpensesChart() {
  const [range, setRange] = useState<RangeOption>("This Year");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
          Revenue vs Expenses
        </h3>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {range}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-36 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-100 bg-white py-1 shadow-md sm:w-40">
              {(
                ["This Year", "Last Year", "This Quarter"] as RangeOption[]
              ).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setRange(opt);
                    setMenuOpen(false);
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                    opt === range
                      ? "font-medium text-indigo-600"
                      : "text-slate-600"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 w-full sm:h-64 lg:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="#f1f5f9" />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              dy={10}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={formatCurrency}
              domain={[0, 500000]}
              ticks={[0, 100000, 200000, 300000, 400000, 500000]}
              width={44}
            />

            <Tooltip
              content={({ active, payload, label }) => (
                <CustomTooltip active={active} payload={payload} label={label} />
              )}
            />

            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#0f172a"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{
                r: 5,
                stroke: "#0f172a",
                strokeWidth: 2,
                fill: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 5,
                stroke: "#6366f1",
                strokeWidth: 2,
                fill: "#fff",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
          Revenue
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          Expenses
        </div>
      </div>
    </div>
  );
}
