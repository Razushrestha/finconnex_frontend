"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { WorkQueueSidebar } from "@/components/work-queue/WorkQueueSidebar";
import {
  WorkQueueTable,
  type QueueTableFilters,
} from "@/components/work-queue/WorkQueueTable";
import { ManageQueueModal } from "@/components/work-queue/ManageQueueModal";
import {
  CATEGORIES_DEFAULT,
  QUEUE_STORAGE_KEY,
  cloneCategories,
  getActivityTitle,
  isActivityNav,
  type WorkQueueNavId,
  type WorkqueueCategoryDef,
} from "@/lib/work-queue/config";
import {
  filterQueueRows,
  getActivityNav,
  getUserTabs,
  getWorkqueueSidebar,
  listQueueRows,
  type WorkQueueTimeFilter,
} from "@/lib/work-queue/live";
import { onLeadActivityChange } from "@/lib/leads/lead-extras-store";
import { onPipelineSlaChange } from "@/lib/pipeline-sla/settings";
import { onRulesChange } from "@/lib/rules";
import { viewEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const DEFAULT_FILTERS: QueueTableFilters = {
  priority: "all",
  status: "all",
  due: "all",
};

function readStoredCategories(): WorkqueueCategoryDef[] {
  if (typeof window === "undefined") return cloneCategories();
  try {
    const raw = sessionStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return cloneCategories();
    const parsed = JSON.parse(raw) as WorkqueueCategoryDef[];
    if (!Array.isArray(parsed) || parsed.length === 0) return cloneCategories();
    return parsed;
  } catch {
    return cloneCategories();
  }
}

export function WorkQueueView() {
  const [tabs, setTabs] = React.useState(() => getUserTabs());
  const [scope, setScope] = React.useState(() => getUserTabs()[0]?.id ?? "");
  const [timeFilter, setTimeFilter] =
    React.useState<WorkQueueTimeFilter>("today-overdue");
  const [activeNav, setActiveNav] = React.useState<WorkQueueNavId>("tasks");
  const [page, setPage] = React.useState(1);
  const [tick, setTick] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] =
    React.useState<QueueTableFilters>(DEFAULT_FILTERS);
  const [categories, setCategories] = React.useState<WorkqueueCategoryDef[]>(
    CATEGORIES_DEFAULT,
  );
  const [manageOpen, setManageOpen] = React.useState(false);

  React.useEffect(() => {
    setCategories(readStoredCategories());
    const nextTabs = getUserTabs();
    setTabs(nextTabs);
    setScope((prev) =>
      nextTabs.some((t) => t.id === prev) ? prev : (nextTabs[0]?.id ?? ""),
    );
  }, []);

  React.useEffect(() => {
    return onRulesChange(() => {
      setTick((n) => n + 1);
      const nextTabs = getUserTabs();
      setTabs(nextTabs);
    });
  }, []);

  React.useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const offSla = onPipelineSlaChange(bump);
    const offLeads = onLeadActivityChange(bump);
    return () => {
      offSla();
      offLeads();
    };
  }, []);

  const activityItems = React.useMemo(
    () => getActivityNav(scope, timeFilter),
    [scope, timeFilter, tick],
  );

  const sidebarCategories = React.useMemo(
    () => getWorkqueueSidebar(scope, categories, timeFilter),
    [scope, categories, timeFilter, tick],
  );

  const rawRows = React.useMemo(
    () => listQueueRows(activeNav, scope, timeFilter),
    [activeNav, scope, timeFilter, tick],
  );

  const filteredRows = React.useMemo(
    () =>
      filterQueueRows(rawRows, {
        query,
        priority: filters.priority,
        status: filters.status,
        due: filters.due,
      }),
    [rawRows, query, filters],
  );

  const statusOptions = React.useMemo(() => {
    const set = new Set(rawRows.map((r) => r.status).filter(Boolean));
    return Array.from(set).sort();
  }, [rawRows]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  React.useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const title = getActivityTitle(activeNav);

  function refresh() {
    setSpinning(true);
    setTick((n) => n + 1);
    window.setTimeout(() => setSpinning(false), 450);
  }

  function saveCategories(next: WorkqueueCategoryDef[]) {
    setCategories(next);
    sessionStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(next));
    setManageOpen(false);
    if (!isActivityNav(activeNav)) {
      const stillVisible = next.some(
        (c) =>
          c.checked && c.items.some((it) => it.checked && it.id === activeNav),
      );
      if (!stillVisible) {
        setActiveNav("tasks");
        setPage(1);
      }
    }
  }

  function resetLocalFilters() {
    setQuery("");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  return (
    <div
      className="flex h-full min-h-[calc(100vh-4rem)] w-full min-w-0 flex-col bg-white text-gray-900 antialiased"
      style={
        {
          "--wq-accent": "#2563EB",
          "--wq-accent-soft": "#EFF6FF",
          "--wq-accent-badge": "#DBEAFE",
          "--wq-surface": "#FAFAFA",
          "--wq-line": "#E5E7EB",
          "--wq-danger": "#DC2626",
          "--wq-danger-soft": "#FEE2E2",
        } as React.CSSProperties
      }
    >
      {/* Title strip + search */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--wq-line)] px-5 py-3.5 sm:px-7">
        <h1 className="text-[20px] leading-6 font-bold tracking-tight text-gray-900">
          Workqueue
        </h1>
        <div className="relative w-full max-w-[340px] flex-1 sm:ml-2">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search records"
            className="h-9 w-full rounded-lg border border-[var(--wq-line)] bg-[var(--wq-surface)] pr-3 pl-8 text-[13px] text-gray-900 outline-none transition-shadow placeholder:text-gray-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
          />
        </div>
      </div>

      {/* User tabs */}
      <div className="flex shrink-0 items-stretch gap-0 overflow-x-auto border-b border-[var(--wq-line)] px-2 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((u) => {
          const active = u.id === scope;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                setScope(u.id);
                setPage(1);
                resetLocalFilters();
              }}
              className={cn(
                "group relative flex shrink-0 items-center gap-2.5 px-4 py-3 transition-colors sm:px-5",
                active ? "bg-white" : "hover:bg-[var(--wq-surface)]",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-sm ring-2 transition-shadow",
                  active ? "ring-blue-100" : "ring-transparent",
                )}
                style={{ background: u.color }}
              >
                {u.initials}
              </span>
              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span
                  className={cn(
                    "truncate text-[13px] font-semibold transition-colors",
                    active ? "text-[var(--wq-accent)]" : "text-gray-900",
                  )}
                >
                  {u.name}
                </span>
                <span className="truncate text-[12px] text-gray-500">
                  {u.role}
                </span>
              </span>
              <span
                className={cn(
                  "absolute inset-x-3 bottom-0 h-0.5 rounded-full transition-colors",
                  active ? "bg-[var(--wq-accent)]" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Add person"
          className="ml-1 flex h-9 w-9 shrink-0 items-center self-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[var(--wq-surface)] hover:text-gray-600"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <WorkQueueSidebar
          activeItem={activeNav}
          onActiveItemChange={(id) => {
            setActiveNav(id);
            setPage(1);
            resetLocalFilters();
          }}
          activityItems={activityItems}
          sidebarCategories={sidebarCategories}
          timeFilter={timeFilter}
          onTimeFilterChange={(v) => {
            setTimeFilter(v);
            setPage(1);
            setFilters((f) => ({ ...f, status: "all" }));
          }}
          onOpenManage={() => setManageOpen(true)}
        />

        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", viewEnter)}>
          <WorkQueueTable
            key={`${activeNav}-${scope}-${timeFilter}`}
            rows={pageRows}
            title={title}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onRefresh={refresh}
            spinning={spinning}
            emptyLabel={`No ${title.toLowerCase()} for ${scope || "this user"}.`}
            filters={filters}
            onFiltersChange={(f) => {
              setFilters(f);
              setPage(1);
            }}
            statusOptions={statusOptions}
          />
        </div>
      </div>

      <ManageQueueModal
        open={manageOpen}
        categories={categories}
        onClose={() => setManageOpen(false)}
        onSave={saveCategories}
      />
    </div>
  );
}
