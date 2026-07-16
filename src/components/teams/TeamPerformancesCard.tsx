"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { MoreHorizontal } from "lucide-react";

interface MonthlyPerformance {
  month: string;
  team1: number;
  team2: number;
  team3: number;
}

const data: MonthlyPerformance[] = [
  { month: "Jan", team1: 68, team2: 58, team3: 52 },
  { month: "Feb", team1: 80, team2: 74, team3: 64 },
  { month: "Mar", team1: 85, team2: 76, team3: 66 },
  { month: "Apr", team1: 92, team2: 84, team3: 76 },
  { month: "May", team1: 40, team2: 66, team3: 62 },
  { month: "Jun", team1: 58, team2: 90, team3: 46 },
];

const teamColors = {
  team1: "#6366f1",
  team2: "#10b981",
  team3: "#f59e0b",
};

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg bg-slate-100 px-4 py-3 shadow-md">
      <p className="mb-2 text-sm font-medium text-slate-500">{label}</p>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="mb-1 flex items-center gap-2 text-sm last:mb-0"
        >
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-500 capitalize">
            {String(entry.dataKey).replace("team", "Team ")}:
          </span>
          <span className="font-semibold text-slate-800">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

export function TeamPerformancesCard() {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
          Team Performances
        </h3>
        <button
          type="button"
          aria-label="More options"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Chart */}
      <div className="h-56 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={3}
            barCategoryGap="24%"
            margin={{ top: 10, right: 0, left: -10, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="#f1f5f9" />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />

            <Bar
              dataKey="team1"
              fill={teamColors.team1}
              radius={[3, 3, 0, 0]}
              barSize={14}
            />
            <Bar
              dataKey="team2"
              fill={teamColors.team2}
              radius={[3, 3, 0, 0]}
              barSize={14}
            />
            <Bar
              dataKey="team3"
              fill={teamColors.team3}
              radius={[3, 3, 0, 0]}
              barSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: teamColors.team1 }}
          />
          Team 1
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: teamColors.team2 }}
          />
          Team 2
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: teamColors.team3 }}
          />
          Team 3
        </div>
      </div>
    </div>
  );
}
