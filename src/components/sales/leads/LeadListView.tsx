"use client";

import { useMemo } from "react";
import { MoreVertical } from "lucide-react";
import { LEAD_COLUMNS, type KanbanColumn } from "@/lib/leads/types";
import type { LeadFilters } from "./FilterLeadsPanel";

interface LeadListViewProps {
  columns?: KanbanColumn[];
  filters?: LeadFilters;
}

export function LeadListView({
  columns = LEAD_COLUMNS,
  filters,
}: LeadListViewProps) {
  const allLeads = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    const hasSourceFilter = !!filters?.sources.length;

    return columns
      .filter(
        (column) =>
          !hasStatusFilter || filters!.statuses.includes(column.title),
      )
      .flatMap((column) =>
        column.cards
          .filter(
            (card) =>
              !hasSourceFilter || filters!.sources.includes(card.source),
          )
          .map((card) => ({
            ...card,
            statusTitle: column.title,
            statusDotColor: column.dotColorClass,
          })),
      );
  }, [columns, filters]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[12px]">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="px-3 py-2.5">Lead</th>
              <th className="px-3 py-2.5">Company</th>
              <th className="px-3 py-2.5">Email</th>
              <th className="px-3 py-2.5">Phone</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Owner</th>
              <th className="px-3 py-2.5">Source</th>
              <th className="px-3 py-2.5">Created</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {allLeads.map((lead) => (
              <tr
                key={lead.id}
                className="transition-colors hover:bg-slate-50/80"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${lead.avatarBgClass}`}
                    >
                      {lead.initials}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {lead.name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {lead.company || "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {lead.email}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {lead.phone || "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${lead.statusDotColor}`}
                    />
                    {lead.statusTitle}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {lead.owner}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {lead.source}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {lead.createdDate}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    aria-label="More actions"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
        Showing {allLeads.length} leads
      </div>
    </div>
  );
}
