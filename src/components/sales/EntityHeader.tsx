"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RotateCw,
  Home,
  Filter,
  List,
  LayoutGrid,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  GripVertical,
  ArrowUpDown,
} from "lucide-react";
import { SearchInput } from "../ui/search-input";

const DEFAULT_LAYOUT_ID = "standard";

export interface ScopeOption {
  label: string;
  value: string;
}

export interface SortOption {
  label: string;
  value: string;
}

export type SortDirection = "asc" | "desc";

export interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
}

export interface ImportOption {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string;
  onClick: () => void;
}

export interface ActionOption {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}

export interface EntityHeaderProps {
  entityLabel: string;
  entityLabelPlural?: string;
  createRoute: string;
  breadcrumb?: string[];
  totalCount?: number;

  scopeOptions?: ScopeOption[];
  activeScope?: string;
  onScopeChange?: (scope: string) => void;

  onToggleFilter?: () => void;
  isFilterOpen?: boolean;

  sortOptions?: SortOption[];
  activeSort?: string;
  activeSortDirection?: SortDirection;
  onSortChange?: (field: string, direction: SortDirection) => void;

  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  viewMode?: "kanban" | "list";
  onViewChange?: (mode: "kanban" | "list") => void;

  onExport?: () => void;
  onRefresh?: () => void;

  columnOptions?: ColumnOption[];
  onColumnToggle?: (columnId: string) => void;
  onColumnReorder?: (draggedId: string, targetId: string) => void;

  actionOptions?: ActionOption[];

  footerOptions?: ActionOption[];

  importOptions?: ImportOption[];
}

export function EntityHeader({
  entityLabel,
  entityLabelPlural = `${entityLabel}s`,
  createRoute,
  breadcrumb = ["Sales", entityLabelPlural],
  totalCount,
  scopeOptions,
  activeScope,
  onScopeChange,
  onToggleFilter,
  isFilterOpen,
  sortOptions,
  activeSort,
  activeSortDirection = "asc",
  onSortChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = `Search ${entityLabelPlural}`,
  viewMode = "kanban",
  onViewChange,
  onRefresh,
  columnOptions,
  onColumnToggle,
  onColumnReorder,
  actionOptions,
  footerOptions,
  importOptions,
}: EntityHeaderProps) {
  const router = useRouter();
  const title = entityLabelPlural;

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Sort panel is edited locally and only committed on "Apply"; "Cancel"
  // (or clicking away) discards the pending edit.
  const [pendingSortField, setPendingSortField] = useState(activeSort ?? "");
  const [pendingSortDirection, setPendingSortDirection] =
    useState<SortDirection>(activeSortDirection);

  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const scopeMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(e.target as Node)
      ) {
        setIsSortMenuOpen(false);
      }
      if (
        importMenuRef.current &&
        !importMenuRef.current.contains(e.target as Node)
      ) {
        setIsImportMenuOpen(false);
      }
      if (
        scopeMenuRef.current &&
        !scopeMenuRef.current.contains(e.target as Node)
      ) {
        setIsScopeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeSortLabel =
    sortOptions?.find((opt) => opt.value === activeSort)?.label || "Sort";

  const hasMoreMenu = Boolean(
    (columnOptions && columnOptions.length > 0) ||
    (actionOptions && actionOptions.length > 0) ||
    (footerOptions && footerOptions.length > 0),
  );

  return (
    <div className="w-full border-b border-slate-200/80 bg-background dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-1 py-2 sm:gap-x-3">
        <nav className="hidden items-center gap-1 text-[11px] text-slate-400 md:flex">
        <Link
          href="/"
            className="flex items-center gap-0.5 hover:text-slate-600"
            aria-label="Home"
        >
            <Home className="h-3.5 w-3.5" />
        </Link>
          {breadcrumb.map((crumb) => (
            <span key={crumb} className="flex items-center gap-1">
              <span>/</span>
              <span className="text-slate-500">{crumb}</span>
          </span>
        ))}
      </nav>

        <div className="hidden h-4 w-px bg-slate-200 md:block dark:bg-zinc-700" />

        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-[15px] font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {totalCount !== undefined && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {totalCount}
            </span>
          )}
        </div>

        {scopeOptions ? (
          <div className="relative" ref={scopeMenuRef}>
            <button
              type="button"
              onClick={() => setIsScopeMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={isScopeMenuOpen}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200"
            >
              <span>
                {scopeOptions.find((opt) => opt.value === activeScope)?.label ??
                  scopeOptions[0]?.label}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {isScopeMenuOpen && (
              <div className="absolute left-0 z-20 mt-1.5 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {scopeOptions.map((opt) => (
            <button
                    key={opt.value}
              type="button"
                    onClick={() => {
                      onScopeChange?.(opt.value);
                      setIsScopeMenuOpen(false);
                    }}
                    className={`flex w-full items-center rounded px-2.5 py-2 text-left text-[13px] font-medium ${
                      opt.value === activeScope
                        ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {opt.label}
            </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {/* Filter Button */}
          <button
            type="button"
            onClick={onToggleFilter}
            aria-pressed={isFilterOpen}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors ${
              isFilterOpen
                ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-300"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filter</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
          </button>

          {/* Sort Button & "Sort By" Panel (field + direction + Cancel/Apply) */}
          {sortOptions ? (
            <div className="relative" ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setPendingSortField(activeSort ?? "");
                  setPendingSortDirection(activeSortDirection);
                  setIsSortMenuOpen((open) => !open);
                }}
                aria-label="Sort options"
                aria-pressed={isSortMenuOpen}
                aria-haspopup="true"
                aria-expanded={isSortMenuOpen}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors ${
                  isSortMenuOpen
                    ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-300"
                }`}
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">{activeSortLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isSortMenuOpen && (
                <div className="absolute right-0 z-20 mt-1.5 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="mb-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    Sort By
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={pendingSortField}
                      onChange={(e) => setPendingSortField(e.target.value)}
                      aria-label="Sort field"
                      className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-700 focus:border-violet-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200"
                    >
                      <option value="">--None--</option>
                      {sortOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={pendingSortDirection}
                      onChange={(e) =>
                        setPendingSortDirection(e.target.value as SortDirection)
                      }
                      aria-label="Sort direction"
                      className="h-8 w-32 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-700 focus:border-violet-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSortMenuOpen(false)}
                      className="h-7 rounded-md border border-slate-200 px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSortChange?.(pendingSortField, pendingSortDirection);
                        setIsSortMenuOpen(false);
                      }}
                      className="h-7 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700"
                    >
                      Apply
                    </button>
          </div>
        </div>
              )}
            </div>
          ) : null}

          <SearchInput value={search} onChange={setSearch} />

          <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              aria-label="List view"
              onClick={() => onViewChange?.("list")}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                viewMode === "list"
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Kanban view"
              onClick={() => onViewChange?.("kanban")}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                viewMode === "kanban"
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          <div className="relative" ref={importMenuRef}>
            <div className="inline-flex h-8 items-stretch overflow-hidden rounded-md bg-violet-600">
          <button
            type="button"
            onClick={() =>
              router.push(
                `${createRoute}?layoutid=${DEFAULT_LAYOUT_ID}&redirect=false`,
              )
            }
                className="inline-flex items-center gap-1.5 px-3 text-[12px] font-semibold text-white hover:bg-violet-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Create {entityLabel}</span>
                <span className="sm:hidden">Create</span>
              </button>

              {importOptions && importOptions.length > 0 ? (
                <>
                  <div className="w-px bg-violet-500" />
                  <button
                    type="button"
                    onClick={() => setIsImportMenuOpen((open) => !open)}
                    aria-label={`${entityLabel} import options`}
                    aria-haspopup="true"
                    aria-expanded={isImportMenuOpen}
                    className="flex w-7 items-center justify-center text-white hover:bg-violet-700"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : null}
            </div>

            {isImportMenuOpen && importOptions && importOptions.length > 0 && (
              <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {importOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      opt.onClick();
                      setIsImportMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800"
                  >
                    <span className="flex items-center gap-1.5">
                      {opt.icon}
                      {opt.label}
                    </span>
                    {opt.badge ? (
                      <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                        {opt.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasMoreMenu ? (
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((open) => !open)}
                aria-label="More options"
                aria-pressed={isMoreMenuOpen}
                aria-haspopup="true"
                aria-expanded={isMoreMenuOpen}
                className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                  isMoreMenuOpen
                    ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900"
                }`}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  {columnOptions && columnOptions.length > 0 ? (
                    <>
                      <p className="px-2 py-1 text-[13px] font-semibold tracking-wide text-slate-400 uppercase">
                        Stages
                      </p>
                      <div className="max-h-64 overflow-y-auto">
                        {columnOptions.map((col) => (
                          <div
                            key={col.id}
                            draggable={!!onColumnReorder}
                            onDragStart={(e) => {
                              setDraggedColumnId(col.id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(e) => {
                              if (!draggedColumnId) return;
                              e.preventDefault();
                              if (dragOverColumnId !== col.id) {
                                setDragOverColumnId(col.id);
                              }
                            }}
                            onDragLeave={() =>
                              setDragOverColumnId((prev) =>
                                prev === col.id ? null : prev,
                              )
                            }
                            onDrop={(e) => {
                              e.preventDefault();
                              if (
                                draggedColumnId &&
                                draggedColumnId !== col.id
                              ) {
                                onColumnReorder?.(draggedColumnId, col.id);
                              }
                              setDraggedColumnId(null);
                              setDragOverColumnId(null);
                            }}
                            onDragEnd={() => {
                              setDraggedColumnId(null);
                              setDragOverColumnId(null);
                            }}
                            className={`flex items-center gap-1 rounded border-t-2 ${
                              dragOverColumnId === col.id &&
                              draggedColumnId !== col.id
                                ? "border-violet-400"
                                : "border-transparent"
                            } ${draggedColumnId === col.id ? "opacity-40" : ""}`}
                          >
                            {onColumnReorder ? (
                              <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 active:cursor-grabbing" />
                            ) : null}
                            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded px-2 py-2 text-[14px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800">
                              <input
                                type="checkbox"
                                checked={col.visible}
                                onChange={() => onColumnToggle?.(col.id)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-400 dark:border-zinc-600"
                              />
                              {col.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {columnOptions &&
                  columnOptions.length > 0 &&
                  actionOptions &&
                  actionOptions.length > 0 ? (
                    <div className="my-1 h-px bg-slate-100 dark:bg-zinc-800" />
                  ) : null}

                  {actionOptions && actionOptions.length > 0 ? (
                    <div className="flex flex-col">
                      {actionOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={opt.disabled}
                          onClick={() => {
                            opt.onClick();
                            setIsMoreMenuOpen(false);
                          }}
                          className="flex items-center gap-2 rounded px-2 py-2 text-left text-[14px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-zinc-800"
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {footerOptions && footerOptions.length > 0 ? (
                    <>
                      <div className="my-1 h-px bg-slate-100 dark:bg-zinc-800" />
                      <div className="flex flex-col">
                        {footerOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={opt.disabled}
                            onClick={() => {
                              opt.onClick();
                              setIsMoreMenuOpen(false);
                            }}
                            className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[14px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-zinc-800"
                          >
                            <span className="flex items-center gap-2">
                              {opt.icon}
                              {opt.label}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
