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
import { listMeetingColumns, saveMeetingColumns } from "@/lib/meetings/store";
import { MeetingsListTable } from "@/components/activities/meetings/MeetingsListTable";
import { MeetingsKanbanColumn } from "@/components/activities/meetings/MeetingsKanbanColumn";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";
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

  useEffect(() => {
    setColumns(listMeetingColumns());
  }, []);

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
      return next;
    });
    setDragInfo(null);
  }

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 p-2 sm:p-4">
      <FocusHighlight />
      <div className="shrink-0">
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
            />
          ) : (
            <div className="flex h-full min-h-[420px] divide-x divide-slate-100 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
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
