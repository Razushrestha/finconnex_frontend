"use client";

import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Cell,
  Tooltip,
  TooltipContentProps,
} from "recharts";

interface BarPoint {
  id: string;
  value: number;
}

const chartData: BarPoint[] = [
  { id: "a", value: 30 },
  { id: "b", value: 72 },
  { id: "c", value: 22 },
  { id: "d", value: 62 },
  { id: "e", value: 92 },
  { id: "f", value: 48 },
];

interface SubStat {
  label: string;
  value: string;
  delta: string;
}

const subStats: SubStat[] = [
  { label: "Active Leads", value: "248", delta: "+12.1%" },
  { label: "Converted Leads", value: "192", delta: "+9.1%" },
];

function ChartTooltip({
  active,
  payload,
}: Pick<TooltipContentProps<number, string>, "active" | "payload">) {
  if (!active || !payload || payload.length === 0) return null;

  const value = payload[0]?.value as number;

  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2 shadow-md">
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
        <span className="font-semibold text-slate-800">{value}</span>
        <span className="text-slate-500">New Members</span>
      </div>
    </div>
  );
}

export function NewTeamMembersCard() {
  return (
    <div className="flex min-w-0 max-w-sm flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-snug text-slate-900">
            New Team Members
          </h3>
          <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
            +18.6%
          </span>
        </div>

        <p className="mb-4 text-3xl font-bold text-slate-900">4,544</p>

        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="28%">
              <defs>
                <linearGradient
                  id="newMembersGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>

              <Tooltip
                content={({ active, payload }) => (
                  <ChartTooltip active={active} payload={payload} />
                )}
                cursor={{ fill: "#f8fafc" }}
              />

              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.id} fill="url(#newMembersGradient)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
        {subStats.map((stat) => (
          <div key={stat.label} className="p-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {stat.value}
              </span>
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600">
                {stat.delta}
              </span>
            </div>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
