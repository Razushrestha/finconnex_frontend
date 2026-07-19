"use client";

import { useMemo, useState } from "react";
import { PhoneOutgoing, ChevronLeft, ChevronRight } from "lucide-react";
import { calls, totalCallRecords } from "@/lib/calls/types";

const columns = [
  { key: "relatedTo", label: "Related To" },
  { key: "callOwner", label: "Call Owner" },
  { key: "subject", label: "Subject" },
  { key: "callType", label: "Call Type" },
  { key: "callStartTime", label: "Call Start Time" },
  { key: "callDuration", label: "Call Duration" },
  { key: "callPurpose", label: "Call Purpose" },
  { key: "description", label: "Description" },
] as const;

interface CallsListTableProps {
  sortActive: boolean;
  filterOpen?: boolean;
}

export function CallsListTable({
  sortActive,
  filterOpen = false,
}: CallsListTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(calls.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => calls.slice((safePage - 1) * pageSize, safePage * pageSize),
    [safePage],
  );

  const allSelected =
    selected.size === paginated.length && paginated.length > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(paginated.map((c) => c.id)));
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const rangeStart = (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, calls.length);

  return (
    <div className="flex h-full w-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white">
      <div
        data-filter-open={filterOpen}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100"
      >
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="w-10 px-4 py-1">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-1 font-medium ${
                    col.key === "callStartTime" && sortActive
                      ? "text-indigo-600"
                      : ""
                  }`}
                >
                  {col.label}
                  {col.key === "callStartTime" && sortActive && (
                    <span className="ml-1 text-indigo-500">▲</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginated.map((call) => (
              <tr
                key={call.id}
                className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60"
              >
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(call.id)}
                    onChange={() => toggleRow(call.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <PhoneOutgoing className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="whitespace-nowrap">{call.relatedTo}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-500">{call.callOwner}</td>
                <td className=" px-4 py-2 text-slate-500">{call.subject}</td>
                <td className="px-4 py-2 text-slate-500">{call.callType}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                  {call.callStartTime}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {call.callDuration ?? ""}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {call.callPurpose ?? ""}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {call.description ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-4 py-2.5">
        <p className="text-xs text-slate-500">
          Total Records{" "}
          <span className="font-medium text-slate-700">
            {totalCallRecords.toLocaleString()}
          </span>
        </p>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            {rangeStart} to {rangeEnd}
          </span>
          <button
            type="button"
            aria-label="Previous page"
            disabled={safePage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={safePage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
