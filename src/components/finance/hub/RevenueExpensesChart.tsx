import React, { useState } from "react";
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
import { TimeRange, ChartType, mockData } from "@/lib/hub/types";

export const RevenueExpensesChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [customDate, setCustomDate] = useState<string>("2026-06-06");

  const data = mockData[timeRange];

  return (
    <div className="bg-background text-card-foreground p-6 rounded-xl border border-border shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Revenue vs Expenses
          </h3>
          <p className="text-xs text-muted-foreground">
            Track your financial performance over time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="bg-muted p-1 rounded-lg flex text-xs font-medium">
            <button
              onClick={() => setChartType("bar")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                chartType === "bar"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                chartType === "line"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Line
            </button>
          </div>

          {/* Time Range Dropdown */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-3 py-2 bg-muted border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:bg-white focus:border-ring transition-all cursor-pointer"
            >
              <option value="today" className="bg-white text-foreground">
                Today
              </option>
              <option value="week" className="bg-white text-foreground">
                Week
              </option>
              <option value="6m" className="bg-white text-foreground">
                Last 6 Months
              </option>
              <option value="year" className="bg-white text-foreground">
                Full Year (Months)
              </option>
              <option value="custom" className="bg-white text-foreground">
                Custom Date
              </option>
            </select>
          </div>

          {/* Date Picker */}
          {timeRange === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 bg-muted border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:border-ring"
            />
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-border opacity-40"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderRadius: "8px",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                }}
              />
              <Bar
                dataKey="revenue"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="expenses"
                fill="#dc2626"
                radius={[4, 4, 0, 0]}
                barSize={20}
                opacity={0.8}
              />
            </BarChart>
          ) : (
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                {/* Gradient for Revenue Area */}
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--primary)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--primary)"
                    stopOpacity={0.0}
                  />
                </linearGradient>

                {/* Gradient for Expenses Area (Red) */}
                <linearGradient
                  id="expensesGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-border opacity-40"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderRadius: "8px",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                }}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#revenueGradient)"
                dot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#dc2626"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#expensesGradient)"
                dot={{ r: 4 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs font-medium text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-primary rounded-full inline-block"></span>
          Revenue
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-600 rounded-full inline-block"></span>
          Expenses
        </div>
      </div>
    </div>
  );
};
