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

export default function TasksPage() {
  const [view, setView] = useState<ActivityView>("kanban");
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50  lg:p-4">
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Task"
          createRoute="/activities/tasks/create"
          tabs={["All Tasks", "My Overdue Tasks"]}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
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

      {/* Content row fills remaining height */}
      <div className="flex min-h-0 flex-1 items-stretch gap-4">
        {filterOpen && <FilterPanel onClose={() => setFilterOpen(false)} />}

        <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-2xl [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
          {view === "kanban" ? <KanbanBoard /> : <TaskListView />}
        </div>
      </div>
    </div>
  );
}
