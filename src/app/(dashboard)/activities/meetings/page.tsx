"use client";

import { useState } from "react";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import { MeetingsFilterPanel } from "@/components/activities/meetings/MeetingsFilterPanel";
import { MeetingsListTable } from "@/components/activities/meetings/MeetingsListTable";
import { MeetingsKanbanBoard } from "@/components/activities/meetings/MeetingsKanbanBoard";

export default function EmailsPage() {
  const [view, setView] = useState<ActivityView>("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 p-4">
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Meetings"
          createRoute="/activities/meetings/create"
          tabs={["All Meetings"]}
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
          <MeetingsFilterPanel onClose={() => setFilterOpen(false)} />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-2xl [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
          {view === "list" ? <MeetingsListTable /> : <MeetingsKanbanBoard />}
        </div>
      </div>
    </div>
  );
}
