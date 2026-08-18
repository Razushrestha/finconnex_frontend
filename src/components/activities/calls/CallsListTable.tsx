"use client";

import { useEffect, useMemo, useState } from "react";
import { Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { listCalls } from "@/lib/calls/store";
import { onRulesChange } from "@/lib/rules/storage";
import { RelatedToLink } from "@/components/activities/RelatedToLink";
import { useRouter } from "next/navigation";

interface CallsListTableProps {
  sortActive: boolean;
  filterOpen?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
}

export function CallsListTable({
  sortActive,
  filterOpen = false,
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
}: CallsListTableProps) {
  const router = useRouter();

  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const pageSize = 10;
  const selected = controlledSelectedIds ?? localSelected;

  function setSelected(ids: string[]) {
    if (onSelectedIdsChange) onSelectedIdsChange(ids);
    else setLocalSelected(ids);
  }

  useEffect(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    return onRulesChange(() => setTick((n) => n + 1));
  }, []);

  const sorted = useMemo(() => {
    const data = [...listCalls()];
    if (sortActive) {
      data.sort((a, b) => a.date.localeCompare(b.date));
    }
    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortActive, tick]);

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (!focus) return;
    const hit = sorted.find((c) => c.id === focus);
    if (hit) router.push(`/activities/calls/detail/${hit.id}`);
  }, [sorted, router]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage],
  );

  const allSelected =
    paginated.length > 0 && paginated.every((c) => selected.includes(c.id));

  function toggleAll() {
    const pageIds = paginated.map((c) => c.id);
    if (allSelected) {
      setSelected(selected.filter((id) => !pageIds.includes(id)));
    } else {
      setSelected([...new Set([...selected, ...pageIds])]);
    }
  }

  function toggleRow(id: string) {
    setSelected(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white">
      <div
        data-filter-open={filterOpen}
        className="min-h-0 flex-1 overflow-auto"
      >
        <table className="w-full min-w-[1000px] border-collapse text-left text-[12px]">
          <thead className="sticky top-0 z-10 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr className="border-b border-slate-100">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-violet-500"
                />
              </th>
              <th className="px-3 py-2.5">Subject</th>
              <th className="px-3 py-2.5">Related To</th>
              <th className="px-3 py-2.5">Contact</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Duration</th>
              <th className="px-3 py-2.5">Assigned To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.map((call) => (
              <tr
                key={call.id}
                data-focus-id={call.id}
                data-call-id={call.id}
                className="cursor-pointer hover:bg-slate-50/60"
                onClick={() =>
                  router.push(`/activities/calls/detail/${call.id}`)
                }
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.includes(call.id)}
                    onChange={() => toggleRow(call.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-violet-500"
                  />
                </td>
                <td className="px-3 py-2 font-semibold text-slate-900">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {call.subject}
                  </div>
                </td>
                <td
                  className="px-3 py-2 text-slate-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RelatedToLink
                    relatedTo={
                      call.relatedTo ||
                      (call.contact ? `Contact: ${call.contact}` : undefined)
                    }
                  />
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {call.contact || ""}
                </td>
                <td className="px-3 py-2 text-slate-600">{call.callType}</td>
                <td className="px-3 py-2 text-slate-600">{call.status}</td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {call.date}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {call.duration || ""}
                </td>
                <td className="px-3 py-2 text-slate-600">{call.assignedTo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
        <span>
          {(safePage - 1) * pageSize + 1}–
          {Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
