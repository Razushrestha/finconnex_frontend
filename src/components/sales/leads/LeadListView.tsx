"use client";

import { useMemo } from "react";
import {
  Mail,
  Phone,
  MapPin,
  MoreVertical,
  PhoneCall,
  RefreshCw,
  Layers,
  Globe,
} from "lucide-react";
import { LEAD_COLUMNS, type KanbanColumn } from "@/lib/leads/types";
import type { LeadFilters } from "./FilterLeadsPanel";

interface LeadListViewProps {
  columns?: KanbanColumn[];
  /** When omitted (or both arrays empty), every row is shown. */
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
    <div className="w-full overflow-hidden rounded-md border border-slate-200/80 bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Lead Name
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Status
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Value
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Email
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Phone
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Location
              </th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {allLeads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-slate-50/80 transition-colors"
              >
                {/* Name & Avatar */}
                <td className="px-5 py-1 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${lead.avatarBgClass}`}
                    >
                      {lead.initials}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {lead.name}
                    </span>
                  </div>
                </td>

                {/* Status Badge */}
                <td className="px-5 py-1 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                    <span
                      className={`h-2 w-2 rounded-full ${lead.statusDotColor}`}
                    />
                    {lead.statusTitle}
                  </span>
                </td>

                {/* Amount */}
                <td className="px-5 py-1 whitespace-nowrap font-medium text-slate-900">
                  {lead.amount}
                </td>

                {/* Email */}
                <td className="px-5 py-1 whitespace-nowrap text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{lead.email}</span>
                  </div>
                </td>

                {/* Phone */}
                <td className="px-5 py-1 whitespace-nowrap text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{lead.phone}</span>
                  </div>
                </td>

                {/* Location */}
                <td className="px-5 py-1 whitespace-nowrap text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{lead.location}</span>
                  </div>
                </td>

                {/* Action Controls */}
                <td className="px-5 py-1 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      aria-label="Web link"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Call"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Refresh"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Layers"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <Layers className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="More"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {allLeads.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-12 text-center text-sm text-slate-400"
                >
                  No leads match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
