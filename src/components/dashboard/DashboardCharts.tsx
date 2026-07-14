"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

/** Small vertical bar chart — used in Total Contacts, Traffic Sources, Order By Time */
export function MiniBarChart({
  data,
  color = "#7C3AED",
}: {
  data: { value: number }[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={70}>
      <BarChart data={data} barCategoryGap="30%">
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={color}
              fillOpacity={
                i === data.length - 2 ? 1 : 0.35 + (i / data.length) * 0.5
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Small smooth line chart — used in Lead Analytics */
export function MiniLineChart({
  data,
  color = "#ffffff",
}: {
  data: { value: number }[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={70}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Filled area chart — used in Revenue */
export function MiniAreaChart({
  data,
  color = "#7C3AED",
}: {
  data: { value: number }[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Full monthly bar chart with axes — used in Revenue */
export function RevenueBarChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: -10 }}>
        <defs>
          <linearGradient id="revenueBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4C1D95" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="4 4"
          stroke="#EEF0F5"
        />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 12 }}
          tickFormatter={(v) => `${v}K`}
        />
        <Bar
          dataKey="value"
          fill="url(#revenueBar)"
          radius={[6, 6, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Stacked monthly bar chart with axes — used in Retention Rate */
export function RetentionBarChart({
  data,
}: {
  data: { label: string; sme: number; startups: number; enterprises: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -10 }}>
        <CartesianGrid
          vertical={false}
          strokeDasharray="4 4"
          stroke="#EEF0F5"
        />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 12 }}
        />
        <Bar
          dataKey="sme"
          stackId="a"
          fill="#5B21B6"
          radius={[0, 0, 4, 4]}
          maxBarSize={22}
        />
        <Bar dataKey="startups" stackId="a" fill="#C4B5FD" maxBarSize={22} />
        <Bar
          dataKey="enterprises"
          stackId="a"
          fill="#EDE9FE"
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  size = 100,
  thickness = 12,
  centerLabel,
}: {
  data: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: React.ReactNode;
}) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={size / 2 - thickness}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {centerLabel}
        </div>
      )}
    </div>
  );
}
