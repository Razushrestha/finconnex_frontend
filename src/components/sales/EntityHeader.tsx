"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RotateCw,
  Home,
  Filter,
  Search,
  List,
  LayoutGrid,
  Plus,
  ChevronDown,
  Columns3,
  GripVertical,
  ArrowUpDown,
} from "lucide-react";

const DEFAULT_LAYOUT_ID = "standard";

export interface PipelineOption {
  label: string;
  value: string;
}

export interface SortOption {
  label: string;
  value: string;
}

export interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
}

export interface EntityHeaderProps {
  entityLabel: string;
  entityLabelPlural?: string;
  createRoute: string;
  breadcrumb?: string[];
  totalCount?: number;

  pipelineOptions?: PipelineOption[];
  activePipeline?: string;
  onPipelineChange?: (pipeline: string) => void;

  onToggleFilter?: () => void;
  isFilterOpen?: boolean;

  sortOptions?: SortOption[];
  activeSort?: string;
  onSortChange?: (sortValue: string) => void;

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
}

export function EntityHeader({
  entityLabel,
  entityLabelPlural = `${entityLabel}s`,
  createRoute,
  breadcrumb = ["Sales", entityLabelPlural],
  totalCount,
  pipelineOptions,
  activePipeline,
  onPipelineChange,
  onToggleFilter,
  isFilterOpen,
  sortOptions,
  activeSort,
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
}: EntityHeaderProps) {
  const router = useRouter();
  const title = pipelineOptions
    ? `${activePipeline} Pipeline`
    : entityLabelPlural;

  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        columnMenuRef.current &&
        !columnMenuRef.current.contains(e.target as Node)
      ) {
        setIsColumnMenuOpen(false);
      }
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(e.target as Node)
      ) {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeSortLabel =
    sortOptions?.find((opt) => opt.value === activeSort)?.label || "Sort";

  return (
    <div className="w-full border-b border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
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
          <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          {totalCount !== undefined && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {totalCount}
            </span>
          )}
        </div>

        {pipelineOptions ? (
          <select
            value={activePipeline}
            onChange={(e) => onPipelineChange?.(e.target.value)}
            aria-label="Pipeline"
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200"
          >
            {pipelineOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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

          {/* Sort Button & Dropdown (Right after Filter) */}
          {sortOptions ? (
            <div className="relative" ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => setIsSortMenuOpen((open) => !open)}
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
                <div className="absolute right-0 z-20 mt-1.5 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    Sort By
                  </p>
                  <div className="flex flex-col">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onSortChange?.(opt.value);
                          setIsSortMenuOpen(false);
                        }}
                        className={`flex items-center rounded px-2 py-1.5 text-left text-[12px] font-medium transition-colors ${
                          activeSort === opt.value
                            ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-44 rounded-md border border-slate-200 bg-white pr-2.5 pl-8 text-[12px] text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none lg:w-56 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-100"
            />
          </div>

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

          <button
            type="button"
            onClick={() =>
              router.push(
                `${createRoute}?layoutid=${DEFAULT_LAYOUT_ID}&redirect=false`,
              )
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Create {entityLabel}</span>
            <span className="sm:hidden">Create</span>
          </button>

          {columnOptions ? (
            <div className="relative" ref={columnMenuRef}>
              <button
                type="button"
                onClick={() => setIsColumnMenuOpen((open) => !open)}
                aria-label="Manage columns"
                aria-pressed={isColumnMenuOpen}
                aria-haspopup="true"
                aria-expanded={isColumnMenuOpen}
                className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                  isColumnMenuOpen
                    ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900"
                }`}
              >
                <Columns3 className="h-3.5 w-3.5" />
              </button>

              {isColumnMenuOpen && (
                <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    Columns
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
                          if (draggedColumnId && draggedColumnId !== col.id) {
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
                        <label className="flex flex-1 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800">
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
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
