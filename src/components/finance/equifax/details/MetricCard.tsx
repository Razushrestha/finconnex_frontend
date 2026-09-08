import React from "react";
import { Badge } from "@/components/ui/badge";

interface MetricCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  valueColor?: string;
  badgeText?: string;
  badgeVariant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "ghost"
    | "link";
  footnote?: string;
}

export default function MetricCard({
  icon,
  label,
  value,
  valueColor = "text-slate-900",
  badgeText,
  badgeVariant = "outline",
  footnote,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            {icon}
          </span>
        )}
      </div>

      <p className={`mt-2 text-md 3xl:text-xl font-semibold ${valueColor}`}>
        {value}
      </p>

      {badgeText && (
        <div className="mt-2">
          <Badge variant={badgeVariant}>{badgeText}</Badge>
        </div>
      )}

      {footnote && (
        <p className="mt-1 text-[11px] text-slate-400">{footnote}</p>
      )}
    </div>
  );
}
