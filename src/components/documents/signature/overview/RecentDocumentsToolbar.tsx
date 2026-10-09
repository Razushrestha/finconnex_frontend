"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, Check, ChevronDown, ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EMPTY_RECENT_DOC_FILTERS,
  RECENT_DOC_DATE_FIELDS,
  RECENT_DOC_DATE_RANGES,
  RECENT_DOC_SORTS,
  RECENT_DOC_STATUSES,
  recentFilterCount,
  type RecentDocDateField,
  type RecentDocDateRange,
  type RecentDocFilters,
  type RecentDocSort,
  type RecentDocStatus,
} from "@/lib/documents/signature/recent-filters";

const controlClass =
  "h-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200";

export function RecentDocumentsToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  owners,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  sort: RecentDocSort;
  onSortChange: (value: RecentDocSort) => void;
  filters: RecentDocFilters;
  onFiltersChange: (value: RecentDocFilters) => void;
  owners: string[];
}) {
  const activeFilters = recentFilterCount(filters);

  return (
    <div className="flex items-center gap-1.5">
      <label className="relative block w-[264px] max-w-full">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search Document or Applicant Name"
          aria-label="Search Document or Applicant Name"
          className={cn(controlClass, "w-full pr-3 pl-8")}
        />
      </label>
      <AnchoredMenu
        label="Sort"
        icon={<ArrowUpDown className="h-3.5 w-3.5" />}
        active={sort !== "activity-desc"}
      >
        {(close) => (
          <div className="w-52 py-1">
            {RECENT_DOC_SORTS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSortChange(option.value);
                  close();
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs",
                  sort === option.value
                    ? "bg-slate-50 font-semibold text-slate-900 dark:bg-zinc-900 dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900",
                )}
              >
                {option.label}
                {sort === option.value ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            ))}
          </div>
        )}
      </AnchoredMenu>
      <AnchoredMenu
        label="Filter"
        icon={<ListFilter className="h-3.5 w-3.5" />}
        active={activeFilters > 0}
        badge={activeFilters}
      >
        {() => (
          <FilterPanel
            filters={filters}
            owners={owners}
            onChange={onFiltersChange}
          />
        )}
      </AnchoredMenu>
    </div>
  );
}

function MultiSelect({
  label,
  placeholder,
  options,
  selected,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const summary =
    selected.length === 0
      ? placeholder
      : options
          .filter((option) => selected.includes(option.value))
          .map((option) => option.label)
          .join(", ");

  return (
    <div ref={rootRef} className="relative mb-3">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className={cn(controlClass, "flex w-full items-center justify-between gap-2 px-2 text-left")}
      >
        <span className={cn("truncate", selected.length === 0 && "text-slate-500")}>
          {summary || placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      {open ? (
        <div className="absolute top-[calc(100%-2px)] right-0 left-0 z-20 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
          {options.length === 0 ? (
            <p className="px-2.5 py-1.5 text-xs text-slate-400">None available</p>
          ) : (
            options.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onChange(
                      checked
                        ? selected.filter((value) => value !== option.value)
                        : [...selected, option.value],
                    )
                  }
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                      checked
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                        : "border-slate-300 bg-white dark:border-zinc-600 dark:bg-zinc-950",
                    )}
                  >
                    {checked ? <Check className="h-2.5 w-2.5" /> : null}
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function FilterPanel({
  filters,
  owners,
  onChange,
}: {
  filters: RecentDocFilters;
  owners: string[];
  onChange: (value: RecentDocFilters) => void;
}) {
  function patch(next: Partial<RecentDocFilters>) {
    onChange({ ...filters, ...next });
  }

  return (
    <div className="w-[280px] p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">Filter</p>
        <button
          type="button"
          onClick={() => onChange(EMPTY_RECENT_DOC_FILTERS)}
          className="text-[11px] font-semibold text-[var(--brand-primary)] hover:underline"
        >
          Clear
        </button>
      </div>

      <MultiSelect
        label="Status"
        placeholder="All statuses"
        options={RECENT_DOC_STATUSES.map((status) => ({
          value: status,
          label: status,
        }))}
        selected={filters.statuses}
        onChange={(statuses) => patch({ statuses: statuses as RecentDocStatus[] })}
      />

      <MultiSelect
        label="Owner"
        placeholder="All owners"
        options={owners.map((owner) => ({ value: owner, label: owner }))}
        selected={filters.owners}
        onChange={(owners) => patch({ owners })}
      />

      <label className="mb-3 block">
        <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          Date
        </span>
        <select
          value={filters.dateField}
          onChange={(event) =>
            patch({ dateField: event.target.value as RecentDocDateField })
          }
          aria-label="Date field"
          className={cn(controlClass, "w-full px-2")}
        >
          {RECENT_DOC_DATE_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="sr-only">Date range</span>
        <select
          value={filters.dateRange}
          onChange={(event) =>
            patch({ dateRange: event.target.value as RecentDocDateRange })
          }
          aria-label="Date range"
          className={cn(controlClass, "w-full px-2")}
        >
          {RECENT_DOC_DATE_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </label>

      {filters.dateRange === "custom" ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-slate-400">From</span>
            <input
              type="date"
              value={filters.customFrom}
              onChange={(event) => patch({ customFrom: event.target.value })}
              aria-label="From date"
              className={cn(controlClass, "w-full px-2")}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-slate-400">To</span>
            <input
              type="date"
              value={filters.customTo}
              onChange={(event) => patch({ customTo: event.target.value })}
              aria-label="To date"
              className={cn(controlClass, "w-full px-2")}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function AnchoredMenu({
  label,
  icon,
  active,
  badge,
  children,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  badge?: number;
  children: (close: () => void) => ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          place();
          setOpen((current) => !current);
        }}
        className={cn(
          controlClass,
          "inline-flex items-center gap-1.5 px-2.5 font-semibold",
          active && "border-[var(--brand-primary)] text-[var(--brand-primary)]",
        )}
      >
        {icon}
        {label}
        {badge ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] text-white">
            {badge}
          </span>
        ) : null}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[80] rounded-xl border border-slate-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
              style={{ top: position.top, right: position.right }}
            >
              {children(() => setOpen(false))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
