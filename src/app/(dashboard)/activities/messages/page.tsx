"use client";

import { useState } from "react";
import { MessagesFilterPanel } from "@/components/activities/messages/MessagesFilterPanel";
import { MessagesListTable } from "@/components/activities/messages/MessagesListTable";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";

export default function MessagesPage() {
  const [view, setView] = useState<ActivityView>("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 p-2 sm:p-4">
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Message"
          createRoute="/activities/messages/create"
          tabs={["All Messages"]}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          sortActive={sortActive}
          onClearSort={() => setSortActive(false)}
        />
      </div>
      <div className="relative flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {/* On mobile, filter panel can act as an absolute overlay, or slide over content */}
        {filterOpen && (
          <div className="absolute inset-y-0 left-0 z-30 flex sm:relative">
            <MessagesFilterPanel onClose={() => setFilterOpen(false)} />
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "list" && <MessagesListTable />}
        </div>
      </div>
    </div>
  );
}
