"use client";

import { useState } from "react";
import { CallsFilterPanel, EMPTY_CALL_FILTERS, type CallFilters } from "@/components/activities/calls/CallsFilterPanel";
import { CallsKanbanBoard } from "@/components/activities/calls/CallsKanbanBoard";
import { CallsListTable } from "@/components/activities/calls/CallsListTable";
import {
  ActivityToolbar,
  type ActivityView,
  type MoreMenuItem,
  type PrintViewItem,
} from "@/components/activities/ActivityToolbar";
import {
  ActivityMassActionDialog,
  type ActivityMassAction,
} from "@/components/activities/ActivityMassActionDialog";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import {
  ArrowRightLeft,
  Trash2,
  RefreshCw,
  Tags,
  ShieldCheck,
} from "lucide-react";
import { activityExportMenuItem } from "@/lib/activities/export";
import { BOARD_PAGE } from "@/lib/layout";
import { isUuid } from "@/lib/activity-timeline/auth";
import { tryCrm, updateCrmCall } from "@/lib/calls/api";
import {
  appendCallNoteTag,
  deleteCall,
  findCallById,
  listCalls,
  updateCall,
  type CallScope,
} from "@/lib/calls/store";
import { CALL_STAGES, callColumns, type CallStatus } from "@/lib/calls/types";
import { openSoftphone } from "@/lib/softphone/events";
import { useCrmCalls } from "@/lib/calls/use-crm-calls";
import { cn } from "@/lib/utils";
import { kanbanPrefsFromCatalog } from "@/lib/kanban/column-prefs";
import { useKanbanColumnPrefs } from "@/lib/kanban/use-kanban-column-prefs";

const CALL_STAGE_DEFAULTS = kanbanPrefsFromCatalog(
  callColumns.map((col) => ({ id: col.id, label: col.title })),
);

export default function CallsPage() {
  const [view, setView] = useState<ActivityView>("kanban");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<CallFilters>(EMPTY_CALL_FILTERS);
  const [sortActive, setSortActive] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);
  const [scopeTab, setScopeTab] = useState("All Calls");
  const [massAction, setMassAction] = useState<ActivityMassAction | null>(null);
  const [massBusy, setMassBusy] = useState(false);
  const [massError, setMassError] = useState<string | null>(null);
  const crm = useCrmCalls();
  const stagePrefs = useKanbanColumnPrefs(
    "finconnex.calls.kanban-columns",
    CALL_STAGE_DEFAULTS,
  );

  const scope: CallScope =
    scopeTab === "My Overdue Calls" ? "my-overdue" : "all";

  function notify(message: string) {
    setBulkFlash(message);
    window.setTimeout(() => setBulkFlash(null), 2800);
  }

  function openMassAction(action: ActivityMassAction) {
    setMassError(null);
    setMassAction(action);
  }

  const boardCalls = listCalls();
  const printSource = selectedIds.length
    ? boardCalls.filter((call) => selectedIds.includes(call.id))
    : boardCalls;
  const printRows = printSource.map((call) => ({
    id: call.id,
    name: call.subject,
    owner: call.assignedTo,
    status: call.status,
  }));

  const moreMenuItems: MoreMenuItem[] = [
    {
      key: "mass-transfer",
      icon: ArrowRightLeft,
      label: "Mass Transfer",
      onSelect: () => openMassAction("transfer"),
    },
    {
      key: "mass-delete",
      icon: Trash2,
      label: "Mass Delete",
      onSelect: () => openMassAction("delete"),
    },
    {
      key: "mass-update",
      icon: RefreshCw,
      label: "Mass Update",
      onSelect: () => openMassAction("update"),
    },
    {
      key: "manage-tags",
      icon: Tags,
      label: "Manage Tags",
      onSelect: () => openMassAction("tags"),
    },
    {
      key: "assignment-rules",
      icon: ShieldCheck,
      label: "Assignment Rules",
      onSelect: () => openMassAction("assignment-rules"),
    },
    activityExportMenuItem("calls"),
  ];

  const printViewItems: PrintViewItem[] = [
    {
      key: "print-default",
      label: "Print Default view",
      onSelect: () => openMassAction("print"),
    },
    {
      key: "print-canvas",
      label: "Print Using Canvas",
      premium: true,
      onSelect: () => openMassAction("print"),
    },
  ];

  async function applyMassDelete() {
    if (!selectedIds.length) return;
    setMassBusy(true);
    setMassError(null);
    try {
      const ids = [...selectedIds];
      let n = 0;
      for (const id of ids) {
        if (deleteCall(id)) n += 1;
      }
      setSelectedIds([]);
      setMassAction(null);
      notify(`Deleted ${n} call${n === 1 ? "" : "s"}`);
    } catch (err) {
      setMassError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setMassBusy(false);
    }
  }

  function runBulkDelete() {
    openMassAction("delete");
  }

  async function applyMassTransfer(ownerId: string, ownerName: string) {
    if (!selectedIds.length) return;
    setMassBusy(true);
    setMassError(null);
    try {
      let n = 0;
      for (const id of selectedIds) {
        const next = updateCall(id, { assignedTo: ownerName });
        if (next) n += 1;
        if (isUuid(id) && isUuid(ownerId)) {
          await tryCrm(() => updateCrmCall(id, { assignedTo: ownerId }));
        }
      }
      setMassAction(null);
      notify(`Transferred ${n} call${n === 1 ? "" : "s"} to ${ownerName}`);
    } catch (err) {
      setMassError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setMassBusy(false);
    }
  }

  async function applyMassUpdate(status: string) {
    if (!selectedIds.length) return;
    setMassBusy(true);
    setMassError(null);
    try {
      let n = 0;
      for (const id of selectedIds) {
        const next = updateCall(id, { status: status as CallStatus });
        if (next) n += 1;
      }
      setMassAction(null);
      notify(`Updated status on ${n} call${n === 1 ? "" : "s"}`);
    } catch (err) {
      setMassError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setMassBusy(false);
    }
  }

  async function applyAddTag(tag: string) {
    if (!selectedIds.length) return;
    setMassBusy(true);
    setMassError(null);
    try {
      let n = 0;
      for (const id of selectedIds) {
        const found = findCallById(id);
        if (!found) continue;
        const next = updateCall(id, {
          notes: appendCallNoteTag(found.call.notes, tag),
        });
        if (next) n += 1;
      }
      setMassAction(null);
      notify(`Added tag to ${n} call${n === 1 ? "" : "s"}`);
    } catch (err) {
      setMassError(err instanceof Error ? err.message : "Tag update failed");
    } finally {
      setMassBusy(false);
    }
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
          tabs={["All Calls", "My Overdue Calls"]}
          activeTab={scopeTab}
          onTabChange={setScopeTab}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onClearSort={() => setSortActive(false)}
          moreMenuItems={moreMenuItems}
          printViewItems={printViewItems}
          columnOptions={view === "kanban" ? stagePrefs.columns : undefined}
          onColumnToggle={view === "kanban" ? stagePrefs.toggle : undefined}
          onColumnRename={view === "kanban" ? stagePrefs.rename : undefined}
          onColumnAdd={
            view === "kanban"
              ? (title) => {
                  const error = stagePrefs.addTitle(title);
                  if (error) notify(error);
                }
              : undefined
          }
          onColumnReorder={view === "kanban" ? stagePrefs.reorder : undefined}
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
          <CallsFilterPanel
            filters={filters}
            onChange={setFilters}
            onClose={() => setFilterOpen(false)}
          />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "kanban" ? (
            <CallsKanbanBoard
              scope={scope}
              filters={filters}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              visibleColumnIds={stagePrefs.visibleIds}
              columnTitles={stagePrefs.titles}
            />
          ) : (
            <CallsListTable
              scope={scope}
              filters={filters}
              sortActive={sortActive}
              filterOpen={filterOpen}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
            />
          )}
        </div>
      </div>

      <ActivityMassActionDialog
        action={massAction}
        entityLabel="Call"
        onClose={() => setMassAction(null)}
        selectedCount={selectedIds.length}
        busy={massBusy}
        error={massError}
        statusOptions={CALL_STAGES}
        printRows={printRows}
        printHint="Print selected calls, or the full board if none are selected."
        onTransfer={applyMassTransfer}
        onDelete={applyMassDelete}
        onUpdate={applyMassUpdate}
        onAddTag={applyAddTag}
      />
    </div>
  );
}
