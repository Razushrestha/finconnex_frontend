"use client";

import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "./DropdownMenu";

interface StatusDropdownProps<S extends string> {
  statuses: readonly S[];
  /** Count per status, e.g. from a useMemo tally over the current rows. */
  counts: Record<S, number>;
  totalCount: number;
  value: S | "All";
  onChange: (value: S | "All") => void;
  allLabel?: string;
}

/**
 * Compact outlined status scope control for marketing list toolbars.
 */
export function StatusDropdown<S extends string>({
  statuses,
  counts,
  totalCount,
  value,
  onChange,
  allLabel = "All",
}: StatusDropdownProps<S>) {
  const activeCount = value === "All" ? totalCount : counts[value];

  return (
    <DropdownMenu
      align="left"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          {value === "All" ? allLabel : value}
          <span className="rounded-full bg-violet-100 px-1.5 text-[10px] font-bold tabular-nums text-violet-700">
            {activeCount}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      )}
    >
      <DropdownMenuItem
        label={allLabel}
        count={totalCount}
        active={value === "All"}
        onClick={() => onChange("All")}
      />
      <div className="my-1 border-t border-slate-100" />
      {statuses.map((s) => (
        <DropdownMenuItem
          key={s}
          label={s}
          count={counts[s]}
          active={value === s}
          onClick={() => onChange(s)}
        />
      ))}
    </DropdownMenu>
  );
}
