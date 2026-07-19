"use client";

import type { Meeting, MeetingStatus } from "@/lib/meetings/types";
import { meetings } from "@/lib/meetings/types";
import { useState } from "react";
import { MeetingDetailModal } from "./MeetingDetailModal";

const statusStyles: Record<MeetingStatus, string> = {
  Scheduled: "bg-sky-50 text-sky-600",
  "In Progress": "bg-amber-50 text-amber-600",
  Completed: "bg-emerald-50 text-emerald-600",
  Cancelled: "bg-slate-100 text-slate-600",
  Rescheduled: "bg-indigo-50 text-indigo-600",
};

interface MeetingsListTableProps {
  data?: Meeting[];
}

export function MeetingsListTable({ data = meetings }: MeetingsListTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const isAllSelected = data.length > 0 && selectedIds.size === data.length;

  function toggleAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((m) => m.id)));
    }
  }

  function toggleRow(id: string, e: React.MouseEvent) {
    e.stopPropagation(); // Prevents modal from opening when clicking checkbox
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="w-10 border-b border-slate-200 bg-white px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  checked={isAllSelected}
                  onChange={toggleAll}
                />
              </th>
              {[
                "Title",
                "Related To",
                "Type",
                "Organizer",
                "Start Time",
                "End Time",
                "Status",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((meeting) => (
              <tr
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
                className="group cursor-pointer hover:bg-slate-50"
              >
                <td className="border-b border-slate-100 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    checked={selectedIds.has(meeting.id)}
                    onChange={(e) => toggleRow(meeting.id, e as any)}
                  />
                </td>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">
                  {meeting.title}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                  {meeting.relatedTo ?? "-"}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                  {meeting.type}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                  {meeting.organizer}
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-500">
                  {meeting.startDateTime}
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-500">
                  {meeting.endDateTime}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[meeting.status]}`}
                  >
                    {meeting.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
        />
      )}
    </div>
  );
}
