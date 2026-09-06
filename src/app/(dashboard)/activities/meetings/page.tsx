"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type MeetingColumn,
  type MeetingStatus,
} from "@/lib/meetings/types";
import {
  listMeetingColumns,
  saveMeetingColumns,
  deleteMeeting,
  meetingMatchesScope,
  type MeetingScope,
} from "@/lib/meetings/store";
import {
  deleteCrmMeeting,
  isCrmMeetingId,
  persistRemoteMeeting,
  syncMeetingStatus,
  tryCrmMeeting,
} from "@/lib/meetings/api";
import { useCrmMeetings } from "@/lib/meetings/use-crm-meetings";
import { MeetingsListTable } from "@/components/activities/meetings/MeetingsListTable";
import { MeetingsKanbanColumn } from "@/components/activities/meetings/MeetingsKanbanColumn";
import {
  EMPTY_MEETING_FILTERS,
  MeetingsFilterPanel,
  type MeetingFilters,
} from "@/components/activities/meetings/MeetingsFilterPanel";
import { meetingMatchesFilters } from "@/lib/filters/records";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";
import { BOARD_PAGE } from "@/lib/layout";
import { activityExportMenuItem } from "@/lib/activities/export";
import { DropTargetPos } from "@/components/activities/meetings/MeetingsKanbanBoard";
import { onRulesChange } from "@/lib/rules/storage";

export default function MeetingsPage() {
  const router = useRouter();
  const crm = useCrmMeetings();
  const [view, setView] = useState<ActivityView>("kanban");
  const [filters, setFilters] = useState<MeetingFilters>(EMPTY_MEETING_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);
  const [columns, setColumns] = useState<MeetingColumn[]>([]);
  const [dragInfo, setDragInfo] = useState<{
    meetingId: string;
    sourceColumnId: string;
  } | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPos | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);
  const [scopeTab, setScopeTab] = useState("All Meetings");

  const scope: MeetingScope =
    scopeTab === "My Overdue Meetings" ? "my-overdue" : "all";

  useEffect(() => {
    if (crm.loading) return;
    setColumns(listMeetingColumns());
    return onRulesChange(() => setColumns(listMeetingColumns()));
  }, [crm.source, crm.loading]);

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (focus) router.replace(`/activities/meetings/detail/${focus}`);
  }, [router]);

  const allMeetings = useMemo(
    () =>
      columns.flatMap((c) =>
        c.meetings.map((m) => ({ ...m, status: c.title as MeetingStatus })),
      ),
    [columns],
  );

  const filteredMeetings = useMemo(() => {
    return allMeetings.filter(
      (m) => meetingMatchesFilters(m, filters) && meetingMatchesScope(m, scope),
    );
  }, [allMeetings, filters, scope]);

  const visibleColumns = useMemo(() => {
    const cols = filters.statuses.length
      ? columns.filter((c) =>
          filters.statuses.includes(c.title as MeetingStatus),
        )
      : columns;
    return cols.map((column) => {
      const meetings = column.meetings.filter(
        (m) =>
          meetingMatchesScope(m, scope) &&
          meetingMatchesFilters(
            { ...m, status: column.title as MeetingStatus },
            filters,
          ),
      );
      return { ...column, meetings, count: meetings.length };
    });
  }, [columns, filters, scope]);

  function handleDragStartMeeting(
    e: React.DragEvent<HTMLDivElement>,
    meetingId: string,
    columnId: string,
  ) {
    setDragInfo({ meetingId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDropMeeting(targetColumnId: string) {
    if (!dragInfo) return;
    const { meetingId, sourceColumnId } = dragInfo;
    if (sourceColumnId === targetColumnId) {
      setDragInfo(null);
      return;
    }
    setColumns((prev) => {
      const source = prev.find((c) => c.id === sourceColumnId);
      const meeting = source?.meetings.find((m) => m.id === meetingId);
      if (!meeting) return prev;
      const next = prev.map((col) => {
        if (col.id === sourceColumnId) {
          const meetings = col.meetings.filter((m) => m.id !== meetingId);
          return { ...col, meetings, count: meetings.length };
        }
        if (col.id === targetColumnId) {
          const meetings = [{ ...meeting, status: col.title }, ...col.meetings];
          return { ...col, meetings, count: meetings.length };
        }
        return col;
      });
      saveMeetingColumns(next);
      const target = next.find((c) => c.id === targetColumnId);
      if (target && isCrmMeetingId(meetingId)) {
        void tryCrmMeeting(() =>
          syncMeetingStatus(meetingId, target.title, {
            startDateTime: meeting.startDateTime,
            endDateTime: meeting.endDateTime,
          }),
        ).then((live) => {
          persistRemoteMeeting(live);
        });
      }
      return next;
    });
    setDragInfo(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  }

  function runBulkDelete() {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    if (
      !window.confirm(
        `Delete ${count} meeting${count === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    let n = 0;
    for (const id of selectedIds) {
      if (deleteMeeting(id)) n += 1;
      if (isCrmMeetingId(id)) {
        void tryCrmMeeting(() => deleteCrmMeeting(id));
      }
    }
    setColumns(listMeetingColumns());
    setSelectedIds([]);
    setBulkFlash(`Deleted ${n} meeting${n === 1 ? "" : "s"}`);
    window.setTimeout(() => setBulkFlash(null), 2800);
  }

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      <div className="shrink-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              crm.source === "api"
                ? "bg-emerald-50 text-emerald-700"
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
          entityLabel="Meeting"
          createRoute="/activities/meetings/create?layoutid=standard&redirect=false"
          tabs={["All Meetings", "My Overdue Meetings"]}
          activeTab={scopeTab}
          onTabChange={setScopeTab}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onClearSort={() => setSortActive(false)}
          moreMenuItems={[activityExportMenuItem("meetings")]}
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

      <div className="relative flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden pt-3">
        {filterOpen && (
          <MeetingsFilterPanel
            filters={filters}
            onChange={setFilters}
            onClose={() => setFilterOpen(false)}
          />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "list" ? (
            <MeetingsListTable
              data={filteredMeetings}
              statusLabel="All Meetings"
              embedded
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
            />
          ) : (
            <div className="flex h-full w-full min-h-[420px] min-w-0 items-stretch gap-3 overflow-x-auto p-1 pr-3">
              {visibleColumns.map((column) => {
                return (
                  <MeetingsKanbanColumn
                    key={column.id}
                    column={column}
                    draggingMeetingId={dragInfo?.meetingId ?? null}
                    dropTargetPos={dropTargetPos}
                    setDropTargetPos={setDropTargetPos}
                    onDragStartMeeting={handleDragStartMeeting}
                    onDragEndMeeting={() => {
                      setDragInfo(null);
                      setDropTargetPos(null);
                    }}
                    onDropMeeting={handleDropMeeting}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelected}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
