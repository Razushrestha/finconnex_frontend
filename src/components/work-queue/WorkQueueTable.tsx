"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Edit,
  EllipsisVertical,
  FileText,
  Inbox,
  ListFilter,
  RefreshCw,
  Rows3,
  Ruler,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type {
  QueueRow,
  QueueSortDirection,
  QueueSortField,
} from "@/lib/work-queue/live";
import { QUEUE_SORT_OPTIONS } from "@/lib/work-queue/live";
import {
  DEFAULT_MANAGE_COLUMNS,
  ManageColumnsModal,
  type ManageColumn,
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
  sortField?: QueueSortField;
  sortDirection?: QueueSortDirection;
  onSortChange?: (field: QueueSortField | undefined, direction: QueueSortDirection) => void;
  statusOptions: string[];
  onManageColumns?: () => void;
  onPageSizeChange?: (size: number) => void;
  onEditRow?: (row: QueueRow) => void;
  onDeleteRow?: (row: QueueRow) => void;
  onAddNote?: (row: QueueRow) => void;
  onCompleteRow?: (row: QueueRow) => void;
}

const ACTIONS_COL = "96px";
const SETTINGS_COL = "40px";

/** Preferred track sizes keyed by Manage Column id. */
const COL_TRACK: Record<string, string> = {
  subject: "minmax(200px,2.2fr)",
  dueDate: "minmax(100px,0.85fr)",
  status: "minmax(100px,0.85fr)",
  priority: "minmax(80px,0.7fr)",
  relatedTo: "minmax(140px,1.2fr)",
  contactName: "minmax(120px,1fr)",
  fileHandler: "minmax(110px,0.95fr)",
  tag: "minmax(90px,0.8fr)",
  taskOwner: "minmax(110px,0.95fr)",
  createdTime: "minmax(120px,0.95fr)",
  modifiedBy: "minmax(110px,0.9fr)",
  modifiedTime: "minmax(120px,0.95fr)",
  closedTime: "minmax(120px,0.95fr)",
  createdBy: "minmax(110px,0.9fr)",
  description: "minmax(160px,1.4fr)",
  lastActivityTime: "minmax(130px,1fr)",
};

const COL_MIN_PX: Record<string, number> = {
  subject: 200,
  dueDate: 100,
  status: 100,
  priority: 80,
  relatedTo: 140,
  contactName: 120,
  fileHandler: 110,
  tag: 90,
  taskOwner: 110,
  createdTime: 120,
  modifiedBy: 110,
  modifiedTime: 120,
  closedTime: 120,
  createdBy: 110,
  description: 160,
  lastActivityTime: 130,
};

const STORAGE_KEY = "finconnex.work-queue.manage-columns";
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function loadManageColumns(): ManageColumn[] {
  if (typeof window === "undefined") return DEFAULT_MANAGE_COLUMNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MANAGE_COLUMNS;
    const saved = JSON.parse(raw) as ManageColumn[];
    if (!Array.isArray(saved) || saved.length === 0) {
      return DEFAULT_MANAGE_COLUMNS;
    }
    const byId = new Map(saved.map((c) => [c.id, c]));
    // Merge defaults so newly added column defs still appear.
    const merged = DEFAULT_MANAGE_COLUMNS.map((def) => {
      const s = byId.get(def.id);
      if (!s) return def;
      return {
        ...def,
        checked: def.required ? true : Boolean(s.checked),
        pinned: Boolean(s.pinned),
      };
    });
    // Preserve saved order for known ids, append any new defaults at end.
    const order = saved.map((c) => c.id).filter((id) => merged.some((m) => m.id === id));
    const ordered = order
      .map((id) => merged.find((m) => m.id === id)!)
      .concat(merged.filter((m) => !order.includes(m.id)));
    return ordered;
  } catch {
    return DEFAULT_MANAGE_COLUMNS;
  }
}

function persistManageColumns(cols: ManageColumn[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
  } catch {
    /* ignore quota / private mode */
  }
}

function visibleColumns(columns: ManageColumn[]): ManageColumn[] {
  const checked = columns.filter((c) => c.checked);
  const pinned = checked.filter((c) => c.pinned || c.required);
  const rest = checked.filter((c) => !c.pinned && !c.required);
  return [...pinned, ...rest];
}

function buildGridTemplate(cols: ManageColumn[]): string {
  const tracks = cols.map((c) => COL_TRACK[c.id] ?? "minmax(110px,1fr)");
  return `${ACTIONS_COL} ${tracks.join(" ")} ${SETTINGS_COL}`;
}

function buildMinWidth(cols: ManageColumn[]): number {
  const gap = 12; // gap-x-3
  const n = cols.length + 2; // actions + settings
  const sum =
    96 +
    40 +
    cols.reduce((acc, c) => acc + (COL_MIN_PX[c.id] ?? 110), 0) +
    gap * (n - 1);
  return sum;
}

function cellText(row: QueueRow, colId: string): string {
  switch (colId) {
    case "subject":
      return row.subject;
    case "dueDate":
      return row.dueLabel || "";
    case "status":
      return row.status;
    case "priority":
      return row.priority;
    case "relatedTo":
      return row.related;
    case "contactName":
      return row.contactName ?? "";
    case "fileHandler":
      return row.fileHandler ?? "";
    case "tag":
      return row.tag ?? "";
    case "taskOwner":
      return row.taskOwner ?? "";
    case "createdTime":
      return row.createdTime ?? "";
    case "modifiedBy":
      return row.modifiedBy ?? "";
    case "modifiedTime":
      return row.modifiedTime ?? "";
    case "closedTime":
      return row.closedTime ?? "";
    case "createdBy":
      return row.createdBy ?? "";
    case "description":
      return row.description ?? "";
    case "lastActivityTime":
      return row.lastActivityTime ?? "";
    default:
      return "";
  }
}

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
  sortField,
  sortDirection = "asc",
  onSortChange,
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
  const [sortOpen, setSortOpen] = React.useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);
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

  React.useEffect(() => {
    setManageColumns(loadManageColumns());
  }, []);

  const visibleCols = React.useMemo(
    () => visibleColumns(manageColumns),
    [manageColumns],
  );
  const gridTemplate = React.useMemo(
    () => buildGridTemplate(visibleCols),
    [visibleCols],
  );
  const tableMinWidth = React.useMemo(
    () => buildMinWidth(visibleCols),
    [visibleCols],
  );
  const gridStyle = React.useMemo(
    () =>
      ({
        gridTemplateColumns: gridTemplate,
        minWidth: tableMinWidth,
      }) as React.CSSProperties,
    [gridTemplate, tableMinWidth],
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

  React.useEffect(() => {
    if (!sortOpen) return;
    function onDoc(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSortOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  function applySort(field: QueueSortField) {
    if (!onSortChange) return;
    if (sortField === field) {
      onSortChange(field, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSortChange(field, "asc");
    }
  }

  function clearSort() {
    onSortChange?.(undefined, "asc");
    setSortOpen(false);
  }

  function sortDirectionHint(id: QueueSortField): string {
    if (id === "dueDate") return sortDirection === "asc" ? "Soonest" : "Latest";
    if (id === "priority") return sortDirection === "asc" ? "High first" : "Low first";
    return sortDirection === "asc" ? "A → Z" : "Z → A";
  }

  const activeSortLabel =
    QUEUE_SORT_OPTIONS.find((opt) => opt.id === sortField)?.label ?? "Sort";
  const sortableIds = new Set<string>(QUEUE_SORT_OPTIONS.map((opt) => opt.id));

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const activeFilterCount = [
    filters.priority !== "all",
    filters.status !== "all",
    filters.due !== "all",
  ].filter(Boolean).length;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--wq-line)] px-5 pt-4 pb-3 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h2 className="truncate text-[18px] leading-6 font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          <span className="shrink-0 text-[12px] font-medium tabular-nums text-slate-400">
            {total}
          </span>
          <button
            type="button"
            aria-label={`Refresh ${title}`}
            title="Refresh"
            onClick={onRefresh}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", spinning && "animate-spin")}
            />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 px-2.5 text-[13px] font-medium transition-colors",
              filterOpen || activeFilterCount > 0
                ? "text-[var(--wq-accent)]"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <ListFilter className="h-3.5 w-3.5" />
            Filter
            {activeFilterCount > 0 ? (
              <span className="text-[11px] font-semibold tabular-nums">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <div className="relative flex items-center" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-label="Sort options"
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 px-2.5 text-[13px] font-medium transition-colors",
                sortOpen || sortField
                  ? "text-[var(--wq-accent)]"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {activeSortLabel}
              {sortField ? (
                <span className="text-[11px] font-semibold tabular-nums">
                  {sortDirection === "asc" ? "↑" : "↓"}
                </span>
              ) : null}
            </button>
            {sortField ? (
              <button
                type="button"
                aria-label="Clear sort"
                title="Clear sort"
                onClick={clearSort}
                className="-ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {sortOpen ? (
              <div className="absolute top-full right-0 z-40 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <p className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Sort by
                </p>
                {QUEUE_SORT_OPTIONS.map((opt) => {
                  const active = sortField === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitem"
                      onClick={() => applySort(opt.id)}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-violet-50",
                        active
                          ? "font-semibold text-[var(--wq-accent)]"
                          : "text-slate-700",
                      )}
                    >
                      <span>{opt.label}</span>
                      {active ? (
                        <span className="text-[11px] font-medium text-slate-400">
                          {sortDirectionHint(opt.id)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {sortField ? (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={clearSort}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    >
                      <X className="h-3.5 w-3.5" />
                      Default order
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {filterOpen ? (
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-[var(--wq-line)] bg-[var(--wq-surface)]/60 px-5 py-3 sm:px-6">
          <label className="flex min-w-[120px] flex-col gap-1">
            <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
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
              className="h-8 border-0 border-b border-slate-200 bg-transparent px-0 text-[13px] text-slate-800 outline-none focus:border-[var(--wq-accent)]"
            >
              <option value="all">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>
          <label className="flex min-w-[140px] flex-col gap-1">
            <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              Status
            </span>
            <select
              value={filters.status}
              onChange={(e) =>
                onFiltersChange({ ...filters, status: e.target.value })
              }
              className="h-8 border-0 border-b border-slate-200 bg-transparent px-0 text-[13px] text-slate-800 outline-none focus:border-[var(--wq-accent)]"
            >
              <option value="all">All</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[140px] flex-col gap-1">
            <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
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
              className="h-8 border-0 border-b border-slate-200 bg-transparent px-0 text-[13px] text-slate-800 outline-none focus:border-[var(--wq-accent)]"
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
            className="inline-flex h-8 items-center gap-1 text-[12.5px] font-medium text-slate-500 transition-colors hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-h-[420px]">
          <div
            style={gridStyle}
            className="sticky top-0 z-10 grid gap-x-3 border-b border-[var(--wq-line)] bg-white px-5 py-2 sm:px-6"
          >
            <span aria-hidden />
            {visibleCols.map((col) => {
              const sortable = sortableIds.has(col.id);
              const active = sortField === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  disabled={!sortable}
                  onClick={() => {
                    if (!sortable) return;
                    applySort(col.id as QueueSortField);
                  }}
                  className={cn(
                    "flex min-w-0 items-center gap-1 truncate text-left text-[11px] font-semibold tracking-[0.04em] uppercase",
                    sortable
                      ? active
                        ? "text-[var(--wq-accent)]"
                        : "text-slate-400 hover:text-slate-700"
                      : "cursor-default text-slate-400",
                  )}
                >
                  <span className="truncate">{col.label}</span>
                  {active ? (
                    <span className="shrink-0 text-[10px] font-bold">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  ) : null}
                </button>
              );
            })}

            <div
              className={cn(
                "sticky right-0 z-20 -mr-5 flex justify-end bg-white pr-5 pl-3 sm:-mr-6 sm:pr-6",
              )}
            >
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
                title="Column options"
                className="flex h-6 w-6 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
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
                      className="z-50 w-56 border border-[var(--wq-line)] bg-white py-1 text-[13px] shadow-lg"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setManageColumnsOpen(true);
                          setOptionsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50"
                      >
                        <Columns3 className="h-4 w-4 text-slate-400" />
                        Manage Columns
                      </button>

                      <button
                        type="button"
                        disabled
                        className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2 text-left text-slate-300"
                      >
                        <Ruler className="h-4 w-4 text-slate-300" />
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
                          className="flex w-full items-center justify-between gap-2.5 px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50"
                        >
                          <span className="flex items-center gap-2.5">
                            <Rows3 className="h-4 w-4 text-slate-400" />
                            Records per page
                          </span>
                          <span className="flex items-center gap-0.5 text-slate-400">
                            {pageSize}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </button>

                        {pageSizeFlyoutOpen ? (
                          <div className="absolute right-full top-0 mr-1 w-28 border border-[var(--wq-line)] bg-white py-1 shadow-lg">
                            {PAGE_SIZE_OPTIONS.map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  onPageSizeChange?.(size);
                                  setOptionsMenuOpen(false);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between px-3.5 py-1.5 text-left text-slate-700 hover:bg-slate-50",
                                  pageSize === size &&
                                    "font-semibold text-slate-900",
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
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-20 text-center">
              <span className="flex h-10 w-10 items-center justify-center text-slate-300">
                <Inbox className="h-5 w-5" />
              </span>
              <p className="text-[13.5px] font-medium text-slate-600">
                {emptyLabel}
              </p>
              <p className="max-w-xs text-[12.5px] text-slate-400">
                Try another person, time range, or clear search and filters.
              </p>
            </div>
          ) : (
            <ul className="m-0 list-none p-0" aria-label={title}>
              {rows.map((row) => {
              const overdue =
                row.dueLabel === "Yesterday" ||
                row.dueLabel.includes("overdue");
              const isMenuOpen = activeMenuId === row.id;

              return (
                <li
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
                  style={gridStyle}
                  className={cn(
                    "group/row grid w-full cursor-pointer items-center gap-x-3 border-b border-slate-100 px-5 py-2 text-left transition-colors last:border-b-0 hover:bg-slate-50/80 sm:px-6",
                    overdue && "bg-red-50/40 hover:bg-red-50/70",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-0.5 transition-opacity",
                      isMenuOpen
                        ? "opacity-100"
                        : "pointer-events-none opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100",
                    )}
                  >
                    <div
                      className="relative inline-block text-left"
                      ref={isMenuOpen ? menuRef : undefined}
                    >
                      <button
                        type="button"
                        aria-label="More actions"
                        title="More actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : row.id);
                        }}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors",
                          "hover:bg-slate-100 hover:text-slate-800",
                          isMenuOpen && "bg-slate-100 text-slate-800",
                        )}
                      >
                        <EllipsisVertical className="h-4 w-4" strokeWidth={2} />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute left-0 top-9 z-50 mt-0.5 w-40 origin-top-left rounded-lg border border-slate-200/80 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              onEditRow?.(row);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            <Edit className="h-4 w-4 text-slate-400" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              onDeleteRow?.(row);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label="Add note"
                      title="Add note"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddNote?.(row);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    >
                      <FileText className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      aria-label="Mark complete"
                      title="Mark complete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompleteRow?.(row);
                      }}
                      className="flex h-8 w-8 items-center justify-center"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-600">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    </button>
                  </div>

                  {visibleCols.map((col) => {
                    const text = cellText(row, col.id);
                    if (col.id === "subject") {
                      return (
                        <span
                          key={col.id}
                          className="truncate pr-3 text-[13.5px] leading-[18px] font-medium text-slate-900"
                        >
                          {text}
                        </span>
                      );
                    }
                    if (col.id === "dueDate") {
                      return (
                        <span
                          key={col.id}
                          className="text-[13px] leading-[18px] font-medium tabular-nums"
                          style={{ color: row.dueColor }}
                        >
                          {text}
                        </span>
                      );
                    }
                    if (col.id === "relatedTo") {
                      return (
                        <span
                          key={col.id}
                          className="truncate text-[13px] leading-[18px] font-medium text-[var(--wq-accent)]"
                        >
                          {text}
                        </span>
                      );
                    }
                    return (
                      <span
                        key={col.id}
                        className="truncate text-[13px] leading-[18px] text-slate-600"
                        title={text || undefined}
                      >
                        {text}
                      </span>
                    );
                  })}

                  <span aria-hidden />
                </li>
              );
            })}
            </ul>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--wq-line)] px-5 py-2.5 sm:px-6">
        <span className="text-[12.5px] text-slate-500">
          <span className="font-semibold text-slate-800 tabular-nums">
            {total}
          </span>{" "}
          records
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-slate-400 tabular-nums">
            {from}–{to}
          </span>
          {totalPages > 1 ? (
            <div className="ml-1 flex items-center gap-0.5">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="flex h-7 w-7 items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-35"
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
                        <span className="px-0.5 text-xs text-slate-300">…</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onPageChange(n)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center text-[12px] font-semibold transition-colors",
                          n === page
                            ? "bg-[var(--wq-accent)] text-white"
                            : "text-slate-600 hover:bg-slate-100",
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
                className="flex h-7 w-7 items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-35"
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
          persistManageColumns(cols);
          onManageColumns?.();
          setManageColumnsOpen(false);
        }}
      />
    </div>
  );
}
