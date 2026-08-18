"use client";

import * as React from "react";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
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
  USER_TAB_COLORS,
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
  sortQueueRows,
  type QueueRow,
  type QueueSortDirection,
  type QueueSortField,
  type WorkQueueTimeFilter,
  type WorkQueueUserTab,
} from "@/lib/work-queue/live";
import { listMentionPeople } from "@/lib/mentions/people";
import { initials } from "@/lib/activities/shared";
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
  const [filters, setFilters] =
    React.useState<QueueTableFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = React.useState<QueueSortField | undefined>();
  const [sortDirection, setSortDirection] =
    React.useState<QueueSortDirection>("asc");
  const [categories, setCategories] =
    React.useState<WorkqueueCategoryDef[]>(CATEGORIES_DEFAULT);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [userQuery, setUserQuery] = React.useState("");
  const userSearchRef = React.useRef<HTMLDivElement>(null);
  const userSearchInputRef = React.useRef<HTMLInputElement>(null);

  const [noteRow, setNoteRow] = React.useState<QueueRow | null>(null);
  const [noteBody, setNoteBody] = React.useState("");
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCategories(readStoredCategories());
    const nextTabs = getUserTabs();
    setTabs((prev) => {
      const ids = new Set(nextTabs.map((t) => t.id));
      return [...nextTabs, ...prev.filter((t) => !ids.has(t.id))];
    });
    setScope((prev) =>
      nextTabs.some((t) => t.id === prev) || prev
        ? prev
        : (nextTabs[0]?.id ?? ""),
    );
  }, []);

  React.useEffect(() => {
    return onRulesChange(() => {
      setTick((n) => n + 1);
      const nextTabs = getUserTabs();
      setTabs((prev) => {
        const ids = new Set(nextTabs.map((t) => t.id));
        return [...nextTabs, ...prev.filter((t) => !ids.has(t.id))];
      });
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
        priority: filters.priority,
        status: filters.status,
        due: filters.due,
      }),
    [rawRows, filters],
  );

  const sortedRows = React.useMemo(
    () => sortQueueRows(filteredRows, sortField, sortDirection),
    [filteredRows, sortField, sortDirection],
  );

  const statusOptions = React.useMemo(() => {
    const set = new Set(rawRows.map((r) => r.status).filter(Boolean));
    return Array.from(set).sort();
  }, [rawRows]);

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  React.useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  React.useEffect(() => {
    setSortField(undefined);
    setSortDirection("asc");
    setPage(1);
  }, [activeNav, scope]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  const searchableUsers = React.useMemo(() => {
    const people = listMentionPeople();
    const seen = new Set<string>();
    const out: { id: string; name: string; role: string; email?: string }[] =
      [];
    for (const person of people) {
      const key = person.name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: person.name,
        name: person.name,
        role: person.role || "User",
        email: person.email,
      });
    }
    for (const tab of tabs) {
      const key = tab.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: tab.id,
        name: tab.name,
        role: tab.role,
      });
    }
    return out;
  }, [tabs, tick]);

  const matchedUsers = React.useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return searchableUsers;
    return searchableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false),
    );
  }, [searchableUsers, userQuery]);

  React.useEffect(() => {
    if (!isAddUserOpen) return;
    window.setTimeout(() => userSearchInputRef.current?.focus(), 0);
    function onDoc(e: MouseEvent) {
      if (
        userSearchRef.current &&
        !userSearchRef.current.contains(e.target as Node)
      ) {
        setIsAddUserOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsAddUserOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [isAddUserOpen]);

  function selectSearchedUser(user: {
    id: string;
    name: string;
    role: string;
  }) {
    const existing = tabs.find((t) => t.id === user.id || t.name === user.name);
    if (!existing) {
      const tab: WorkQueueUserTab = {
        id: user.id,
        name: user.name,
        role: user.role,
        initials: initials(user.name),
        color: USER_TAB_COLORS[tabs.length % USER_TAB_COLORS.length],
      };
      setTabs((prev) => [...prev, tab]);
    }
    setScope(existing?.id ?? user.id);
    setPage(1);
    resetLocalFilters();
    setUserQuery("");
    setIsAddUserOpen(false);
  }

  const title = getActivityTitle(activeNav);

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
        <div className="relative mb-1.5 ml-1 shrink-0" ref={userSearchRef}>
          <button
            type="button"
            aria-label="Search users"
            title="Search users"
            aria-expanded={isAddUserOpen}
            onClick={() => {
              setIsAddUserOpen((v) => !v);
              setUserQuery("");
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          {isAddUserOpen ? (
            <div className="absolute top-9 right-0 z-40 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                  ref={userSearchInputRef}
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search users…"
                  className="w-full bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {matchedUsers.length === 0 ? (
                  <p className="px-3 py-3 text-center text-[12px] text-slate-400">
                    {userQuery.trim()
                      ? `No users match “${userQuery.trim()}”`
                      : "No users found"}
                  </p>
                ) : (
                  matchedUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectSearchedUser(u)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-violet-50"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                        {initials(u.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-slate-800">
                          {u.name}
                        </span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {u.role}
                          {u.email ? ` · ${u.email}` : ""}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
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
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={(field, direction) => {
              setSortField(field);
              setSortDirection(direction);
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
            <MentionTextarea
              autoFocus
              value={noteBody}
              onChange={setNoteBody}
              rows={4}
              placeholder="Write a short note… Type @ to assign someone."
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
    </div>
  );
}
