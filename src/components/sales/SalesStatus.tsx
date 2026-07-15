interface StatusItem {
  label: string;
  percentage: number;
  colorClass: string;
}

const statuses: StatusItem[] = [
  { label: "Paid", percentage: 75, colorClass: "bg-indigo-500" },
  { label: "Cancelled", percentage: 22, colorClass: "bg-indigo-300" },
  { label: "Refunded", percentage: 3, colorClass: "bg-indigo-100" },
];

export function SalesStatus() {
  return (
    <div>
      <h4 className="mb-4 text-base font-semibold text-slate-900">
        Sales Status
      </h4>

      {/* Segmented bar */}
      <div className="mb-5 flex h-2.5 w-full overflow-hidden rounded-full">
        {statuses.map((status) => (
          <div
            key={status.label}
            className={`${status.colorClass} ${
              status.label !== "Refunded" ? "mr-0.5" : ""
            }`}
            style={{ width: `${status.percentage}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <ul className="space-y-3">
        {statuses.map((status) => (
          <li
            key={status.label}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-sm ${status.colorClass}`} />
              <span className="text-slate-500">{status.label}</span>
            </div>
            <span className="font-semibold text-slate-800">
              {status.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
