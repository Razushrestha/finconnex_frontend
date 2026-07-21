"use client";

import { useMemo } from "react";
import {
  Building2,
  Calendar,
  MoreVertical,
  PhoneCall,
  RefreshCw,
  Layers,
  Globe,
} from "lucide-react";
import {
  DEAL_PIPELINE_STAGES,
  type DealPipeline,
  type DealStage,
} from "@/lib/deals/types";
import type { DealFilters } from "./FilterDealsPanel";

interface DealsListViewProps {
  pipeline: DealPipeline;
  stages?: DealStage[];
  filters?: DealFilters;
}

export function DealsListView({
  pipeline,
  stages = DEAL_PIPELINE_STAGES[pipeline],
  filters,
}: DealsListViewProps) {
  const allDeals = useMemo(() => {
    const hasStageFilter = !!filters?.stages.length;

    return stages
      .filter(
        (stage) => !hasStageFilter || filters!.stages.includes(stage.title),
      )
      .flatMap((stage) =>
        stage.deals.map((deal) => ({
          ...deal,
          stageTitle: stage.title,
          stageDotColor: stage.dotColorClass,
        })),
      );
  }, [stages, filters]);

  return (
    <div className="w-full overflow-hidden rounded-md border border-slate-200/80 bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Deal Name
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Stage
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Value
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Company
              </th>
              <th scope="col" className="px-5 py-3.5 font-semibold">
                Expected Close
              </th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {allDeals.map((deal) => (
              <tr
                key={deal.id}
                className="hover:bg-slate-50/80 transition-colors"
              >
                {/* Name & Avatar */}
                <td className="px-5 py-1 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${deal.avatarBgClass}`}
                    >
                      {deal.initials}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {deal.name}
                    </span>
                  </div>
                </td>

                {/* Stage Badge */}
                <td className="px-5 py-1 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                    <span
                      className={`h-2 w-2 rounded-full ${deal.stageDotColor}`}
                    />
                    {deal.stageTitle}
                  </span>
                </td>

                {/* Value */}
                <td className="px-5 py-1 whitespace-nowrap font-medium text-slate-900">
                  <div className="flex items-center gap-1.5">
                    <span>{deal.value}</span>
                  </div>
                </td>

                {/* Company */}
                <td className="px-5 py-1 whitespace-nowrap text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{deal.company}</span>
                  </div>
                </td>

                {/* Close Date */}
                <td className="px-5 py-1 whitespace-nowrap text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{deal.closeDate}</span>
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

            {allDeals.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm text-slate-400"
                >
                  No deals match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
