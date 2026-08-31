"use client";

import * as React from "react";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import { useRouter } from "next/navigation";
import { WorkQueueSidebar } from "@/components/work-queue/WorkQueueSidebar";
import { useWorkQueueScope } from "@/components/work-queue/WorkQueuePersonBar";
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
} from "@/lib/work-queue/live";
import { useCrmWorkQueue } from "@/lib/work-queue/use-crm-work-queue";
import { mergeWorkQueueTabs, setWorkQueueScope, setWorkQueueTabs, getWorkQueueTabState } from "@/lib/work-queue/tab-store";
import { setWorkQueueCrmDirectory } from "@/lib/work-queue/people";
import {
  listCrmWorkspaceMembers,
  tryCrmWorkspaceMembers,
} from "@/lib/workspace-members/api";
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
  const scope = useWorkQueueScope();
  const [timeFilter, setTimeFilter] =
    React.useState<WorkQueueTimeFilter>("today-overdue");
  const [specificDate, setSpecificDate] = React.useState<Date | null>(null);
  const [nameById, setNameById] = React.useState<Record<string, string>>({});
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

  const [noteRow, setNoteRow] = React.useState<QueueRow | null>(null);
  const [noteBody, setNoteBody] = React.useState("");
  const [toast, setToast] = React.useState<string | null>(null);
  const crm = useCrmWorkQueue({
    nav: activeNav,
    scope,
    timeFilter,
    specificDate,
    filters,
    nameById,
    tick,
  });

  React.useEffect(() => {
    setCategories(readStoredCategories());
    mergeWorkQueueTabs(getUserTabs());
    void tryCrmWorkspaceMembers(() => listCrmWorkspaceMembers()).then(
      (members) => {
        if (!members?.length) return;
        const people = members.map((m) => ({
          id: m.userId || m.id,
          name: m.name,
          role: m.role,
          email: m.email,
        }));
        setWorkQueueCrmDirectory(people);
        const names: Record<string, string> = {};
        for (const p of people) names[p.id] = p.name;
        setNameById(names);
        const tabs = people.map((p, i) => ({
          id: p.id,
          name: p.name,
          role: p.role || "User",
          initials: initials(p.name),
          color: USER_TAB_COLORS[i % USER_TAB_COLORS.length],
        }));
        setWorkQueueTabs(tabs);
        const current = getWorkQueueTabState().scope;
        if (!tabs.some((t) => t.id === current)) {
          setWorkQueueScope(tabs[0]?.id ?? "");
        }
      },
    );
  }, []);

  React.useEffect(() => {
    return onRulesChange(() => {
      setTick((n) => n + 1);
      mergeWorkQueueTabs(getUserTabs());
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
    () => getActivityNav(scope, timeFilter, specificDate ?? undefined),
    [scope, timeFilter, specificDate, tick],
  );

  const sidebarCategories = React.useMemo(
    () =>
      getWorkqueueSidebar(
        scope,
        categories,
        timeFilter,
        specificDate ?? undefined,
      ),
    [scope, categories, timeFilter, specificDate, tick],
  );

  const rawRows = React.useMemo(
    () =>
      crm.source === "api"
        ? crm.rows
        : listQueueRows(activeNav, scope, timeFilter, specificDate ?? undefined),
    [activeNav, scope, timeFilter, specificDate, tick, crm.source, crm.rows],
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
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, [activeNav, scope]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  const title = getActivityTitle(activeNav);

  function refresh() {
    setSpinning(true);
    setTick((n) => n + 1);
    crm.refresh();
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
          onTimeFilterChange={(v, date) => {
            setTimeFilter(v);
            setSpecificDate(date ?? null);
            setPage(1);
            setFilters((f) => ({ ...f, status: "all" }));
          }}
          onOpenManage={() => setManageOpen(true)}
        />

        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", viewEnter)}>
          <WorkQueueTable
            key={`${activeNav}-${scope}-${timeFilter}-${specificDate?.toISOString() ?? ""}`}
            rows={pageRows}
            title={title}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onRefresh={refresh}
            spinning={spinning || crm.loading}
            source={crm.source}
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
