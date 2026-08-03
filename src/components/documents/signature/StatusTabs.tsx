import { cn } from "@/lib/utils";
import type { SignatureStatus } from "@/lib/documents/signature/types";

export function StatusTabs({
  statuses,
  active,
  counts,
  total,
  onChange,
}: {
  statuses: readonly SignatureStatus[];
  active: SignatureStatus | "All";
  counts: Record<SignatureStatus, number>;
  total: number;
  onChange: (status: SignatureStatus | "All") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
      <TabBtn
        active={active === "All"}
        onClick={() => onChange("All")}
        label="All"
        count={total}
      />
      {statuses.map((s) => (
        <TabBtn
          key={s}
          active={active === s}
          onClick={() => onChange(s)}
          label={s}
          count={counts[s]}
          compact
        />
      ))}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  count,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
        compact && "hidden xl:inline-flex",
        active
          ? "bg-white text-violet-700 shadow-sm"
          : "text-slate-500 hover:text-slate-800",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums",
          active
            ? "bg-violet-100 text-violet-700"
            : "bg-slate-200/80 text-slate-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}
