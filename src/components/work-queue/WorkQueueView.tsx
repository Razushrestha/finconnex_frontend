"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  type QueueRow,
  type WorkQueueTimeFilter,
} from "@/lib/work-queue/live";
import { onLeadActivityChange } from "@/lib/leads/lead-extras-store";
import { onPipelineSlaChange } from "@/lib/pipeline-sla/settings";
import { onRulesChange } from "@/lib/rules";
import { completeTask, deleteTask, findTaskById } from "@/lib/tasks/store";
import { createNote } from "@/lib/notes/store";
import { getRulesActor } from "@/lib/rules/actor";
import { viewEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

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
  const router = useRouter();
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
  const [categories, setCategories] =
    React.useState<WorkqueueCategoryDef[]>(CATEGORIES_DEFAULT);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState("");

  const [noteRow, setNoteRow] = React.useState<QueueRow | null>(null);
  const [noteBody, setNoteBody] = React.useState("");
  const [toast, setToast] = React.useState<string | null>(null);

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

  const handleAddUser = () => {
    if (!newUserName.trim()) return;
    setNewUserName("");
    setNewUserRole("");
    setIsAddUserOpen(false);
  };

  const title = getActivityTitle(activeNav);
  const activeUser = tabs.find((t) => t.id === scope);

  function refresh() {
    setSpinning(true);
    setTick((n) => n + 1);
    window.setTimeout(() => setSpinning(false), 450);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function handleEditRow(row: QueueRow) {
    router.push(row.href);
  }

  function handleDeleteRow(row: QueueRow) {
    const ok = window.confirm(`Delete “${row.subject}”?`);
    if (!ok) return;
    if (activeNav === "tasks" || findTaskById(row.id)) {
      deleteTask(row.id);
      refresh();
      showToast("Task deleted");
      return;
    }
    showToast("Open the record to delete it there");
    router.push(row.href);
  }

  function handleCompleteRow(row: QueueRow) {
    if (findTaskById(row.id)) {
      completeTask(row.id);
      refresh();
      showToast("Marked complete");
      return;
    }
    showToast("Opening record…");
    router.push(row.href);
  }

  function handleAddNote(row: QueueRow) {
    setNoteRow(row);
    setNoteBody("");
  }

  function saveNote() {
    if (!noteRow || !noteBody.trim()) return;
    const actor = getRulesActor().name;
    createNote({
      title: `Note · ${noteRow.subject}`,
      body: noteBody.trim(),
      relatedTo: noteRow.related || noteRow.subject,
      createdBy: actor || scope || "Me",
    });
    setNoteRow(null);
    setNoteBody("");
    refresh();
    showToast("Note added");
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
      className="flex h-full min-h-[calc(100vh-4rem)] w-full min-w-0 flex-col bg-white text-slate-900 antialiased"
      style={
        {
          "--wq-accent": "#4F46E5",
          "--wq-accent-soft": "#EEF2FF",
          "--wq-accent-badge": "#E0E7FF",
          "--wq-surface": "#F8FAFC",
          "--wq-line": "#E2E8F0",
          "--wq-danger": "#DC2626",
          "--wq-danger-soft": "#FEF2F2",
        } as React.CSSProperties
      }
    >
      {/* Compact top bar */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--wq-line)] px-5 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-slate-900">
            Work Queue
          </h1>
          {activeUser ? (
            <p className="mt-0.5 truncate text-[12px] text-slate-500">
              Viewing work for{" "}
              <span className="font-medium text-slate-700">{activeUser.name}</span>
            </p>
          ) : null}
        </div>

        <div className="relative ml-auto w-full max-w-[280px] sm:w-[280px]">
          <Search className="pointer-events-none absolute top-1/2 left-0 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search this queue…"
            className="h-8 w-full border-0 border-b border-transparent bg-transparent pr-2 pl-6 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-300"
          />
        </div>
      </header>

      {/* Person switcher — underline tabs, no cards */}
      <div className="flex shrink-0 items-end gap-0 overflow-x-auto border-b border-[var(--wq-line)] px-3 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                "group relative flex shrink-0 items-center gap-2 px-3 py-2.5 transition-colors",
                active ? "text-slate-900" : "text-slate-500 hover:text-slate-800",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white transition-opacity",
                  active ? "opacity-100" : "opacity-70 group-hover:opacity-90",
                )}
                style={{ backgroundColor: u.color || "#64748B" }}
              >
                {u.initials}
              </span>
              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span
                  className={cn(
                    "truncate text-[13px] transition-colors",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {u.name}
                </span>
                <span className="truncate text-[11px] text-slate-400">
                  {u.role}
                </span>
              </span>
              <span
                className={cn(
                  "absolute inset-x-2 bottom-0 h-[2px] rounded-full transition-colors",
                  active ? "bg-[var(--wq-accent)]" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Add person"
          title="Add person"
          onClick={() => setIsAddUserOpen(true)}
          className="mb-1.5 ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <WorkQueueSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
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
            onEditRow={handleEditRow}
            onDeleteRow={handleDeleteRow}
            onAddNote={handleAddNote}
            onCompleteRow={handleCompleteRow}
          />
        </div>
      </div>

      <ManageQueueModal
        open={manageOpen}
        categories={categories}
        onClose={() => setManageOpen(false)}
        onSave={saveCategories}
      />

      {noteRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-[1px]"
          onClick={() => setNoteRow(null)}
        >
          <div
            className="w-full max-w-md bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[15px] font-semibold text-slate-900">
              Add note
            </h2>
            <p className="mt-1 truncate text-[12.5px] text-slate-500">
              {noteRow.subject}
            </p>
            <textarea
              autoFocus
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={4}
              placeholder="Write a short note…"
              className="mt-4 w-full resize-none border-b border-slate-200 bg-transparent px-0 py-2 text-[13px] text-slate-800 outline-none focus:border-[var(--wq-accent)]"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setNoteRow(null)}
                className="px-2 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!noteBody.trim()}
                onClick={saveNote}
                className="bg-[var(--wq-accent)] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed right-4 bottom-4 z-[60] rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {isAddUserOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-[1px]"
          onClick={() => setIsAddUserOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[15px] font-semibold text-slate-900">
              Add person
            </h2>
            <p className="mt-1 text-[12.5px] text-slate-500">
              They’ll appear in the Work Queue person switcher.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                  Name
                </label>
                <input
                  autoFocus
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full border-b border-slate-200 bg-transparent px-0 py-2 text-[13px] outline-none focus:border-[var(--wq-accent)]"
                  placeholder="e.g. Priya Shrestha"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                  Role
                </label>
                <input
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full border-b border-slate-200 bg-transparent px-0 py-2 text-[13px] outline-none focus:border-[var(--wq-accent)]"
                  placeholder="e.g. Sales Rep"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="px-2 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddUser}
                className="bg-[var(--wq-accent)] px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
