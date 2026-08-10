"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Trash2,
  RefreshCw,
  Tags,
  ShieldCheck,
  Download,
} from "lucide-react";
import { FilterPanel } from "@/components/activities/tasks/Filterpanel";
import { KanbanBoard } from "@/components/activities/tasks/KanbanBoard";
import { TaskListView } from "@/components/activities/tasks/TaskListView";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import {
  EMPTY_TASK_FILTERS,
  type Priority,
  type TaskFilters,
  type TaskStatus,
} from "@/lib/tasks/types";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";

const TASK_VIEW_MODE_KEY = "finconnex.tasks.view-mode";

function loadTaskViewMode(): ActivityView {
  if (typeof window === "undefined") return "kanban";
  try {
    const raw = localStorage.getItem(TASK_VIEW_MODE_KEY);
    if (raw === "list" || raw === "kanban") return raw;
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

export const moreMenuItems = [
  { key: "mass-transfer", icon: ArrowRightLeft, label: "Mass Transfer" },
  { key: "mass-delete", icon: Trash2, label: "Mass Delete" },
  { key: "mass-update", icon: RefreshCw, label: "Mass Update" },
  { key: "manage-tags", icon: Tags, label: "Manage Tags" },
  { key: "assignment-rules", icon: ShieldCheck, label: "Assignment Rules" },
  { key: "export-tasks", icon: Download, label: "Export Tasks" },
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
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      // Exclusive: pick one Priority or Status → table shows only that value.
      if (sectionId === "priority") {
        const selected = field as Priority;
        const already =
          prev.priorities.length === 1 && prev.priorities[0] === selected;
        return {
          ...prev,
          priorities: already ? [] : [selected],
        };
      }

      if (sectionId === "status") {
        const selected = field as TaskStatus;
        const already =
          prev.statuses.length === 1 && prev.statuses[0] === selected;
        return {
          ...prev,
          statuses: already ? [] : [selected],
        };
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

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 px-3 py-1">
      <FocusHighlight />
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Task"
          createRoute="/activities/tasks/create"
          tabs={["All Tasks", "My Overdue Tasks"]}
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
          savedViews={[
            "Tasks by Status",
            "Tasks by Assignee",
            "Tasks by Priority",
          ]}
        />
        {/* 
        {selectedIds.length > 0 ? (
        <EntitySelectionToolbar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          onSendMail={() => console.log("send mail clicked")}
          onAddTag={() => console.log("add tag clicked")}
          onRemoveTag={() => console.log("remove tag clicked")}
          onRunMacro={() => console.log("run macro clicked")}
          onCreateTask={() => console.log("create task clicked")}
          onSetReminder={() => console.log("set reminder clicked")}
          onMassUpdate={() => console.log("mass update clicked")}
          onChangeOwner={() => console.log("change owner clicked")}
          onCadences={() => console.log("cadences clicked")}
          onAddToCampaigns={() => console.log("add to campaigns clicked")}
          onPrintMailingLabels={() =>
            console.log("print mailing labels clicked")
          }
          onMailMerge={() => console.log("mail merge clicked")}
          onMassConvert={() => console.log("mass convert clicked")}
          onDelete={() => console.log("delete clicked")}
          onExportSelectedRecords={() =>
            console.log("export selected records clicked")
          }
        />
      ) : null} */}

        {selectedTaskIds.length > 0 && (
          <EntitySelectionToolbar
            selectedCount={selectedTaskIds.length}
            onClear={() => setSelectedTaskIds([])}
          />
        )}
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4 mt-2">
        {filterOpen && (
          <FilterPanel
            filters={filters}
            onToggleField={toggleField}
            onClose={() => setFilterOpen(false)}
          />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-auto [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
          {view === "kanban" ? (
            <KanbanBoard filters={filters} />
          ) : (
            <TaskListView
              filters={filters}
              onToggleField={toggleField}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              onClearSort={handleClearSort}
            />
          )}
        </div>
      </div>
    </div>
  );
}
