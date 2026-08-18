"use client";

import { useState } from "react";
import { CallsFilterPanel } from "@/components/activities/calls/CallsFilterPanel";
import { CallsKanbanBoard } from "@/components/activities/calls/CallsKanbanBoard";
import { CallsListTable } from "@/components/activities/calls/CallsListTable";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
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
import { deleteCall } from "@/lib/calls/store";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);

  function runBulkDelete() {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    if (
      !window.confirm(
        `Delete ${count} call${count === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    let n = 0;
    for (const id of selectedIds) {
      if (deleteCall(id)) n += 1;
    }
    setSelectedIds([]);
    setBulkFlash(`Deleted ${n} call${n === 1 ? "" : "s"}`);
    window.setTimeout(() => setBulkFlash(null), 2800);
  }

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      {/* Toolbar: fixed, never scrolls */}
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Call"
          createRoute="/activities/calls/create"
          createMenuItems={[
            {
              key: "schedule",
              label: "Schedule a call",
              href: "/activities/calls/create?mode=schedule&layoutid=standard&redirect=false",
            },
            {
              key: "log",
              label: "Log a call",
              href: "/activities/calls/create?mode=log&layoutid=standard&redirect=false",
            },
          ]}
          tabs={["All Calls"]}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onClearSort={() => setSortActive(false)}
          moreMenuItems={moreMenuItems}
          printViewItems={printViewItems}
        />

        {bulkFlash ? (
          <p className="mt-1 text-[12px] font-medium text-violet-700">
            {bulkFlash}
          </p>
        ) : null}

        {selectedIds.length > 0 ? (
          <EntitySelectionToolbar
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onDelete={runBulkDelete}
          />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {filterOpen && (
          <CallsFilterPanel onClose={() => setFilterOpen(false)} />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "kanban" ? (
            <CallsKanbanBoard
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
            />
          ) : (
            <CallsListTable
              sortActive={sortActive}
              filterOpen={filterOpen}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
            />
          )}
        </div>
      </div>
    </div>
  );
}
