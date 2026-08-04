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
 * Solid violet "current selection" dropdown, e.g. status for Email/SMS/WhatsApp
 * campaigns, or any other single-select filter that should read as the primary one.
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
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 pr-3 pl-4 text-sm font-semibold text-white shadow-sm"
        >
          {value === "All" ? allLabel : value}
          <span className="rounded-full bg-white/20 px-1.5 text-[12px] font-bold tabular-nums">
            {activeCount}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
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
