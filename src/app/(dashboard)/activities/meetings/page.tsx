"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Phone, Users, MapPin, Search, X } from "lucide-react";
import {
  MEETING_STATUSES,
  MEETING_TYPES,
  type Meeting,
  type MeetingColumn,
  type MeetingStatus,
  type MeetingType,
} from "@/lib/meetings/types";
import {
  listMeetingColumns,
  saveMeetingColumns,
  deleteMeeting,
  meetingMatchesScope,
  type MeetingScope,
} from "@/lib/meetings/store";
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
import { onRulesChange } from "@/lib/rules/storage";

const TYPE_ICON: Record<MeetingType, React.ElementType> = {
  "Video Call": Video,
  "Phone Call": Phone,
  Conference: Users,
  "In-person": MapPin,
};

export default function MeetingsPage() {
  const router = useRouter();
  const [view, setView] = useState<ActivityView>("kanban");
  const [statusFilters, setStatusFilters] = useState<MeetingStatus[]>([]);
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
  const [scopeTab, setScopeTab] = useState("All Meetings");

  const scope: MeetingScope =
    scopeTab === "My Meetings"
      ? "mine"
      : scopeTab === "My Overdue Meetings"
        ? "my-overdue"
        : "all";

  useEffect(() => {
    setColumns(listMeetingColumns());
    return onRulesChange(() => setColumns(listMeetingColumns()));
  }, []);

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
    let data: Meeting[] = allMeetings;
    if (statusFilters.length) {
      data = data.filter((m) => statusFilters.includes(m.status));
    }
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
    data = data.filter((m) => meetingMatchesScope(m, scope));
    return data;
  }, [allMeetings, statusFilters, typeFilter, search, scope]);

  const visibleColumns = useMemo(() => {
    if (!statusFilters.length) return columns;
    return columns.filter((c) =>
      statusFilters.includes(c.title as MeetingStatus),
    );
  }, [columns, statusFilters]);

  function toggleStatus(status: MeetingStatus) {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status],
    );
  }

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
        <ActivityToolbar
          entityLabel="Meeting"
          createRoute="/activities/meetings/create?layoutid=standard&redirect=false"
          tabs={["My Overdue Meetings"]}
          leadingTabMenu={{
            items: ["All Meetings", "My Meetings"],
          }}
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
          <div className="absolute inset-y-0 left-0 z-30 flex sm:relative">
            <div className="flex w-64 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  Filters
                </h3>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="rounded-md p-0.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  aria-label="Close filters"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <label className="mb-4 flex h-9 items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#5A32A3]">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search meetings…"
                  className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
                />
              </label>
              <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Status
              </h4>
              <div className="mb-4 space-y-1">
                {MEETING_STATUSES.map((status) => (
                  <label
                    key={status}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={statusFilters.includes(status)}
                      onChange={() => toggleStatus(status)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-300"
                    />
                    {status}
                  </label>
                ))}
              </div>
              <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Type
              </h4>
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
              statusLabel="All Meetings"
              embedded
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
            />
          ) : (
            <div className="flex h-full w-full min-h-[420px] min-w-0 items-stretch gap-3 overflow-x-auto p-1 pr-3">
              {visibleColumns.map((column) => {
                const meetings = column.meetings.filter((m) => {
                  if (!meetingMatchesScope(m, scope)) return false;
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
