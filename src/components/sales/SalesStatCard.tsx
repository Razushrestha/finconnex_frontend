import { LucideIcon } from "lucide-react";

type TrendTone = "positive" | "negative";

interface SalesStatCardProps {
  icon: LucideIcon;
  iconColorClass?: string;
  label: string;
  value: string;
  trend?: {
    value: string;
    tone: TrendTone;
  };
}

export function SalesStatCard({
  icon: Icon,
  iconColorClass = "text-slate-500",
  label,
  value,
  trend,
}: SalesStatCardProps) {
  return (
    <div className="rounded-md border border-slate-200/80 bg-white p-4 shadow-2xs">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColorClass}`} strokeWidth={2} />
        <p className="text-sm text-slate-500">{label}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xl font-semibold text-slate-900">{value}</span>

        {trend && (
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
              trend.tone === "positive"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-500"
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
