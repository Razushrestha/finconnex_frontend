import React, { ReactNode } from "react";

interface StatCardProps {
  icon?: ReactNode;
  iconBg?: string;
  iconColor?: string;
  label: string;
  value: string | number;
  valueSuffix?: string;
  description?: string;
  descriptionColor?: string;
}

export default function StatCard({
  icon,
  iconBg = "bg-violet-100",
  iconColor = "text-violet-600",
  label,
  value,
  valueSuffix,
  description,
  descriptionColor = "text-slate-500",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {icon && (
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
          >
            {icon}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-semibold text-slate-900">{value}</span>
        {valueSuffix && (
          <span className="text-base font-medium text-slate-400">
            {valueSuffix}
          </span>
        )}
      </div>

      {description && (
        <p className={`mt-2 text-xs leading-snug ${descriptionColor}`}>
          {description}
        </p>
      )}
    </div>
  );
}
