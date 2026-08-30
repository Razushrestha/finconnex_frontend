"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Phone, Users, MapPin } from "lucide-react";
import {
  MEETING_STATUSES,
  MEETING_TYPES,
  type Meeting,
  type MeetingColumn,
  type MeetingStatus,
  type MeetingType,
} from "@/lib/meetings/types";
import { listMeetingColumns, saveMeetingColumns, deleteMeeting } from "@/lib/meetings/store";
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
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";
import { BOARD_PAGE } from "@/lib/layout";
import { activityExportMenuItem } from "@/lib/activities/export";
import { DropTargetPos } from "@/components/activities/meetings/MeetingsKanbanBoard";

const TYPE_ICON: Record<MeetingType, React.ElementType> = {
  "Video Call": Video,
  "Phone Call": Phone,
  Conference: Users,
  "In-person": MapPin,
};

export default function MeetingsPage() {
  const router = useRouter();
  const crm = useCrmMeetings();
  const [view, setView] = useState<ActivityView>("kanban");
  const [statusTab, setStatusTab] = useState<"All" | MeetingStatus>("All");
  const [typeFilter, setTypeFilter] = useState<MeetingType | "All">("All");
  const [search, setSearch] = useState("");
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

  useEffect(() => {
    if (crm.loading) return;
    setColumns(listMeetingColumns());
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

  const statusCounts = useMemo(() => {
    const map = Object.fromEntries(
      MEETING_STATUSES.map((s) => [s, 0]),
    ) as Record<MeetingStatus, number>;
    for (const m of allMeetings) map[m.status] += 1;
    return map;
  }, [allMeetings]);

  const filteredMeetings = useMemo(() => {
    let data: Meeting[] = allMeetings;
    if (statusTab !== "All") data = data.filter((m) => m.status === statusTab);
    if (typeFilter !== "All") data = data.filter((m) => m.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.relatedTo?.toLowerCase().includes(q) ?? false) ||
          m.organizer.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q) ||
          (m.agenda?.toLowerCase().includes(q) ?? false),
      );
    }
    return data;
  }, [allMeetings, statusTab, typeFilter, search]);

  const visibleColumns = useMemo(() => {
    if (statusTab === "All") return columns;
    return columns.filter((c) => c.title === statusTab);
  }, [columns, statusTab]);

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
          tabs={["All", ...MEETING_STATUSES]}
          activeTab={statusTab}
          onTabChange={(tab) => setStatusTab(tab as "All" | MeetingStatus)}
          tabCounts={{
            All: allMeetings.length,
            ...statusCounts,
          }}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onClearSort={() => setSortActive(false)}
          search={search}
          onSearchChange={setSearch}
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
          <div className="absolute inset-y-0 left-0 z-30 flex sm:relative">
            <div className="flex w-64 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Filter by Type
              </h3>
              <div className="space-y-1">
                {MEETING_TYPES.map((t) => {
                  const Icon = TYPE_ICON[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setTypeFilter(typeFilter === t ? "All" : t)
                      }
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                        typeFilter === t
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "list" ? (
            <MeetingsListTable
              data={filteredMeetings}
              statusLabel={statusTab === "All" ? "All Meetings" : statusTab}
              embedded
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
            />
          ) : (
            <div className="flex h-full min-h-[420px] items-stretch gap-3 overflow-x-auto p-1">
              {visibleColumns.map((column) => {
                const meetings = column.meetings.filter((m) => {
                  if (typeFilter !== "All" && m.type !== typeFilter)
                    return false;
                  if (!search.trim()) return true;
                  const q = search.toLowerCase();
                  return (
                    m.title.toLowerCase().includes(q) ||
                    (m.relatedTo?.toLowerCase().includes(q) ?? false) ||
                    m.organizer.toLowerCase().includes(q) ||
                    (m.agenda?.toLowerCase().includes(q) ?? false)
                  );
                });
                return (
                  <MeetingsKanbanColumn
                    key={column.id}
                    column={{ ...column, meetings, count: meetings.length }}
                    draggingMeetingId={dragInfo?.meetingId ?? null}
                    dropTargetPos={dropTargetPos}
                    setDropTargetPos={setDropTargetPos}
                    onDragStartMeeting={handleDragStartMeeting}
                    onDragEndMeeting={() => {
                      setDragInfo(null);
                      setDropTargetPos(null);
                    }}
                    onDropMeeting={handleDropMeeting}
                    embedded
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
