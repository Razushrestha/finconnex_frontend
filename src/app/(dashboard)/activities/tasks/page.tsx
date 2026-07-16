"use client";

import { FilterPanel } from "@/components/activities/tasks/Filterpanel";
import { KanbanBoard } from "@/components/activities/tasks/KanbanBoard";
import { TaskListView } from "@/components/activities/tasks/TaskListView";
import {
  TasksToolbar,
  TaskView,
} from "@/components/activities/tasks/TasksToolBar";
import { useState } from "react";

export default function TasksPage() {
  const [view, setView] = useState<TaskView>("kanban");
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50  lg:p-4">
      <div className="shrink-0">
        <TasksToolbar
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
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
