"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Filter,
  ArrowUpDown,
  X,
  List,
  LayoutGrid,
  RotateCw,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Sparkles,
  Search,
  type LucideIcon,
} from "lucide-react";

export type ActivityView = "list" | "kanban" | "calendar" | "timeline";

export interface MoreMenuItem {
  key: string;
  icon: LucideIcon;
  label: string;
  onSelect?: () => void;
}

export interface PrintViewItem {
  key: string;
  label: string;
  premium?: boolean;
}

export interface SortOption {
  key: string;
  label: string;
}

export interface ActivityToolbarProps {
  entityLabel: string;
  createRoute: string;
  activeTab?: string;
  tabs: string[];
  onTabChange?: (tab: string) => void;
  tabCounts?: Record<string, number>;

  view: ActivityView;
  onViewChange: (view: ActivityView) => void;

  filterOpen: boolean;
  onToggleFilter: () => void;

  sortOptions?: SortOption[];
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (field: string, direction: "asc" | "desc") => void;
  onClearSort?: () => void;

  search?: string;
  onSearchChange?: (search: string) => void;

  showRefresh?: boolean;

  moreMenuItems?: MoreMenuItem[];
  printViewItems?: PrintViewItem[];

  savedViews?: string[];
  defaultSavedView?: string;
  savedView?: string;
  onSavedViewChange?: (view: string) => void;

  extraViewIcons?: { key: ActivityView; icon: LucideIcon; label: string }[];
}

const DEFAULT_LAYOUT_ID = "standard";

export function ActivityToolbar({
  entityLabel,
  createRoute,
  activeTab: externalActiveTab,
  tabs,
  onTabChange,
  tabCounts,
  view,
  onViewChange,
  filterOpen,
  onToggleFilter,
  sortOptions,
  sortField,
  sortDirection,
  onSortChange,
  onClearSort,
  search,
  onSearchChange,
  showRefresh = false,
  moreMenuItems,
  printViewItems,
  savedViews,
  defaultSavedView,
  savedView: controlledSavedView,
  onSavedViewChange,
  extraViewIcons = [],
}: ActivityToolbarProps) {
  const router = useRouter();
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [savedViewMenuOpen, setSavedViewMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [internalSavedView, setInternalSavedView] = useState(
    defaultSavedView ?? savedViews?.[0],
  );

  const savedView = controlledSavedView ?? internalSavedView;

  function handleSavedViewSelect(view: string) {
    if (controlledSavedView === undefined) {
      setInternalSavedView(view);
    }
    onSavedViewChange?.(view);
    setSavedViewMenuOpen(false);
  }

  const activeTab = externalActiveTab ?? internalActiveTab;

  function handleTabClick(tab: string) {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  }

  const sortActive = Boolean(sortField);
  const showSortClear = sortActive && Boolean(onClearSort);
  const activeSortLabel = sortOptions?.find((o) => o.key === sortField)?.label;

  function handleSortSelect(key: string) {
    if (!onSortChange) return;
    const nextDirection: "asc" | "desc" =
      sortField === key && sortDirection === "asc" ? "desc" : "asc";
    onSortChange(key, nextDirection);
  }

  return (
    <div className="mb-1.5">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 border-b border-slate-200  py-1.5 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const count = tabCounts?.[tab];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === tab
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <span>{tab}</span>
                {count !== undefined && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                      activeTab === tab
                        ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200"
                        : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          {onSearchChange && (
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${entityLabel.toLowerCase()}s...`}
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-7 w-40 rounded-md border border-slate-200 bg-white pl-8 pr-2 text-[12px] text-slate-800 placeholder-slate-400 focus:border-violet-500 focus:outline-none sm:w-52"
              />
            </div>
          )}

          <button
            type="button"
            onClick={onToggleFilter}
            aria-pressed={filterOpen}
            className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium transition-colors ${
              filterOpen
                ? "bg-violet-50 text-violet-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filter</span>
          </button>

          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => sortOptions && setSortMenuOpen((v) => !v)}
              aria-pressed={sortActive}
              aria-expanded={sortMenuOpen}
              className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium transition-colors ${
                sortActive
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {activeSortLabel ?? "Sort"}
              </span>
              {sortActive && (
                <span className="text-[10px] text-slate-400">
                  {sortDirection === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>

            {showSortClear && (
              <button
                type="button"
                onClick={onClearSort}
                aria-label="Clear sort"
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {sortOptions && sortMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSortMenuOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
                  {sortOptions.map((opt) => {
                    const isActive = sortField === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          handleSortSelect(opt.key);
                          setSortMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                          isActive
                            ? "font-medium text-violet-700"
                            : "text-slate-700"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isActive && (
                          <span className="text-xs text-slate-400">
                            {sortDirection === "asc" ? "Asc" : "Desc"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <span className="mx-0.5 hidden h-4 w-px bg-slate-200 sm:block" />

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onViewChange("list")}
              aria-label="List view"
              title="List view"
              className={`flex h-7 w-7 items-center justify-center rounded-md ${
                view === "list"
                  ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewChange("kanban")}
              aria-label="Kanban view"
              title="Kanban view"
              className={`flex h-7 w-7 items-center justify-center rounded-md ${
                view === "kanban"
                  ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>

            {extraViewIcons.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onViewChange(key)}
                aria-label={label}
                title={label}
                className={`flex h-7 w-7 items-center justify-center rounded-md ${
                  view === key
                    ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          {showRefresh && (
            <button
              type="button"
              aria-label="Refresh"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="flex h-7 overflow-hidden rounded-md bg-violet-600 text-[12px]">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `${createRoute}?layoutid=${DEFAULT_LAYOUT_ID}&redirect=false`,
                )
              }
              className="px-2.5 font-semibold text-white hover:bg-violet-700 whitespace-nowrap sm:px-3"
            >
              Create <span className="hidden md:inline">{entityLabel}</span>
            </button>
            <button
              type="button"
              aria-label="More create options"
              className="flex items-center border-l border-violet-500 px-1.5 text-white hover:bg-violet-700"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => moreMenuItems && setMoreMenuOpen((v) => !v)}
              aria-label="More options"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {moreMenuItems && moreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMoreMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
                  {moreMenuItems.map(({ key, icon: Icon, label, onSelect }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onSelect?.();
                        setMoreMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Icon className="h-4 w-4 text-slate-400" />
                      {label}
                    </button>
                  ))}

                  {printViewItems && printViewItems.length > 0 && (
                    <div className="group/printview relative">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <span className="flex-1">Print View</span>
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      </button>

                      <div className="invisible absolute top-0 right-full z-20 mr-1 w-52 rounded-lg border border-slate-100 bg-white py-1 opacity-0 shadow-lg transition-opacity group-hover/printview:visible group-hover/printview:opacity-100">
                        {printViewItems.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setMoreMenuOpen(false)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <span className="flex-1">{item.label}</span>
                            {item.premium && (
                              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {savedViews && savedViews.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSavedViewMenuOpen((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-medium text-slate-700 hover:text-slate-900"
            >
              {savedView}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {savedViewMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSavedViewMenuOpen(false)}
                />
                <div className="absolute left-0 z-20 mt-1 w-44 rounded-lg border border-slate-100 bg-white py-1 shadow-md">
                  {savedViews.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSavedViewSelect(opt)}
                      className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                        opt === savedView
                          ? "font-medium text-violet-700"
                          : "text-slate-600"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
