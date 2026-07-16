interface TeamStatCardProps {
  title: string;
  value: string;
  delta: string;
  footerLabel: string;
  footerValue: string;
}

export function TeamStatCard({
  title,
  value,
  delta,
  footerLabel,
  footerValue,
}: TeamStatCardProps) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="p-5">
        <div className="mb-6 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-snug text-slate-900">
            {title}
          </h3>
          <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
            {delta}
          </span>
        </div>

        <p className="text-3xl font-semibold text-slate-900">{value}</p>
      </div>

      <div className="border-t border-slate-100 px-6 py-3">
        <p className="text-sm text-slate-500">
          {footerLabel}
          <span className="font-medium text-slate-700">{footerValue}</span>
        </p>
      </div>
    </div>
  );
}
