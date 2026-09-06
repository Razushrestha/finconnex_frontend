"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Download } from "lucide-react";
import { ResizableColumns } from "@/components/common/ResizableColumns";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  listTickets,
  supportTickets as seed,
  type SupportTicket,
  type TicketPriority,
  type TicketStatus,
  TICKET_PRIORITY_STYLE,
  TICKET_STATUS_STYLE,
} from "@/lib/support/types";
import { cn } from "@/lib/utils";
import { useCrmTickets } from "@/lib/support/use-crm-tickets";

export default function SupportTicketsPage() {
  const router = useRouter();
  const crm = useCrmTickets();
  const [rows, setRows] = useState<SupportTicket[]>(seed);
  const [statusTab, setStatusTab] = useState<TicketStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "All">(
    "All",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRows(listTickets());
  }, [crm.source, crm.loading]);

  useEffect(() => {
    setPage(1);
  }, [statusTab, priorityFilter, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      TICKET_STATUSES.map((s) => [s, 0]),
    ) as Record<TicketStatus, number>;
    for (const r of rows) map[r.status] += 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (priorityFilter !== "All")
      data = data.filter((r) => r.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.subject.toLowerCase().includes(q) ||
          r.ticketId.toLowerCase().includes(q) ||
          r.requester.toLowerCase().includes(q) ||
          (r.relatedAccount ?? "").toLowerCase().includes(q) ||
          (r.assignedTo ?? "").toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, priorityFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function exportCsv() {
    const header = [
      "ID",
      "Subject",
      "Requester",
      "Account",
      "Priority",
      "Status",
      "Category",
      "Assigned",
      "CSAT",
    ];
    const body = filtered.map((r) =>
      [
        r.ticketId,
        r.subject,
        r.requester,
        r.relatedAccount ?? "",
        r.priority,
        r.status,
        r.category ?? "",
        r.assignedTo ?? "",
        r.satisfactionRating ?? "",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "support-tickets.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">

      <div className="relative mx-auto flex max-w-[1920px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={() =>
                router.push("/support/create?layoutid=standard&redirect=false")
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New ticket
            </button>
          </div>
        </div>

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusTab("All")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              statusTab === "All"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            All {rows.length}
          </button>
          {TICKET_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusTab(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                statusTab === s
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {s} {counts[s]}
            </button>
          ))}
        </div>

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as TicketPriority | "All")
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
          >
            <option value="All">All priorities</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <ResizableColumns storageKey="support-list" className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Ticket</th>
                <th className="px-3 py-2.5">Requester</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Assignee</th>
                <th className="px-4 py-2.5">Category</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/support/${r.id}`)}
                  className="cursor-pointer border-t border-slate-50 hover:bg-violet-50/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{r.ticketId}</div>
                    <div className="max-w-xs truncate text-[11px] text-slate-500">
                      {r.subject}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-slate-700">{r.requester}</div>
                    {r.relatedAccount ? (
                      <div className="text-[10px] text-slate-400">
                        {r.relatedAccount}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        TICKET_PRIORITY_STYLE[r.priority],
                      )}
                    >
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        TICKET_STATUS_STYLE[r.status],
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {r.assignedTo ?? ""}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.category ?? ""}
                    {r.satisfactionRating ? (
                      <span className="ml-1.5 text-amber-600">
                        ★ {r.satisfactionRating}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    No tickets match
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </ResizableColumns>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
            <span>
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
