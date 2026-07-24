"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  RotateCw,
  Home,
  Filter,
  Search,
  List,
  LayoutGrid,
  Plus,
  ChevronDown,
} from "lucide-react";

const DEFAULT_LAYOUT_ID = "standard";

export interface PipelineOption {
  label: string;
  value: string;
}

export interface EntityHeaderProps {
  /** Singular entity name: drives the Create button label. */
  entityLabel: string;
  /** Plural form for the page title / search placeholder. */
  entityLabelPlural?: string;
  /** Route the Create button pushes to. */
  createRoute: string;
  /** Breadcrumb trail after Home. */
  breadcrumb?: string[];
  /** Total record count badge. Omit to hide. */
  totalCount?: number;

  pipelineOptions?: PipelineOption[];
  activePipeline?: string;
  onPipelineChange?: (pipeline: string) => void;

  onToggleFilter?: () => void;
  isFilterOpen?: boolean;

  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  viewMode?: "kanban" | "list";
  onViewChange?: (mode: "kanban" | "list") => void;

  onExport?: () => void;
  onRefresh?: () => void;
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
  searchValue,
  onSearchChange,
  searchPlaceholder = `Search ${entityLabelPlural}`,
  viewMode = "kanban",
  onViewChange,
  onExport,
  onRefresh,
}: EntityHeaderProps) {
  const router = useRouter();
  const title = pipelineOptions
    ? `${activePipeline} Pipeline`
    : entityLabelPlural;

  return (
    <div className="w-full border-b border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Single compact toolbar */}
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
            onClick={onExport}
            className="hidden h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 sm:inline-flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-300"
          >
            <Package className="h-3.5 w-3.5" />
            Export
          </button>

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
        </div>
      </div>
    </div>
  );
}
