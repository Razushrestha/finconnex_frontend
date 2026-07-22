"use client";

import { useMemo, useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import {
  DEAL_PIPELINE_STAGES,
  type DealPipeline,
  type DealStage,
} from "@/lib/deals/types";
import type { DealFilters } from "./FilterDealsPanel";
import { DealRecordCard } from "./DealRecordCard";

interface DragInfo {
  dealId: string;
  sourceStageId: string;
}

interface DealsKanbanBoardProps {
  pipeline: DealPipeline;
  /** When omitted (or empty), every stage/card in the active pipeline is shown. */
  filters?: DealFilters;
}

export function DealsKanbanBoard({ pipeline, filters }: DealsKanbanBoardProps) {
  // Each pipeline keeps its own stage/card state, so switching the pipeline
  // selector and switching back doesn't lose any drag-and-drop moves.
  const [allStages, setAllStages] =
    useState<Record<DealPipeline, DealStage[]>>(DEAL_PIPELINE_STAGES);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);

  const stages = allStages[pipeline];

  const visibleStages = useMemo(() => {
    const hasStageFilter = !!filters?.stages.length;
    if (!hasStageFilter) return stages;
    return stages.filter((s) => filters!.stages.includes(s.title));
  }, [stages, filters]);

  function handleDragStart(
    e: React.DragEvent<HTMLDivElement>,
    dealId: string,
    stageId: string,
  ) {
    setDragInfo({ dealId, sourceStageId: stageId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragInfo(null);
    setOverStageId(null);
  }

  function handleDrop(targetStageId: string) {
    setOverStageId(null);
    if (!dragInfo) return;
    const { dealId, sourceStageId } = dragInfo;

    if (sourceStageId === targetStageId) {
      setDragInfo(null);
      return;
    }

    setAllStages((prev) => {
      const currentStages = prev[pipeline];
      const sourceStage = currentStages.find((s) => s.id === sourceStageId);
      const targetStage = currentStages.find((s) => s.id === targetStageId);
      const deal = sourceStage?.deals.find((d) => d.id === dealId);

      if (!deal || !targetStage) return prev;

      // Update the deal's accent color to match the target stage's dot color
      const updatedDeal = {
        ...deal,
        accentColorClass: targetStage.dotColorClass,
      };

      const nextStages = currentStages.map((s) => {
        if (s.id === sourceStageId) {
          return { ...s, deals: s.deals.filter((d) => d.id !== dealId) };
        }
        if (s.id === targetStageId) {
          return { ...s, deals: [updatedDeal, ...s.deals] };
        }
        return s;
      });

      return { ...prev, [pipeline]: nextStages };
    });

    setDragInfo(null);
  }

  return (
    <div className="w-full overflow-x-auto bg-slate-50/50">
      <div className="grid min-w-[1400px] grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {visibleStages.map((stage) => {
          const isOver = overStageId === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragInfo) setOverStageId(stage.id);
              }}
              onDragLeave={() =>
                setOverStageId((prev) => (prev === stage.id ? null : prev))
              }
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(stage.id);
              }}
              className={`flex flex-col rounded-sm border p-3 transition-colors ${
                isOver
                  ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-slate-200/60 bg-slate-100/60"
              }`}
            >
              {/* Stage Header */}
              <div className="mb-3 flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${stage.dotColorClass}`}
                  />
                  <h2 className="text-sm font-semibold text-slate-800">
                    {stage.title}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 border border-slate-200/80">
                    {stage.deals.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Add deal"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Column options"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mb-3 px-1 text-xs font-medium text-slate-500">
                {stage.deals.length > 0
                  ? `${stage.deals.length} deal${stage.deals.length === 1 ? "" : "s"} · avg ${Math.round(
                      stage.deals.reduce((s, d) => s + d.probability, 0) /
                        stage.deals.length,
                    )}%`
                  : "No deals"}
              </div>

              {/* Cards Stack */}
              <div className="flex flex-col gap-3">
                {stage.deals.map((deal) => (
                  <DealRecordCard
                    key={deal.id}
                    deal={deal}
                    isDragging={dragInfo?.dealId === deal.id}
                    onDragStart={(e) => handleDragStart(e, deal.id, stage.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))}

                {stage.deals.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-8 text-center text-xs text-slate-400">
                    Drop a deal here
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {visibleStages.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white/60 py-12 text-center text-sm text-slate-400">
            No deals match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
