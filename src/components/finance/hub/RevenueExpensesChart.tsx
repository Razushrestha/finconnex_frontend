"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { CalendarDays } from "lucide-react";
import {
  mockData,
  type ChartType,
  type FinancialDataPoint,
  type TimeRange,
} from "@/lib/hub/types";
import { cn } from "@/lib/utils";

const REVENUE = "#6D5AE6";
const EXPENSES = "#F9A8C5";

export function RevenueExpensesChart({
  liveSixMonth,
}: {
  liveSixMonth: FinancialDataPoint[];
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");
  const [chartType, setChartType] = useState<ChartType>("bar");

  const data = timeRange === "6m" ? liveSixMonth : mockData[timeRange];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900">Revenue vs Expenses</h3>
          <p className="text-[11px] text-slate-400">
            Track your financial performance over time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-slate-100 p-0.5 text-[11px] font-semibold">
            {(["bar", "line"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setChartType(type)}
                className={cn(
                  "rounded-full px-3 py-1.5 capitalize",
                  chartType === type
                    ? "bg-[#6D5AE6] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {type === "bar" ? "Bar" : "Line"}
              </button>
            ))}
          </div>

          <label className="relative inline-flex items-center">
            <CalendarDays className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="appearance-none rounded-full border border-slate-200 bg-white py-1.5 pr-7 pl-8 text-[11px] font-medium text-slate-600"
            >
              <option value="today">Today</option>
              <option value="week">Week</option>
              <option value="6m">Last 6 Months</option>
              <option value="year">Full Year</option>
            </select>
          </label>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="revenue" fill={REVENUE} radius={[6, 6, 0, 0]} barSize={18} />
              <Bar dataKey="expenses" fill={EXPENSES} radius={[6, 6, 0, 0]} barSize={18} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="hubRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={REVENUE} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={REVENUE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="hubExpenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EXPENSES} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={EXPENSES} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke={REVENUE} strokeWidth={3} fill="url(#hubRevenueFill)" />
              <Area type="monotone" dataKey="expenses" stroke={EXPENSES} strokeWidth={3} fill="url(#hubExpenseFill)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-center gap-5 text-[11px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: REVENUE }} />
          Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: EXPENSES }} />
          Expenses
        </span>
      </div>
    </div>
  );
}
