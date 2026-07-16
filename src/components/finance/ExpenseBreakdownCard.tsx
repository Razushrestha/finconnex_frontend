"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface ExpenseSlice {
  name: string;
  percentage: number;
  colorClass: string; // legend swatch + pie slice fill
  fill: string;
}

const expenses: ExpenseSlice[] = [
  {
    name: "Salaries",
    percentage: 40,
    colorClass: "bg-indigo-100",
    fill: "#e0e7ff",
  },
  {
    name: "Rent",
    percentage: 30,
    colorClass: "bg-indigo-200",
    fill: "#c7d2fe",
  },
  {
    name: "Software",
    percentage: 20,
    colorClass: "bg-indigo-400",
    fill: "#818cf8",
  },
  {
    name: "Marketing",
    percentage: 10,
    colorClass: "bg-indigo-600",
    fill: "#4f46e5",
  },
];

const totalSources = 2000;

export function ExpenseBreakdownCard() {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="mb-4 text-base font-semibold text-slate-900 sm:text-lg">
        Expense Breakdown
      </h3>

      {/* Donut */}
      <div className="relative mx-auto h-44 w-44 sm:h-56 sm:w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={expenses}
              dataKey="percentage"
              nameKey="name"
              innerRadius="70%"
              outerRadius="100%"
              paddingAngle={3}
              cornerRadius={6}
              startAngle={90}
              endAngle={450}
              stroke="none"
            >
              {expenses.map((slice) => (
                <Cell key={slice.name} fill={slice.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {totalSources.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 sm:text-sm">Sources</span>
        </div>
      </div>

      {/* Legend */}
      <ul className="mt-4 space-y-2.5 sm:mt-6 sm:space-y-3">
        {expenses.map((slice) => (
          <li
            key={slice.name}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-sm ${slice.colorClass}`} />
              <span className="text-slate-500">{slice.name}</span>
            </div>
            <span className="font-semibold text-slate-800">
              {slice.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
