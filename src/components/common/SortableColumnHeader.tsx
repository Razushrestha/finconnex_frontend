"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  type ColumnSort,
  toggleColumnSort,
} from "@/lib/tables/column-sort";
import { cn } from "@/lib/utils";

export function SortableColumnHeader({
  label,
  field,
  sort,
  onSort,
  className,
  disabled = false,
}: {
  label: React.ReactNode;
  field: string;
  sort: ColumnSort;
  onSort: (field: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const active = sort?.field === field;
  const Icon = !active
    ? ChevronsUpDown
    : sort?.direction === "asc"
      ? ChevronUp
      : ChevronDown;

  if (disabled) {
    return (
      <span className={cn("block min-w-0 truncate", className)}>{label}</span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      aria-label={`Sort by ${typeof label === "string" ? label : field}`}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 pr-1.5 text-left font-inherit tracking-inherit uppercase",
        active ? "text-[#5A32A3]" : "text-inherit hover:text-slate-700",
        className,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <Icon
        className={cn(
          "ml-auto h-3.5 w-3.5 shrink-0",
          active ? "text-[#5A32A3]" : "text-slate-400",
        )}
        aria-hidden
      />
    </button>
  );
}

export function nextListSort(sort: ColumnSort, field: string): ColumnSort {
  return toggleColumnSort(sort, field);
}
