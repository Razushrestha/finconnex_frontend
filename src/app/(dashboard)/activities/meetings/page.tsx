"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Search,
  List,
  LayoutGrid,
  CalendarDays,
  Filter,
  Video,
  Phone,
  Users,
  MapPin,
  X,
} from "lucide-react";
import {
  MEETING_STATUSES,
  MEETING_TYPES,
  meetingColumns as initialColumns,
  type Meeting,
  type MeetingColumn,
  type MeetingStatus,
  type MeetingType,
} from "@/lib/meetings/types";
import { MeetingsListTable } from "@/components/activities/meetings/MeetingsListTable";
import { MeetingsKanbanColumn } from "@/components/activities/meetings/MeetingsKanbanColumn";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "kanban";
type StatusTab = "All" | MeetingStatus;

const STATUS_DOT: Record<MeetingStatus, string> = {
  Scheduled: "bg-sky-500",
  "In Progress": "bg-amber-500",
  Completed: "bg-emerald-500",
  Cancelled: "bg-slate-400",
  Rescheduled: "bg-violet-500",
};

const TYPE_ICON: Record<MeetingType, React.ElementType> = {
  "Video Call": Video,
  "Phone Call": Phone,
  Conference: Users,
  "In-person": MapPin,
};

export default function MeetingsPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [typeFilter, setTypeFilter] = useState<MeetingType | "All">("All");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [columns, setColumns] = useState<MeetingColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<{
    meetingId: string;
    sourceColumnId: string;
  } | null>(null);

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
      return prev.map((col) => {
        if (col.id === sourceColumnId) {
          const meetings = col.meetings.filter((m) => m.id !== meetingId);
          return { ...col, meetings, count: meetings.length };
        }
        if (col.id === targetColumnId) {
          const meetings = [
            { ...meeting, status: col.title },
            ...col.meetings,
          ];
          return { ...col, meetings, count: meetings.length };
        }
        return col;
      });
    });
    setDragInfo(null);
  }

  const activeTypeFilter = typeFilter !== "All" ? 1 : 0;

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.11),_transparent_65%)]"
      />

      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 transition-colors hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-500">Activities</span>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Meetings
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <CalendarDays className="h-2.5 w-2.5" />
              Aligned
            </span>
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              · Video, phone &amp; in-person
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/activities/meetings/create?layoutid=standard&redirect=false",
              )
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Meeting
          </button>
        </div>

        {/* ONE surface: toolbar + content */}
        <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
            <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
              <TabBtn
                active={statusTab === "All"}
                onClick={() => setStatusTab("All")}
                label="All"
                count={allMeetings.length}
              />
              {MEETING_STATUSES.map((s) => (
                <TabBtn
                  key={s}
                  active={statusTab === s}
                  onClick={() => setStatusTab(s)}
                  label={s}
                  count={statusCounts[s]}
                  compact
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-8 w-40 rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none transition-all hover:border-violet-300 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] sm:w-48"
                />
              </div>

              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium transition-colors",
                  filterOpen || activeTypeFilter
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
                {activeTypeFilter ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
                    {activeTypeFilter}
                  </span>
                ) : null}
              </button>

              <div className="flex items-center rounded-lg bg-slate-50 p-0.5">
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setView("list")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                    view === "list"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Board view"
                  onClick={() => setView("kanban")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                    view === "kanban"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-3 py-1.5 sm:px-4">
            {MEETING_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusTab(statusTab === s ? "All" : s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold transition-all",
                  statusTab === s
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])}
                />
                {s}
                <span className="tabular-nums text-slate-400">
                  {statusCounts[s]}
                </span>
              </button>
            ))}

            {filterOpen ? (
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
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
                        "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold transition-all",
                        typeFilter === t
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-500 hover:bg-slate-50",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {t}
                    </button>
                  );
                })}
                {typeFilter !== "All" ? (
                  <button
                    type="button"
                    onClick={() => setTypeFilter("All")}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-slate-500 hover:text-slate-700"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {view === "list" ? (
              <MeetingsListTable
                data={filteredMeetings}
                statusLabel={
                  statusTab === "All" ? "All Meetings" : statusTab
                }
                embedded
              />
            ) : (
              <div className="flex h-full min-h-[420px] divide-x divide-slate-100 overflow-x-auto">
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
                      onDragStartMeeting={handleDragStartMeeting}
                      onDragEndMeeting={() => setDragInfo(null)}
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
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  count,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all",
        compact && "hidden xl:inline-flex",
        active
          ? "bg-white text-violet-700 shadow-sm"
          : "text-slate-500 hover:text-slate-700",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums",
          active
            ? "bg-violet-100 text-violet-700"
            : "bg-slate-200/80 text-slate-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}
