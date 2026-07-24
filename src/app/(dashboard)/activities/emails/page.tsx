"use client";

import { useState } from "react";
import { EmailListTable } from "@/components/activities/emails/EmailListTable";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import { EmailsFilterPanel } from "@/components/activities/emails/EmailsFilterPanel";
import { EmailsKanbanBoard } from "@/components/activities/emails/EmailsKanbanBoard";
import { FocusHighlight } from "@/components/shared/FocusHighlight";

export default function EmailsPage() {
  const [view, setView] = useState<ActivityView>("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 p-4">
      <FocusHighlight />
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Email"
          createRoute="/activities/emails/create"
          tabs={["All Emails"]}
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
          <EmailsFilterPanel onClose={() => setFilterOpen(false)} />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-2xl [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
          {view === "list" ? <EmailListTable /> : <EmailsKanbanBoard />}
        </div>
      </div>
    </div>
  );
}
