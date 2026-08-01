"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterEnter } from "@/lib/motion";
import { COMPANY_STATUSES } from "@/lib/companies/types";

export interface CompanyFilters {
  statuses: string[];
  sources: string[];
}

export const EMPTY_COMPANY_FILTERS: CompanyFilters = {
  statuses: [],
  sources: [],
};

interface FilterCompaniesPanelProps {
  filters: CompanyFilters;
  onToggleField: (section: "status" | "source", field: string) => void;
  onClose?: () => void;
}

export function FilterCompaniesPanel({
  filters,
  onToggleField,
  onClose,
}: FilterCompaniesPanelProps) {
  const [search, setSearch] = useState("");
  const [statusCollapsed, setStatusCollapsed] = useState(false);
  const [sourceCollapsed, setSourceCollapsed] = useState(false);

  // Example source options (update or import from your types if available)
  const sourceOptions = ["Inbound", "Outbound", "Partner", "Referral"];

  const filteredStatuses = useMemo(() => {
    if (!search.trim()) return COMPANY_STATUSES;
    return COMPANY_STATUSES.filter((f) =>
      f.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  return (
    <div
      className={cn(
        "flex h-full w-56 shrink-0 flex-col rounded-2xl border border-slate-100 bg-white shadow-sm",
        filterEnter,
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Filter Companies
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

      <div className="border-b border-slate-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filters..."
            className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-8 text-xs text-slate-700 placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* Status Section */}
        <div>
          <button
            type="button"
            onClick={() => setStatusCollapsed((v) => !v)}
            className="mb-1.5 flex w-full items-center justify-between py-1 text-xs font-semibold tracking-wide text-slate-500 uppercase hover:text-slate-700"
          >
            Status
            {statusCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>

          {!statusCollapsed && (
            <div className="space-y-2">
              {filteredStatuses.map((field) => (
                <label
                  key={field}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(field)}
                    onChange={() => onToggleField("status", field)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-violet-500 focus:ring-violet-300"
                  />
                  {field}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Source Section */}
        <div>
          <button
            type="button"
            onClick={() => setSourceCollapsed((v) => !v)}
            className="mb-1.5 flex w-full items-center justify-between py-1 text-xs font-semibold tracking-wide text-slate-500 uppercase hover:text-slate-700"
          >
            Source
            {sourceCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>

          {!sourceCollapsed && (
            <div className="space-y-2">
              {sourceOptions.map((field) => (
                <label
                  key={field}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={filters.sources.includes(field)}
                    onChange={() => onToggleField("source", field)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-violet-500 focus:ring-violet-300"
                  />
                  {field}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
