"use client";

import { useState } from "react";
import { CallsFilterPanel } from "@/components/activities/calls/CallsFilterPanel";
import { CallsKanbanBoard } from "@/components/activities/calls/CallsKanbanBoard";
import { CallsListTable } from "@/components/activities/calls/CallsListTable";
import { CallsTimelineView } from "@/components/activities/calls/CallsTimelineView";
import {
  ActivityToolbar,
  TIMELINE_VIEW_TOGGLE,
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
import { deleteCall, type CallScope } from "@/lib/calls/store";
import { openSoftphone } from "@/lib/softphone/events";
import { useCrmCalls } from "@/lib/calls/use-crm-calls";
import { cn } from "@/lib/utils";

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
  const [scopeTab, setScopeTab] = useState("All Calls");
  const crm = useCrmCalls();

  const scope: CallScope =
    scopeTab === "My Calls"
      ? "mine"
      : scopeTab === "My Overdue Calls"
        ? "my-overdue"
        : "all";

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
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              crm.source === "api"
                ? "bg-emerald-50 text-emerald-700"
                : crm.loading
                  ? "bg-slate-100 text-slate-500"
                  : "bg-slate-100 text-slate-500",
            )}
          >
            {crm.source === "api"
              ? "Live CRM"
              : crm.loading
                ? "Connecting…"
                : "Demo"}
          </span>
          {crm.error && crm.source === "demo" ? (
            <span className="text-[10px] text-slate-500">{crm.error}</span>
          ) : null}
        </div>
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
              onSelect: () => openSoftphone(),
            },
          ]}
          tabs={["My Overdue Calls"]}
          leadingTabMenu={{
            items: ["All Calls", "My Calls"],
          }}
          activeTab={scopeTab}
          onTabChange={setScopeTab}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onClearSort={() => setSortActive(false)}
          extraViewIcons={[TIMELINE_VIEW_TOGGLE]}
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
              scope={scope}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
            />
          ) : view === "timeline" ? (
            <CallsTimelineView scope={scope} />
          ) : (
            <CallsListTable
              scope={scope}
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
