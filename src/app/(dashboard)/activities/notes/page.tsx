"use client";

import {
  ActivityToolbar,
  ActivityView,
} from "@/components/activities/ActivityToolbar";
import { NotesFilterPanel } from "@/components/activities/notes/NotesFilterPanel";
import { NotesKanbanBoard } from "@/components/activities/notes/NotesKanbanBoard";
import { NotesListView } from "@/components/activities/notes/NotesListView";
import { useState } from "react";

function NotesPage() {
  const [view, setView] = useState<ActivityView>("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 p-4 ">
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Notes"
          createRoute="/activities/messages/create"
          tabs={["All Notes"]}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          sortActive={sortActive}
          onClearSort={() => setSortActive(false)}
        />
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {filterOpen && (
          <NotesFilterPanel onClose={() => setFilterOpen(false)} />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "kanban" ? <NotesKanbanBoard /> : <NotesListView />}
        </div>
      </div>
    </div>
  );
}

export default NotesPage;
