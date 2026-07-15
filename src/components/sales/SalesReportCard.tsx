"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";

type Period = "Today" | "Week" | "Month";
type SeriesKey = "income" | "expenses";

interface DataPoint {
  label: string;
  income: number;
  expenses: number;
}

const dataByPeriod: Record<Period, DataPoint[]> = {
  Today: [
    { label: "6am", income: 1200, expenses: 900 },
    { label: "9am", income: 2400, expenses: 1600 },
    { label: "12pm", income: 4200, expenses: 2800 },
    { label: "3pm", income: 3800, expenses: 2600 },
    { label: "6pm", income: 5200, expenses: 3400 },
    { label: "9pm", income: 3100, expenses: 2200 },
  ],
  Week: [
    { label: "Mon", income: 12000, expenses: 9000 },
    { label: "Tue", income: 22000, expenses: 15000 },
    { label: "Wed", income: 28000, expenses: 19000 },
    { label: "Thu", income: 44000, expenses: 27000 },
    { label: "Fri", income: 40000, expenses: 26000 },
    { label: "Sat", income: 18000, expenses: 14000 },
    { label: "Sun", income: 44000, expenses: 28000 },
  ],
  Month: [
    { label: "Jan", income: 32000, expenses: 27000 },
    { label: "Feb", income: 44000, expenses: 30000 },
    { label: "Mar", income: 42000, expenses: 29000 },
    { label: "Apr", income: 50000, expenses: 32000 },
    { label: "May", income: 46000, expenses: 34000 },
    { label: "Jun", income: 55000, expenses: 33000 },
    { label: "Jul", income: 48000, expenses: 35000 },
    { label: "Aug", income: 58000, expenses: 36000 },
    { label: "Sep", income: 52000, expenses: 38000 },
    { label: "Oct", income: 62000, expenses: 37000 },
    { label: "Nov", income: 59000, expenses: 39000 },
    { label: "Dec", income: 64000, expenses: 38000 },
  ],
};

function formatCurrency(value: number) {
  return `$${(value / 1000).toFixed(0)}K`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  const income = payload.find((p) => p.dataKey === "income")?.value as
    | number
    | undefined;
  const expenses = payload.find((p) => p.dataKey === "expenses")?.value as
    | number
    | undefined;

  return (
    <div className="rounded-lg bg-slate-100 px-4 py-3 shadow-md">
      <p className="mb-2 text-sm font-medium text-slate-500">{label}</p>
      {income !== undefined && (
        <div className="mb-1 flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          <span className="text-slate-500">Income:</span>
          <span className="font-semibold text-slate-800">
            ${income.toLocaleString()}
          </span>
        </div>
      )}
      {expenses !== undefined && (
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-slate-500">Expenses:</span>
          <span className="font-semibold text-slate-800">
            ${expenses.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

export function SalesReportCard() {
  const [period, setPeriod] = useState<Period>("Month");
  const [visibleSeries, setVisibleSeries] = useState<
    Record<SeriesKey, boolean>
  >({
    income: true,
    expenses: true,
  });

  const data = useMemo(() => dataByPeriod[period], [period]);

  function toggleSeries(key: SeriesKey) {
    setVisibleSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.income && !next.expenses) return prev;
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Sales Report</h3>

        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
          {(["Today", "Week", "Month"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                period === p
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 flex items-start gap-10">
        <div>
          <p className="text-3xl font-semibold text-slate-800">
            $87,352<span className="text-indigo-500">50</span>
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm text-slate-500">Average Income</span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
              +12.4%
            </span>
          </div>
        </div>

        <div>
          <p className="text-3xl font-semibold text-slate-800">
            $97,500<span className="text-indigo-500">50</span>
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm text-slate-500">Average Expenses</span>
            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-500">
              -7.3%
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="#f1f5f9" />

            <XAxis
              dataKey="label"
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

            <Tooltip content={<CustomTooltip />} />

            {visibleSeries.income && (
              <Area
                type="monotone"
                dataKey="income"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#incomeGradient)"
                activeDot={{
                  r: 5,
                  stroke: "#6366f1",
                  strokeWidth: 2,
                  fill: "#fff",
                }}
                isAnimationActive
              />
            )}
            {visibleSeries.expenses && (
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2.5}
                fill="url(#expensesGradient)"
                activeDot={{
                  r: 5,
                  stroke: "#ef4444",
                  strokeWidth: 2,
                  fill: "#fff",
                }}
                isAnimationActive
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => toggleSeries("income")}
          className={`flex items-center gap-2 text-sm transition-opacity cursor-pointer ${
            visibleSeries.income ? "text-slate-500" : "text-slate-300"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full bg-indigo-500 ${
              visibleSeries.income ? "" : "opacity-30"
            }`}
          />
          Income
        </button>
        <button
          type="button"
          onClick={() => toggleSeries("expenses")}
          className={`flex items-center gap-2 text-sm transition-opacity cursor-pointer ${
            visibleSeries.expenses ? "text-slate-500" : "text-slate-300"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full bg-red-500 ${
              visibleSeries.expenses ? "" : "opacity-30"
            }`}
          />
          Expenses
        </button>
      </div>
    </div>
  );
}
