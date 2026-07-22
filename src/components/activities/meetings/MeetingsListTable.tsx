"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Video,
  Phone,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { Meeting, MeetingStatus, MeetingType } from "@/lib/meetings/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import { MeetingDetailModal } from "./MeetingDetailModal";

const STATUS_META: Record<MeetingStatus, { soft: string; text: string }> = {
  Scheduled: { soft: "bg-sky-50", text: "text-sky-700" },
  "In Progress": { soft: "bg-amber-50", text: "text-amber-800" },
  Completed: { soft: "bg-emerald-50", text: "text-emerald-700" },
  Cancelled: { soft: "bg-slate-100", text: "text-slate-600" },
  Rescheduled: { soft: "bg-violet-50", text: "text-violet-700" },
};

const TYPE_ICON: Record<MeetingType, React.ElementType> = {
  "Video Call": Video,
  "Phone Call": Phone,
  Conference: Users,
  "In-person": MapPin,
};

interface MeetingsListTableProps {
  data: Meeting[];
  search?: string;
  onSearchChange?: (value: string) => void;
  statusLabel?: string;
  /** Sit inside a parent surface — no nested card chrome. */
  embedded?: boolean;
}

export function MeetingsListTable({
  data,
  search,
  onSearchChange,
  statusLabel = "All Meetings",
  embedded = false,
}: MeetingsListTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => data.slice((safePage - 1) * pageSize, safePage * pageSize),
    [data, safePage],
  );

  const isAllSelected =
    paginated.length > 0 && paginated.every((m) => selectedIds.has(m.id));

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllSelected) {
        paginated.forEach((m) => next.delete(m.id));
      } else {
        paginated.forEach((m) => next.add(m.id));
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function organizerName(email: string) {
    const local = email.split("@")[0] ?? email;
    return local
      .split(/[._-]/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden",
        !embedded &&
          "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]",
      )}
    >
      {!embedded ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900">
            {statusLabel}
          </h3>
          <p className="text-[11px] text-slate-400">
            {data.length} meeting{data.length === 1 ? "" : "s"}
            {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}
          </p>
        </div>
        {onSearchChange ? (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search ?? ""}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setPage(1);
              }}
              placeholder="Search meetings…"
              className="h-9 w-56 rounded-xl border border-slate-200/90 bg-white pr-3 pl-9 text-[12px] shadow-sm outline-none transition-all hover:border-violet-300 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
            />
          </div>
        ) : null}
      </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[980px] text-left text-[12px]">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={isAllSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Related To</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Organizer</th>
              <th className="px-4 py-2.5">Start</th>
              <th className="px-4 py-2.5">End</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.map((meeting) => {
              const status = STATUS_META[meeting.status];
              const TypeIcon = TYPE_ICON[meeting.type];
              const name = organizerName(meeting.organizer);
              return (
                <tr
                  key={meeting.id}
                  onClick={() => setSelectedMeeting(meeting)}
                  className="group cursor-pointer transition-colors hover:bg-violet-50/40"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={selectedIds.has(meeting.id)}
                      onChange={() => toggleRow(meeting.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${meeting.title}`}
                    />
                  </td>
                  <td className="max-w-[240px] px-4 py-3">
                    <p className="truncate font-semibold text-slate-900">
                      {meeting.title}
                    </p>
                    {meeting.agenda ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                        {meeting.agenda}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {meeting.relatedTo ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <TypeIcon className="h-3.5 w-3.5 text-slate-400" />
                      {meeting.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold",
                          avatarColor(name),
                        )}
                      >
                        {initials(name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-slate-700">{name}</p>
                        <p className="truncate text-[10px] text-slate-400">
                          {meeting.organizer}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {meeting.startDateTime}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {meeting.endDateTime}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        status.soft,
                        status.text,
                      )}
                    >
                      {meeting.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-16 text-center text-sm text-slate-400"
                >
                  No meetings match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
        <span>
          Showing {(safePage - 1) * pageSize + 1} to{" "}
          {Math.min(safePage * pageSize, data.length)} of {data.length} meetings
        </span>
        <div className="flex items-center gap-1">
          <PagerBtn
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            icon={<ChevronsLeft className="h-3.5 w-3.5" />}
          />
          <PagerBtn
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
          />
          <span className="mx-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-600 px-2 text-[11px] font-bold text-white">
            {safePage}
          </span>
          <PagerBtn
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            icon={<ChevronRight className="h-3.5 w-3.5" />}
          />
          <PagerBtn
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            icon={<ChevronsRight className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {selectedMeeting ? (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
        />
      ) : null}
    </div>
  );
}

function PagerBtn({
  onClick,
  disabled,
  icon,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
    >
      {icon}
    </button>
  );
}
