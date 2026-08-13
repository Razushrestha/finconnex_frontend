"use client";

import { useState } from "react";
import { CallsFilterPanel } from "@/components/activities/calls/CallsFilterPanel";
import { CallsKanbanBoard } from "@/components/activities/calls/CallsKanbanBoard";
import { CallsListTable } from "@/components/activities/calls/CallsListTable";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { printViewItems } from "../tasks/page";
import {
  ArrowRightLeft,
  Trash2,
  RefreshCw,
  Tags,
  ShieldCheck,
} from "lucide-react";
import { activityExportMenuItem } from "@/lib/activities/export";
import { BOARD_PAGE } from "@/lib/layout";

const moreMenuItems = [
  { key: "mass-transfer", icon: ArrowRightLeft, label: "Mass Transfer" },
  { key: "mass-delete", icon: Trash2, label: "Mass Delete" },
  { key: "mass-update", icon: RefreshCw, label: "Mass Update" },
  { key: "manage-tags", icon: Tags, label: "Manage Tags" },
  { key: "assignment-rules", icon: ShieldCheck, label: "Assignment Rules" },
  activityExportMenuItem("calls"),
];

export default function CallsPage() {
  const [view, setView] = useState<ActivityView>("kanban");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      {/* Toolbar: fixed, never scrolls */}
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Call"
          createRoute="/activities/calls/create"
          tabs={["All Calls"]}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onClearSort={() => setSortActive(false)}
          moreMenuItems={moreMenuItems}
          printViewItems={printViewItems}
        />
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {filterOpen && (
          <CallsFilterPanel onClose={() => setFilterOpen(false)} />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "kanban" ? (
            <CallsKanbanBoard />
          ) : (
            <CallsListTable sortActive={sortActive} filterOpen={filterOpen} />
          )}
        </div>
      </div>
    </div>
  );
}
