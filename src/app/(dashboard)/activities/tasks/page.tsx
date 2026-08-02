"use client";

import { useState } from "react";
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
import { EMPTY_TASK_FILTERS, type TaskFilters } from "@/lib/tasks/types";
import { FocusHighlight } from "@/components/shared/FocusHighlight";

const moreMenuItems = [
  { key: "mass-transfer", icon: ArrowRightLeft, label: "Mass Transfer" },
  { key: "mass-delete", icon: Trash2, label: "Mass Delete" },
  { key: "mass-update", icon: RefreshCw, label: "Mass Update" },
  { key: "manage-tags", icon: Tags, label: "Manage Tags" },
  { key: "assignment-rules", icon: ShieldCheck, label: "Assignment Rules" },
  { key: "export-tasks", icon: Download, label: "Export Tasks" },
];

const printViewItems = [
  { key: "print-default", label: "Print Default view" },
  { key: "print-canvas", label: "Print Using Canvas", premium: true },
];

const taskSortOptions = [
  { key: "dueDate", label: "Due Date" },
  { key: "priority", label: "Priority" },
  { key: "taskId", label: "Task ID" },
  { key: "title", label: "Task Name" },
];

export default function TasksPage() {
  const [view, setView] = useState<ActivityView>("kanban");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  function toggleField(
    sectionId: "status" | "priority" | "type",
    field: string,
  ) {
    setFilters((prev) => {
      const key =
        sectionId === "status"
          ? "statuses"
          : sectionId === "priority"
            ? "priorities"
            : "types";
      const current = prev[key] as string[];
      const next = current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field];
      return { ...prev, [key]: next };
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
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 px-4 py-1">
      <FocusHighlight />
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Task"
          createRoute="/activities/tasks/create"
          tabs={["All Tasks", "My Overdue Tasks"]}
          view={view}
          onViewChange={setView}
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
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4">
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
