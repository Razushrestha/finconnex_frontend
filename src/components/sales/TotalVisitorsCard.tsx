"use client";

import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
  TooltipProps,
} from "recharts";
import { MoreHorizontal } from "lucide-react";

interface DeviceData {
  device: string;
  current: number;
  lastMonth: number;
}

const data: DeviceData[] = [
  { device: "Mobile", current: 82, lastMonth: 60 },
  { device: "Desktop", current: 38, lastMonth: 34 },
  { device: "Tablet", current: 58, lastMonth: 30 },
  { device: "iPad pro", current: 92, lastMonth: 55 },
  { device: "iPhone", current: 30, lastMonth: 28 },
  { device: "Other", current: 48, lastMonth: 22 },
];

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  const current = payload.find((p) => p.dataKey === "current")?.value as number;
  const lastMonth = payload.find((p) => p.dataKey === "lastMonth")
    ?.value as number;

  return (
    <div className="rounded-lg bg-slate-100 px-4 py-3 shadow-md">
      <p className="mb-2 text-sm font-medium text-slate-500">{label}</p>
      <div className="mb-1 flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
        <span className="text-slate-500">Current:</span>
        <span className="font-semibold text-slate-800">{current}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
        <span className="text-slate-500">Last Month:</span>
        <span className="font-semibold text-slate-800">{lastMonth}</span>
      </div>
    </div>
  );
}

export function TotalVisitorsCard() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-md font-bold text-slate-900">Total Visitors</h3>
        <button
          type="button"
          aria-label="More options"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 cursor-pointer"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-8 text-2xl font-semibold text-slate-900">
        $12,552<span className="text-indigo-500">.50</span>
      </p>

      {/* Chart */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={6}
            barCategoryGap="20%"
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="device"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 13 }}
              dy={10}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />

            <Bar dataKey="current" radius={[6, 6, 0, 0]} barSize={32}>
              {data.map((entry) => (
                <Cell
                  key={`current-${entry.device}`}
                  fill="url(#currentGradient)"
                />
              ))}
            </Bar>
            <Bar dataKey="lastMonth" radius={[6, 6, 0, 0]} barSize={32}>
              {data.map((entry) => (
                <Cell key={`last-${entry.device}`} fill="#f1f5f9" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-5 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
          Current
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-100" />
          Last Month
        </div>
      </div>
    </div>
  );
}
