import { LucideIcon } from "lucide-react";

type TrendTone = "positive" | "negative";

interface SalesStatCardProps {
  icon: LucideIcon;
  iconColorClass: string;
  label: string;
  value: string;
  trend?: {
    value: string;
    tone: TrendTone;
  };
}

export function SalesStatCard({
  icon: Icon,
  iconColorClass,
  label,
  value,
  trend,
}: SalesStatCardProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <div
        className={`mb-6 flex h-11 w-11 items-center justify-center rounded-full ${iconColorClass}`}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>

      <p className="mb-1.5 text-sm text-slate-500">{label}</p>

      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold text-slate-900">{value}</span>

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
