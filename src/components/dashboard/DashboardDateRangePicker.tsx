"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DASHBOARD_DATE_RANGE_OPTIONS,
  toDateInput,
  type DashboardDateRange,
  type DashboardFilters,
} from "@/lib/dashboard/layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type DateFilters = Pick<DashboardFilters, "dateRange" | "dateFrom" | "dateTo">;

function DateRangeMenuBody({
  filters,
  onChange,
}: {
  filters: DateFilters;
  onChange: (next: Partial<DateFilters>) => void;
}) {
  const now = new Date();
  const [from, setFrom] = useState(filters.dateFrom ?? toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(filters.dateTo ?? toDateInput(now));
  const [customOpen, setCustomOpen] = useState(filters.dateRange === "custom");

  function pick(range: DashboardDateRange) {
    setCustomOpen(false);
    onChange({ dateRange: range, dateFrom: undefined, dateTo: undefined });
  }

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel className="px-1.5 py-0.5 text-[9px] tracking-wide text-slate-400 uppercase">
          Quick selections
        </DropdownMenuLabel>
        {DASHBOARD_DATE_RANGE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={cn(
              "px-1.5 py-0.5 text-[12px]",
              filters.dateRange === option.value && "bg-violet-50 font-semibold text-[#5A32A3]",
            )}
            onClick={() => pick(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel className="px-1.5 py-0.5 text-[9px] tracking-wide text-slate-400 uppercase">
          Custom
        </DropdownMenuLabel>
        <DropdownMenuItem
          className={cn(
            "px-1.5 py-0.5 text-[12px]",
            filters.dateRange === "custom" && "bg-violet-50 font-semibold text-[#5A32A3]",
          )}
          closeOnClick={false}
          onClick={() => setCustomOpen(true)}
        >
          Custom Date Range…
        </DropdownMenuItem>
        {customOpen ? (
          <div
            className="mt-1 space-y-1.5 rounded-md bg-slate-50 px-1.5 py-1.5"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <label className="block text-[10px] font-medium text-slate-500">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-800"
              />
            </label>
            <label className="block text-[10px] font-medium text-slate-500">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-800"
              />
            </label>
            <button
              type="button"
              onClick={() =>
                onChange({
                  dateRange: "custom",
                  dateFrom: from,
                  dateTo: to,
                })
              }
              className="w-full rounded bg-[#5A32A3] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#4a2788]"
            >
              Apply
            </button>
          </div>
        ) : null}
      </DropdownMenuGroup>
    </>
  );
}

export function DashboardDateRangePicker({
  filters,
  onChange,
  variant = "submenu",
}: {
  filters: DateFilters;
  onChange: (next: Partial<DateFilters>) => void;
  variant?: "submenu" | "standalone";
}) {
  if (variant === "standalone") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none hover:bg-slate-50">
          Date Range
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="!w-44 min-w-44 p-1">
          <DateRangeMenuBody filters={filters} onChange={onChange} />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="text-[13px]">
        Date Range
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent align="start" side="left" className="!w-44 min-w-44 p-1">
        <DateRangeMenuBody filters={filters} onChange={onChange} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
