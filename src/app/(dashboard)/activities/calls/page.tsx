"use client";

import { useState } from "react";
import { CallsFilterPanel } from "@/components/activities/calls/CallsFilterPanel";
import { CallsKanbanBoard } from "@/components/activities/calls/CallsKanbanBoard";
import { CallsListTable } from "@/components/activities/calls/CallsListTable";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";

export default function CallsPage() {
  const [view, setView] = useState<ActivityView>("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 p-4">
      {/* Toolbar — fixed, never scrolls */}
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Call"
          createRoute="/activities/calls/create"
          tabs={["All Calls"]}
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
          <CallsFilterPanel onClose={() => setFilterOpen(false)} />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "list" ? (
            <CallsListTable sortActive={sortActive} filterOpen={filterOpen} />
          ) : (
            <CallsKanbanBoard />
          )}
        </div>
      </div>
    </div>
  );
}
