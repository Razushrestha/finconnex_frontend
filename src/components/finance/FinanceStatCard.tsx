import { LucideIcon } from "lucide-react";

interface FinanceStatCardProps {
  icon: LucideIcon;
  iconColorClass: string;
  label: string;
  value: string;
}

export function FinanceStatCard({
  icon: Icon,
  iconColorClass,
  label,
  value,
}: FinanceStatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconColorClass}`}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>

      <div className="flex flex-col">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
