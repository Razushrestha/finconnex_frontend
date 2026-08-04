"use client";

import { Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuItem } from "./DropdownMenu";

interface FilterDropdownProps<T extends string> {
  /** Trigger label, e.g. "Filter" or "Channel" */
  label?: string;
  options: readonly T[];
  value: T | "All";
  onChange: (value: T | "All") => void;
  allLabel?: string;
}

/**
 * Secondary, outlined filter dropdown — used for campaign type, channel,
 * template, or any other single-select filter that sits next to search.
 */
export function FilterDropdown<T extends string>({
  label = "Filter",
  options,
  value,
  onChange,
  allLabel = "All",
}: FilterDropdownProps<T>) {
  const isActive = value !== "All";

  return (
    <DropdownMenu
      align="right"
      panelClassName="w-52"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors",
            isActive
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          <Filter className="h-4 w-4" />
          {label}
          {isActive ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
              1
            </span>
          ) : null}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
    >
      <DropdownMenuItem
        label={allLabel}
        active={value === "All"}
        onClick={() => onChange("All")}
      />
      <div className="my-1 border-t border-slate-100" />
      {options.map((opt) => (
        <DropdownMenuItem
          key={opt}
          label={opt}
          active={value === opt}
          onClick={() => onChange(opt)}
        />
      ))}
    </DropdownMenu>
  );
}
