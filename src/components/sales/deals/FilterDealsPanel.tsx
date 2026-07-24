"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterEnter } from "@/lib/motion";

export interface DealFilters {
  stages: string[];
}

export const EMPTY_DEAL_FILTERS: DealFilters = { stages: [] };

interface FilterDealsPanelProps {
  /** Stage titles for the currently active pipeline: these vary per pipeline, so they're passed in rather than hardcoded. */
  stageOptions: string[];
  filters: DealFilters;
  onToggleField: (field: string) => void;
  onClose?: () => void;
}

export function FilterDealsPanel({
  stageOptions,
  filters,
  onToggleField,
  onClose,
}: FilterDealsPanelProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return stageOptions;
    return stageOptions.filter((f) =>
      f.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, stageOptions]);

  return (
    <div className={cn("flex h-full w-48 shrink-0 flex-col rounded-2xl border border-slate-100 bg-white shadow-sm", filterEnter)}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Filter Deals by
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter panel"
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search */}
      <div className="border-b border-slate-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Section */}
      <div className="flex-1 overflow-y-auto px-3 py-2 [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="mb-1.5 flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            Stage
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>

          {!collapsed && (
            <div className="space-y-2">
              {filteredOptions.map((field) => (
                <label
                  key={field}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={filters.stages.includes(field)}
                    onChange={() => onToggleField(field)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
                  />
                  {field}
                </label>
              ))}
            </div>
          )}
        </div>

        {filteredOptions.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-400">
            No stages match your search.
          </p>
        )}
      </div>
    </div>
  );
}
