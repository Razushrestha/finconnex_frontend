"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Trash2,
  RefreshCw,
  Tags,
  ShieldCheck,
  Download,
  CalendarDays,
} from "lucide-react";
import { FilterPanel } from "@/components/activities/tasks/Filterpanel";
import { KanbanBoard } from "@/components/activities/tasks/KanbanBoard";
import { TaskListView } from "@/components/activities/tasks/TaskListView";
import { TaskCalendarView } from "@/components/activities/tasks/TaskCalendarView";
import { TaskTimelineView } from "@/components/activities/tasks/TaskTimelineView";
import {
  ActivityToolbar,
  TIMELINE_VIEW_TOGGLE,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import {
  EMPTY_TASK_FILTERS,
  type Priority,
  type TaskFilters,
  type TaskStatus,
} from "@/lib/tasks/types";
import {
  cloneTask,
  completeTask,
  deleteTask,
  listAllTasks,
  reassignTask,
} from "@/lib/tasks/store";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { downloadCsv, toCsv } from "@/lib/import/csv";
import { emitRulesChange } from "@/lib/rules/storage";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import { BOARD_PAGE } from "@/lib/layout";

const TASK_VIEW_MODE_KEY = "finconnex.tasks.view-mode";

function loadTaskViewMode(): ActivityView {
  if (typeof window === "undefined") return "kanban";
  try {
    const raw = localStorage.getItem(TASK_VIEW_MODE_KEY);
    if (
      raw === "list" ||
      raw === "kanban" ||
      raw === "calendar" ||
      raw === "timeline"
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "kanban";
}

function persistTaskViewMode(mode: ActivityView) {
  try {
    localStorage.setItem(TASK_VIEW_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function exportTasksCsv() {
  const rows = listAllTasks();
  downloadCsv(
    `tasks-${Date.now()}.csv`,
    toCsv(
      [
        "Task ID",
        "Title",
        "Type",
        "Priority",
        "Status",
        "Due Date",
        "Assigned To",
        "Related To",
        "Reminder",
      ],
      rows.map((t) => [
        t.taskId,
        t.title,
        t.taskType,
        t.priority,
        t.status,
        t.dueDate,
        t.assignedTo,
        t.relatedTo ? `${t.relatedTo.kind}: ${t.relatedTo.name}` : "",
        t.reminderDate ?? "",
      ]),
    ),
  );
}

export const moreMenuItems = [
  { key: "mass-transfer", icon: ArrowRightLeft, label: "Mass Transfer" },
  { key: "mass-delete", icon: Trash2, label: "Mass Delete" },
  { key: "mass-update", icon: RefreshCw, label: "Mass Update" },
  { key: "manage-tags", icon: Tags, label: "Manage Tags" },
  { key: "assignment-rules", icon: ShieldCheck, label: "Assignment Rules" },
  {
    key: "export-tasks",
    icon: Download,
    label: "Export Tasks",
    onSelect: () => exportTasksCsv(),
  },
];

export const printViewItems = [
  { key: "print-default", label: "Print Default view" },
  { key: "print-canvas", label: "Print Using Canvas", premium: true },
];

const taskSortOptions = [
  { key: "dueDate", label: "Due Date" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "taskId", label: "Task ID" },
  { key: "title", label: "Task Name" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "taskType", label: "Type" },
];

export default function TasksPage() {
  const [view, setView] = useState<ActivityView>("kanban");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);
  const [scopeTab, setScopeTab] = useState("All Tasks");

  const scopedFilters: TaskFilters = {
    ...filters,
    scope:
      scopeTab === "My Tasks"
        ? "mine"
        : scopeTab === "My Overdue Tasks"
          ? "my-overdue"
          : "all",
  };

  useEffect(() => {
    setView(loadTaskViewMode());
  }, []);

  function handleViewChange(mode: ActivityView) {
    setView(mode);
    persistTaskViewMode(mode);
  }

  function toggleField(
    sectionId: "status" | "priority" | "type",
    field: string,
  ) {
    setFilters((prev) => {
      if (sectionId === "priority") {
        const selected = field as Priority;
        const next = prev.priorities.includes(selected)
          ? prev.priorities.filter((value) => value !== selected)
          : [...prev.priorities, selected];
        return { ...prev, priorities: next };
      }

      if (sectionId === "status") {
        const selected = field as TaskStatus;
        const next = prev.statuses.includes(selected)
          ? prev.statuses.filter((value) => value !== selected)
          : [...prev.statuses, selected];
        return { ...prev, statuses: next };
      }

      const current = prev.types;
      const next = current.includes(field as (typeof current)[number])
        ? current.filter((f) => f !== field)
        : [...current, field as (typeof current)[number]];
      return { ...prev, types: next };
    });
  }

  function handleSortChange(field: string, direction: "asc" | "desc") {
    setSortField(field);
    setSortDirection(direction);
  }

  function handleClearSort() {
    setSortField(undefined);
  }

  function flash(msg: string) {
    setBulkFlash(msg);
    window.setTimeout(() => setBulkFlash(null), 2800);
  }

  function runBulkComplete() {
    let n = 0;
    for (const id of selectedTaskIds) {
      if (completeTask(id)) n += 1;
    }
    emitRulesChange("all");
    setSelectedTaskIds([]);
    flash(`Completed ${n} task${n === 1 ? "" : "s"}`);
  }

  function runBulkClone() {
    let n = 0;
    for (const id of selectedTaskIds) {
      if (cloneTask(id)) n += 1;
    }
    emitRulesChange("all");
    setSelectedTaskIds([]);
    flash(`Cloned ${n} task${n === 1 ? "" : "s"}`);
  }

  function runBulkReassign() {
    const owner =
      ACTIVITY_OWNERS.find((o) => o !== "John Smith") ?? ACTIVITY_OWNERS[0];
    let n = 0;
    for (const id of selectedTaskIds) {
      if (reassignTask(id, owner)) n += 1;
    }
    emitRulesChange("all");
    setSelectedTaskIds([]);
    flash(`Reassigned ${n} to ${owner}`);
  }

  function runBulkDelete() {
    if (!selectedTaskIds.length) return;
    const count = selectedTaskIds.length;
    if (
      !window.confirm(
        `Delete ${count} task${count === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    let n = 0;
    for (const id of selectedTaskIds) {
      if (deleteTask(id)) n += 1;
    }
    emitRulesChange("all");
    setSelectedTaskIds([]);
    flash(`Deleted ${n} task${n === 1 ? "" : "s"}`);
  }

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Task"
          createRoute="/activities/tasks/create"
          tabs={["My Overdue Tasks"]}
          leadingTabMenu={{
            items: ["All Tasks", "My Tasks"],
          }}
          activeTab={scopeTab}
          onTabChange={setScopeTab}
          view={view}
          onViewChange={handleViewChange}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          sortOptions={taskSortOptions}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onClearSort={handleClearSort}
          showRefresh
          moreMenuItems={moreMenuItems}
          printViewItems={printViewItems}
          extraViewIcons={[
            { key: "calendar", icon: CalendarDays, label: "Calendar view" },
            TIMELINE_VIEW_TOGGLE,
          ]}
        />

        {bulkFlash ? (
          <p className="mt-1 text-[12px] font-medium text-violet-700">
            {bulkFlash}
          </p>
        ) : null}

        {selectedTaskIds.length > 0 && (
          <EntitySelectionToolbar
            selectedCount={selectedTaskIds.length}
            onClear={() => setSelectedTaskIds([])}
            onCompleteSelected={runBulkComplete}
            onCloneSelected={runBulkClone}
            onChangeOwner={runBulkReassign}
            onDelete={runBulkDelete}
          />
        )}
      </div>

      <div className="mt-2 flex min-h-0 flex-1 items-stretch gap-4">
        {filterOpen && (
          <FilterPanel
            filters={filters}
            onToggleField={toggleField}
            onClose={() => setFilterOpen(false)}
          />
        )}

        <div
          className={`min-h-0 min-w-0 flex-1 ${
            view === "list" || view === "kanban" || view === "calendar"
              ? "overflow-hidden"
              : "overflow-auto [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin]"
          }`}
        >
          {view === "kanban" ? (
            <KanbanBoard
              filters={scopedFilters}
              search={search}
              selectedIds={selectedTaskIds}
              onSelectedIdsChange={setSelectedTaskIds}
            />
          ) : view === "calendar" ? (
            <TaskCalendarView filters={scopedFilters} search={search} />
          ) : view === "timeline" ? (
            <TaskTimelineView filters={scopedFilters} search={search} />
          ) : (
            <TaskListView
              filters={scopedFilters}
              search={search}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              onClearSort={handleClearSort}
              selectedIds={selectedTaskIds}
              onSelectedIdsChange={setSelectedTaskIds}
            />
          )}
        </div>
      </div>
    </div>
  );
}
