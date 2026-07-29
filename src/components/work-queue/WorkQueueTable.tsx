"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Edit,
  Inbox,
  ListFilter,
  MoreHorizontal,
  RefreshCw,
  Rows3,
  Ruler,
  Settings2,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { QueueRow } from "@/lib/work-queue/live";
import {
  DEFAULT_MANAGE_COLUMNS,
  ManageColumnsModal,
} from "./ManageColumnsModal";

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
  onManageColumns?: () => void;
  onPageSizeChange?: (size: number) => void;
  onEditRow?: (row: QueueRow) => void;
  onDeleteRow?: (row: QueueRow) => void;
  onAddNote?: (row: QueueRow) => void;
  onCompleteRow?: (row: QueueRow) => void;
}

const COLS =
  "grid min-w-[1180px] grid-cols-[64px_minmax(220px,2fr)_minmax(110px,0.9fr)_minmax(110px,0.9fr)_minmax(80px,0.7fr)_minmax(160px,1.3fr)_minmax(140px,1.1fr)_minmax(120px,1fr)_minmax(110px,0.9fr)_40px]";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

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
  onManageColumns,
  onPageSizeChange,
  onEditRow,
  onDeleteRow,
  onAddNote,
  onCompleteRow,
}: WorkQueueTableProps) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const [optionsMenuOpen, setOptionsMenuOpen] = React.useState(false);
  const [pageSizeFlyoutOpen, setPageSizeFlyoutOpen] = React.useState(false);
  const optionsButtonRef = React.useRef<HTMLButtonElement>(null);
  const optionsPortalRef = React.useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = React.useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });

  const [manageColumnsOpen, setManageColumnsOpen] = React.useState(false);
  const [manageColumns, setManageColumns] = React.useState<ManageColumn[]>(
    DEFAULT_MANAGE_COLUMNS,
  );

  // Close row action popup when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    if (activeMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuId]);

  // Close header options menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        optionsButtonRef.current?.contains(target) ||
        optionsPortalRef.current?.contains(target)
      ) {
        return;
      }
      setOptionsMenuOpen(false);
    }
    if (optionsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [optionsMenuOpen]);

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

      <div className="min-h-0 flex-1 overflow-auto border-t border-[var(--wq-line)]">
        <div className="min-h-[420px]">
          <div
            className={cn(
              COLS,
              "sticky top-0 z-10 border-b border-[var(--wq-line)] bg-white px-5 py-2.5 sm:px-7",
            )}
          >
            <span aria-hidden />
            {[
              "Subject",
              "Due Date",
              "Status",
              "Priority",
              "Related To",
              "Contact Name",
              "File Handler",
              "Tag",
            ].map((h) => (
              <span
                key={h}
                className="truncate text-[12px] font-semibold tracking-wide text-gray-500"
              >
                {h}
              </span>
            ))}

            <div className="relative flex justify-end">
              <button
                ref={optionsButtonRef}
                type="button"
                onClick={() => {
                  if (!optionsMenuOpen && optionsButtonRef.current) {
                    const rect =
                      optionsButtonRef.current.getBoundingClientRect();
                    setMenuPos({
                      top: rect.bottom + 4,
                      right: window.innerWidth - rect.right,
                    });
                  }
                  setOptionsMenuOpen((v) => !v);
                }}
                aria-label="Table display options"
                className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>

              {optionsMenuOpen && typeof document !== "undefined"
                ? createPortal(
                    <div
                      ref={optionsPortalRef}
                      style={{
                        position: "fixed",
                        top: menuPos.top,
                        right: menuPos.right,
                      }}
                      className="z-50 w-56 rounded-xl border border-[var(--wq-line)] bg-white py-1.5 text-[13px] shadow-lg"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setManageColumnsOpen(true);
                          setOptionsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-gray-700 hover:bg-[var(--wq-surface)]"
                      >
                        <Columns3 className="h-4 w-4 text-gray-400" />
                        Manage Columns
                      </button>

                      <button
                        type="button"
                        disabled
                        className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2 text-left text-gray-300"
                      >
                        <Ruler className="h-4 w-4 text-gray-300" />
                        Reset Column Size
                      </button>

                      <div className="my-1 border-t border-[var(--wq-line)]" />

                      <div
                        className="relative"
                        onMouseEnter={() => setPageSizeFlyoutOpen(true)}
                        onMouseLeave={() => setPageSizeFlyoutOpen(false)}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2.5 px-3.5 py-2 text-left text-gray-700 hover:bg-[var(--wq-surface)]"
                        >
                          <span className="flex items-center gap-2.5">
                            <Rows3 className="h-4 w-4 text-gray-400" />
                            Records per page
                          </span>
                          <span className="flex items-center gap-0.5 text-gray-400">
                            {pageSize}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </button>

                        {pageSizeFlyoutOpen ? (
                          <div className="absolute right-full top-0 mr-1 w-28 rounded-xl border border-[var(--wq-line)] bg-white py-1.5 shadow-lg">
                            {PAGE_SIZE_OPTIONS.map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  onPageSizeChange?.(size);
                                  setOptionsMenuOpen(false);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between px-3.5 py-1.5 text-left text-gray-700 hover:bg-[var(--wq-surface)]",
                                  pageSize === size &&
                                    "font-semibold text-gray-900",
                                )}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>,
                    document.body,
                  )
                : null}
            </div>
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
              const isMenuOpen = activeMenuId === row.id;

              return (
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(row.href)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(row.href);
                    }
                  }}
                  className={cn(
                    COLS,
                    "group w-full cursor-pointer items-center border-b border-gray-100 px-5 py-1.5 text-left transition-colors last:border-b-0 hover:bg-[var(--wq-surface)] sm:px-7",
                    overdue && "bg-red-50/30 hover:bg-red-50/60",
                  )}
                >
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <div
                      className="relative inline-block text-left"
                      ref={isMenuOpen ? menuRef : undefined}
                    >
                      <button
                        type="button"
                        aria-label="More actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : row.id);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-white hover:text-gray-600"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute left-0 top-7 z-50 mt-1 w-36 origin-top-left rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              onEditRow?.(row);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <Edit className="h-3.5 w-3.5 text-gray-400" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              onDeleteRow?.(row);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label="Add note"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddNote?.(row);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-white hover:text-gray-600"
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Mark complete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompleteRow?.(row);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

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
                  <span className="truncate text-[13.5px] leading-[18px] text-gray-600">
                    {row.contactName ?? ""}
                  </span>
                  <span className="truncate text-[13.5px] leading-[18px] text-gray-600">
                    {row.fileHandler ?? ""}
                  </span>
                  <span className="truncate text-[13.5px] leading-[18px] text-gray-600">
                    {row.tag ?? ""}
                  </span>
                  <span aria-hidden />
                </div>
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

      <ManageColumnsModal
        open={manageColumnsOpen}
        columns={manageColumns}
        onClose={() => setManageColumnsOpen(false)}
        onSave={(cols) => {
          setManageColumns(cols);
          onManageColumns?.();
          setManageColumnsOpen(false);
        }}
      />
    </div>
  );
}
