// "use client";

// import {
//   BarChart,
//   Bar,
//   LineChart,
//   Line,
//   AreaChart,
//   Area,
//   PieChart,
//   Pie,
//   Cell,
//   CartesianGrid,
//   XAxis,
//   YAxis,
//   ResponsiveContainer,
// } from "recharts";

// /** Small vertical bar chart: used in Total Contacts, Traffic Sources, Order By Time */
// export function MiniBarChart({
//   data,
//   color = "#7C3AED",
// }: {
//   data: { value: number }[];
//   color?: string;
// }) {
//   return (
//     <ResponsiveContainer width="100%" height={70}>
//       <BarChart data={data} barCategoryGap="30%">
//         <Bar dataKey="value" radius={[4, 4, 0, 0]}>
//           {data.map((_, i) => (
//             <Cell
//               key={i}
//               fill={color}
//               fillOpacity={
//                 i === data.length - 2 ? 1 : 0.35 + (i / data.length) * 0.5
//               }
//             />
//           ))}
//         </Bar>
//       </BarChart>
//     </ResponsiveContainer>
//   );
// }

// /** Small smooth line chart: used in Lead Analytics */
// export function MiniLineChart({
//   data,
//   color = "#ffffff",
// }: {
//   data: { value: number }[];
//   color?: string;
// }) {
//   return (
//     <ResponsiveContainer width="100%" height={70}>
//       <LineChart data={data}>
//         <Line
//           type="monotone"
//           dataKey="value"
//           stroke={color}
//           strokeWidth={2}
//           dot={false}
//         />
//       </LineChart>
//     </ResponsiveContainer>
//   );
// }

// /** Filled area chart: used in Revenue */
// export function MiniAreaChart({
//   data,
//   color = "#7C3AED",
// }: {
//   data: { value: number }[];
//   color?: string;
// }) {
//   return (
//     <ResponsiveContainer width="100%" height={160}>
//       <AreaChart data={data}>
//         <Area
//           type="monotone"
//           dataKey="value"
//           stroke={color}
//           strokeWidth={2}
//           fill={color}
//           fillOpacity={0.15}
//         />
//       </AreaChart>
//     </ResponsiveContainer>
//   );
// }

// /** Full monthly bar chart with axes: used in Revenue */
// export function RevenueBarChart({
//   data,
// }: {
//   data: { label: string; value: number }[];
// }) {
//   return (
//     <ResponsiveContainer width="100%" height={300}>
//       <BarChart data={data} margin={{ left: -10 }}>
//         <CartesianGrid
//           vertical={false}
//           strokeDasharray="4 4"
//           stroke="#EEF0F5"
//         />
//         <XAxis
//           dataKey="label"
//           axisLine={false}
//           tickLine={false}
//           tick={{ fill: "#9CA3AF", fontSize: 12 }}
//         />
//         <YAxis
//           axisLine={false}
//           tickLine={false}
//           tick={{ fill: "#9CA3AF", fontSize: 12 }}
//           tickFormatter={(v) => `${v}K`}
//         />
//         <Bar
//           dataKey="value"
//           fill="#64748B"
//           radius={[6, 6, 0, 0]}
//           maxBarSize={28}
//         />
//       </BarChart>
//     </ResponsiveContainer>
//   );
// }

// /** Stacked monthly bar chart with axes: used in Retention Rate */
// export function RetentionBarChart({
//   data,
// }: {
//   data: { label: string; sme: number; startups: number; enterprises: number }[];
// }) {
//   return (
//     <ResponsiveContainer width="100%" height={220}>
//       <BarChart data={data} margin={{ left: -10 }}>
//         <CartesianGrid
//           vertical={false}
//           strokeDasharray="4 4"
//           stroke="#EEF0F5"
//         />
//         <XAxis
//           dataKey="label"
//           axisLine={false}
//           tickLine={false}
//           tick={{ fill: "#9CA3AF", fontSize: 12 }}
//         />
//         <Bar
//           dataKey="sme"
//           stackId="a"
//           fill="#5B21B6"
//           radius={[0, 0, 4, 4]}
//           maxBarSize={22}
//         />
//         <Bar dataKey="startups" stackId="a" fill="#C4B5FD" maxBarSize={22} />
//         <Bar
//           dataKey="enterprises"
//           stackId="a"
//           fill="#EDE9FE"
//           radius={[4, 4, 0, 0]}
//           maxBarSize={22}
//         />
//       </BarChart>
//     </ResponsiveContainer>
//   );
// }

// export function DonutChart({
//   data,
//   size = 100,
//   thickness = 12,
//   centerLabel,
// }: {
//   data: { value: number; color: string }[];
//   size?: number;
//   thickness?: number;
//   centerLabel?: React.ReactNode;
// }) {
//   return (
//     <div className="relative" style={{ width: size, height: size }}>
//       <ResponsiveContainer width="100%" height="100%">
//         <PieChart>
//           <Pie
//             data={data}
//             dataKey="value"
//             innerRadius={size / 2 - thickness}
//             outerRadius={size / 2}
//             startAngle={90}
//             endAngle={-270}
//             stroke="none"
//           >
//             {data.map((d, i) => (
//               <Cell key={i} fill={d.color} />
//             ))}
//           </Pie>
//         </PieChart>
//       </ResponsiveContainer>
//       {centerLabel && (
//         <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
//           {centerLabel}
//         </div>
//       )}
//     </div>
//   );
// }

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
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/** Shared dark tooltip style used across all charts */
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
      {label && <div className="mb-1 font-medium text-gray-300">{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          {entry.color && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
          )}
          <span>
            {formatter
              ? formatter(entry.value, entry.name)
              : `${entry.name ?? "Value"}: ${entry.value}`}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Small vertical bar chart: used in Total Contacts, Traffic Sources, Order By Time */
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
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: color, fillOpacity: 0.08 }}
        />
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

/** Small smooth line chart: used in Lead Analytics */
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
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.3 }}
        />
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

/** Filled area chart: used in Revenue */
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
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: color, strokeWidth: 1, strokeOpacity: 0.3 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.15}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Full monthly bar chart with axes: used in Revenue */
export function RevenueBarChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
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
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#9CA3AF", fontSize: 12 }}
          tickFormatter={(v) => `${v}K`}
        />
        <Tooltip
          content={<ChartTooltip formatter={(value) => `Revenue: ${value}K`} />}
          cursor={{ fill: "#64748B", fillOpacity: 0.08 }}
        />
        <Bar
          dataKey="value"
          fill="#64748B"
          radius={[6, 6, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Stacked monthly bar chart with axes: used in Retention Rate */
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
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "#5B21B6", fillOpacity: 0.06 }}
        />
        <Bar
          dataKey="sme"
          stackId="a"
          fill="#5B21B6"
          radius={[0, 0, 4, 4]}
          maxBarSize={22}
          name="SME"
        />
        <Bar
          dataKey="startups"
          stackId="a"
          fill="#C4B5FD"
          maxBarSize={22}
          name="Startups"
        />
        <Bar
          dataKey="enterprises"
          stackId="a"
          fill="#EDE9FE"
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
          name="Enterprises"
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
          <Tooltip content={<ChartTooltip />} />
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
