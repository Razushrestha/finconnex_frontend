"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  ListFilter,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QueueRow } from "@/lib/work-queue/live";

export type QueueTableFilters = {
  priority: "all" | "High" | "Medium" | "Low";
  status: string;
  due: "all" | "overdue" | "today" | "upcoming";
};

interface WorkQueueTableProps {
  rows: QueueRow[];
  title: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  spinning?: boolean;
  emptyLabel?: string;
  filters: QueueTableFilters;
  onFiltersChange: (f: QueueTableFilters) => void;
  statusOptions: string[];
}

const COLS =
  "grid min-w-[760px] grid-cols-[minmax(220px,2.2fr)_minmax(100px,1fr)_minmax(110px,1fr)_minmax(80px,0.8fr)_minmax(140px,1.2fr)]";

export function WorkQueueTable({
  rows,
  title,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onRefresh,
  spinning,
  emptyLabel = "No records in this queue.",
  filters,
  onFiltersChange,
  statusOptions,
}: WorkQueueTableProps) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const activeFilterCount = [
    filters.priority !== "all",
    filters.status !== "all",
    filters.due !== "all",
  ].filter(Boolean).length;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 pb-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[22px] leading-7 font-bold tracking-tight text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            aria-label={`Refresh ${title}`}
            onClick={onRefresh}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[var(--wq-surface)] hover:text-gray-600"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", spinning && "animate-spin")}
            />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium shadow-[0_1px_0_rgba(15,23,42,0.02)] transition-colors",
            filterOpen || activeFilterCount > 0
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-[var(--wq-line)] text-gray-700 hover:bg-[var(--wq-surface)]",
          )}
        >
          <ListFilter className="h-3.5 w-3.5" />
          Filter
          {activeFilterCount > 0 ? (
            <span className="rounded-md bg-blue-600 px-1.5 py-px text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {filterOpen ? (
        <div className="mx-5 mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--wq-line)] bg-[var(--wq-surface)] px-4 py-3 sm:mx-7">
          <label className="flex min-w-[120px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
              Priority
            </span>
            <select
              value={filters.priority}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priority: e.target.value as QueueTableFilters["priority"],
                })
              }
              className="h-9 rounded-lg border border-[var(--wq-line)] bg-white px-2.5 text-[13px] text-gray-800 outline-none focus:border-blue-600"
            >
              <option value="all">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
              Status
            </span>
            <select
              value={filters.status}
              onChange={(e) =>
                onFiltersChange({ ...filters, status: e.target.value })
              }
              className="h-9 rounded-lg border border-[var(--wq-line)] bg-white px-2.5 text-[13px] text-gray-800 outline-none focus:border-blue-600"
            >
              <option value="all">All</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
              Due
            </span>
            <select
              value={filters.due}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  due: e.target.value as QueueTableFilters["due"],
                })
              }
              className="h-9 rounded-lg border border-[var(--wq-line)] bg-white px-2.5 text-[13px] text-gray-800 outline-none focus:border-blue-600"
            >
              <option value="all">All</option>
              <option value="overdue">Overdue</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              onFiltersChange({
                priority: "all",
                status: "all",
                due: "all",
              });
            }}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-medium text-gray-500 hover:bg-white hover:text-gray-800"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto px-5 pb-2 sm:px-7">
        <div className="overflow-hidden rounded-xl border border-[var(--wq-line)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div
            className={cn(
              COLS,
              "sticky top-0 z-10 border-b border-[var(--wq-line)] bg-[var(--wq-surface)] px-4 py-2.5",
            )}
          >
            {["Subject", "Due Date", "Status", "Priority", "Related To"].map(
              (h) => (
                <span
                  key={h}
                  className="text-[12px] font-semibold tracking-wide text-gray-500"
                >
                  {h}
                </span>
              ),
            )}
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--wq-surface)] text-gray-300">
                <Inbox className="h-5 w-5" />
              </span>
              <p className="text-[13.5px] font-medium text-gray-500">
                {emptyLabel}
              </p>
              <p className="text-[12px] text-gray-400">
                Try another person, time filter, or clear search/filters.
              </p>
            </div>
          ) : (
            rows.map((row) => {
              const overdue =
                row.dueLabel === "Yesterday" ||
                row.dueLabel.includes("overdue");
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => router.push(row.href)}
                  className={cn(
                    COLS,
                    "w-full items-center border-b border-gray-100 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-[var(--wq-surface)]",
                    overdue && "bg-red-50/40 hover:bg-red-50/70",
                  )}
                >
                  <span className="truncate pr-3 text-[13.5px] leading-[18px] font-medium text-gray-900">
                    {row.subject}
                  </span>
                  <span
                    className="text-[13.5px] leading-[18px] font-semibold tabular-nums"
                    style={{ color: row.dueColor }}
                  >
                    {row.dueLabel || ""}
                  </span>
                  <span className="truncate text-[13.5px] leading-[18px] text-gray-600">
                    {row.status}
                  </span>
                  <span className="truncate text-[13.5px] leading-[18px] text-gray-600">
                    {row.priority}
                  </span>
                  <span className="truncate text-[13.5px] leading-[18px] font-medium text-[var(--wq-accent)]">
                    {row.related}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--wq-line)] px-5 py-3.5 sm:px-7">
        <span className="text-[13px] font-medium text-gray-600">
          Total Records{" "}
          <span className="font-bold text-gray-900 tabular-nums">{total}</span>
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-gray-400 tabular-nums">
            {from} to {to}
          </span>
          {totalPages > 1 ? (
            <div className="ml-1 flex items-center gap-0.5">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-[var(--wq-surface)] disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => {
                  if (totalPages <= 5) return true;
                  return n === 1 || n === totalPages || Math.abs(n - page) <= 1;
                })
                .map((n, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showGap = prev != null && n - prev > 1;
                  return (
                    <span key={n} className="contents">
                      {showGap ? (
                        <span className="px-0.5 text-xs text-gray-300">…</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onPageChange(n)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
                          n === page
                            ? "bg-[var(--wq-accent)] text-white shadow-sm"
                            : "text-gray-600 hover:bg-[var(--wq-surface)]",
                        )}
                      >
                        {n}
                      </button>
                    </span>
                  );
                })}
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-[var(--wq-surface)] disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
