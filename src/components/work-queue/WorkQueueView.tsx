"use client";

import { workspaceRoleLabel } from "@/lib/auth/workspace-role";
import * as React from "react";
import { WorkQueueSidebar } from "@/components/work-queue/WorkQueueSidebar";
import { useWorkQueueScope } from "@/components/work-queue/WorkQueuePersonBar";
import {
  WorkQueueTable,
  type QueueTableFilters,
} from "@/components/work-queue/WorkQueueTable";
import { ManageQueueModal } from "@/components/work-queue/ManageQueueModal";
import { WorkQueueNotesDrawer } from "@/components/work-queue/WorkQueueNotesDrawer";
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
import { tenantOverlayKey } from "@/lib/persistence/tenant";
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
import {
  completeCrmQueueItem,
  deleteCrmQueueItem,
  updateCrmQueueItem,
} from "@/lib/work-queue/api";
import { useCrmWorkQueue } from "@/lib/work-queue/use-crm-work-queue";
import {
  mergeWorkQueueTabs,
  setWorkQueueScope,
  setWorkQueueTabs,
} from "@/lib/work-queue/tab-store";
import {
  displayNameForWorkQueueId,
  fetchWorkQueueSelfId,
  setWorkQueueCrmDirectory,
} from "@/lib/work-queue/people";
import {
  listCrmWorkspaceMembers,
  tryCrmWorkspaceMembers,
} from "@/lib/workspace-members/api";
import { initials } from "@/lib/activities/shared";
import { onLeadActivityChange } from "@/lib/leads/lead-extras-store";
import { onPipelineSlaChange } from "@/lib/pipeline-sla/settings";
import { onRulesChange } from "@/lib/rules";
import {
  completeTask,
  deleteTask,
  findTaskById,
  patchTask,
} from "@/lib/tasks/store";
import { viewEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify/toast";

const PAGE_SIZE = 25;

const DEFAULT_FILTERS: QueueTableFilters = {
  priority: "all",
  status: "all",
  due: "all",
};

function readStoredCategories(): WorkqueueCategoryDef[] {
  if (typeof window === "undefined") return cloneCategories();
  try {
    const raw = sessionStorage.getItem(tenantOverlayKey(QUEUE_STORAGE_KEY));
    if (!raw) return cloneCategories();
    const parsed = JSON.parse(raw) as WorkqueueCategoryDef[];
    if (!Array.isArray(parsed) || parsed.length === 0) return cloneCategories();
    return parsed;
  } catch {
    return cloneCategories();
  }
}

export function WorkQueueView() {
  const scope = useWorkQueueScope();
  const [timeFilter, setTimeFilter] =
    React.useState<WorkQueueTimeFilter>("today-overdue");
  const [specificDate, setSpecificDate] = React.useState<Date | null>(null);
  const [nameById, setNameById] = React.useState<Record<string, string>>({});
  const [selfId, setSelfId] = React.useState("");
  const [activeNav, setActiveNav] = React.useState<WorkQueueNavId>("queue");
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
  const [editRow, setEditRow] = React.useState<QueueRow | null>(null);
  const [editSubject, setEditSubject] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);
  const crm = useCrmWorkQueue({
    nav: activeNav,
    scope,
    timeFilter,
    specificDate,
    filters,
    nameById,
    selfId,
    tick,
  });

  React.useEffect(() => {
    setCategories(readStoredCategories());
    mergeWorkQueueTabs(getUserTabs());
    void (async () => {
      const meId = await fetchWorkQueueSelfId();
      if (meId) setSelfId(meId);
      const members = await tryCrmWorkspaceMembers(() =>
        listCrmWorkspaceMembers(),
      );
      if (!members?.length) {
        if (meId) setWorkQueueScope(meId);
        return;
      }
      const people = members.map((m) => ({
        id: m.userId || m.id,
        name: m.name,
        role: workspaceRoleLabel(m.workspaceRole ?? m.role),
        email: m.email,
      }));
      setWorkQueueCrmDirectory(people);
      const names: Record<string, string> = {};
      for (const p of people) names[p.id] = p.name;
      setNameById(names);
      const ordered = [...people];
      if (meId) {
        ordered.sort((a, b) => Number(b.id === meId) - Number(a.id === meId));
      }
      const tabs = ordered.map((p, i) => ({
        id: p.id,
        name: p.name,
        role: p.role || "User",
        initials: initials(p.name),
        color: USER_TAB_COLORS[i % USER_TAB_COLORS.length],
      }));
      if (meId && !tabs.some((t) => t.id === meId)) {
        tabs.unshift({
          id: meId,
          name: "Me",
          role: "User",
          initials: "ME",
          color: USER_TAB_COLORS[0],
        });
      }
      setWorkQueueTabs(tabs);
      setWorkQueueScope(meId || tabs[0]?.id || "");
    })();
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

  const activityItems = React.useMemo(() => {
    const local = getActivityNav(scope, timeFilter, specificDate ?? undefined);
    if (crm.source !== "api") return local;
    return local.map((item) => ({
      ...item,
      count: crm.counts[item.id] ?? 0,
    }));
  }, [scope, timeFilter, specificDate, tick, crm.source, crm.counts]);

  const sidebarCategories = React.useMemo(() => {
    const cats = getWorkqueueSidebar(
      scope,
      categories,
      timeFilter,
      specificDate ?? undefined,
    );
    if (crm.source !== "api") return cats;
    return cats.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({
        ...item,
        count: crm.counts[item.id] ?? 0,
      })),
    }));
  }, [scope, categories, timeFilter, specificDate, tick, crm.source, crm.counts]);

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
    notify(message);
  }

  function handleEditRow(row: QueueRow) {
    setEditRow(row);
    setEditSubject(row.subject);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    const subject = editSubject.trim();
    if (!subject) {
      showToast("Subject is required");
      return;
    }
    setEditSaving(true);
    try {
      const message = await updateCrmQueueItem(editRow, subject);
      crm.patchRow(editRow, subject);
      if (findTaskById(editRow.sourceId || editRow.id)) {
        patchTask(editRow.sourceId || editRow.id, { title: subject });
      }
      setEditRow(null);
      refresh();
      showToast(message);
    } catch {
      if (findTaskById(editRow.sourceId || editRow.id)) {
        patchTask(editRow.sourceId || editRow.id, { title: subject });
        crm.patchRow(editRow, subject);
        setEditRow(null);
        refresh();
        showToast("Task updated");
        return;
      }
      showToast("Could not update this item");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteRow(row: QueueRow) {
    const ok = window.confirm(`Delete “${row.subject}”?`);
    if (!ok) return;
    crm.removeRow(row);
    try {
      const message = await deleteCrmQueueItem(row);
      const localId = row.sourceId || row.id;
      if (findTaskById(localId) || findTaskById(row.id)) {
        deleteTask(localId);
        deleteTask(row.id);
      }
      refresh();
      showToast(message);
    } catch {
      const localId = row.sourceId || row.id;
      if (findTaskById(localId) || findTaskById(row.id)) {
        deleteTask(localId);
        deleteTask(row.id);
        refresh();
        showToast("Task deleted");
        return;
      }
      refresh();
      showToast("Could not delete this item");
    }
  }

  async function handleCompleteRow(row: QueueRow) {
    try {
      const message = await completeCrmQueueItem(row);
      refresh();
      showToast(message);
    } catch {
      if (findTaskById(row.id)) {
        completeTask(row.id);
        refresh();
        showToast("Marked complete");
        return;
      }
      showToast("Could not complete from the queue");
    }
  }

  function handleAddNote(row: QueueRow) {
    setNoteRow(row);
  }

  function saveCategories(next: WorkqueueCategoryDef[]) {
    setCategories(next);
    sessionStorage.setItem(
      tenantOverlayKey(QUEUE_STORAGE_KEY),
      JSON.stringify(next),
    );
    setManageOpen(false);
    if (!isActivityNav(activeNav)) {
      const stillVisible = next.some(
        (c) =>
          c.checked && c.items.some((it) => it.checked && it.id === activeNav),
      );
      if (!stillVisible) {
        setActiveNav("queue");
        setPage(1);
      }
    }
  }

  const scopeName =
    nameById[scope] ||
    (scope === selfId ? "you" : "") ||
    displayNameForWorkQueueId(scope) ||
    "you";

  function resetLocalFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col bg-white text-slate-900 antialiased"
      style={
        {
          "--wq-accent": "var(--brand-primary)",
          "--wq-accent-soft": "var(--brand-primary-soft)",
          "--wq-accent-badge": "var(--brand-primary-muted)",
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
            emptyLabel={`No ${title.toLowerCase()} for ${scopeName} in this time range.`}
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
        <WorkQueueNotesDrawer
          row={noteRow}
          onClose={() => setNoteRow(null)}
          onChanged={(message) => {
            refresh();
            showToast(message);
          }}
        />
      ) : null}

      {editRow ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="text-base font-semibold text-slate-900">Edit item</h2>
            <label className="mt-4 block text-[13px] font-medium text-slate-600">
              Subject
              <input
                autoFocus
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditRow(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSaving || !editSubject.trim()}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

    </div>
  );
}
