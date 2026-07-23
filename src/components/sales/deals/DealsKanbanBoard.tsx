"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import {
  type DealPipeline,
  type DealStage,
} from "@/lib/deals/types";
import { listDealPipelines, saveDealPipelines } from "@/lib/deals/store";
import {
  assertDealStageChange,
  getOrgManager,
  logStatusChange,
  notifyDealClosed,
  notifyStatusChanged,
} from "@/lib/rules";
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
  const [allStages, setAllStages] = useState<Record<DealPipeline, DealStage[]>>(
    {} as Record<DealPipeline, DealStage[]>,
  );
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setAllStages(listDealPipelines());
  }, []);

  function persist(next: Record<DealPipeline, DealStage[]>) {
    saveDealPipelines(next);
    setAllStages(next);
  }

  const stages = allStages[pipeline] ?? [];

  const visibleStages = useMemo(() => {
    const hasStageFilter = !!filters?.stages.length;
    if (!hasStageFilter) return stages;
    return stages.filter((s) => filters!.stages.includes(s.title));
  }, [stages, filters]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

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

    const currentStages = allStages[pipeline];
    const sourceStage = currentStages.find((s) => s.id === sourceStageId);
    const targetStage = currentStages.find((s) => s.id === targetStageId);
    const deal = sourceStage?.deals.find((d) => d.id === dealId);

    if (!deal || !sourceStage || !targetStage) {
      setDragInfo(null);
      return;
    }

    const gate = assertDealStageChange(sourceStage.title, targetStage.title);
    if (!gate.ok) {
      flash(gate.message);
      setDragInfo(null);
      return;
    }

    const updatedDeal = {
      ...deal,
      accentColorClass: targetStage.dotColorClass,
    };

    const nextStages = allStages[pipeline].map((s) => {
      if (s.id === sourceStageId) {
        return { ...s, deals: s.deals.filter((d) => d.id !== dealId) };
      }
      if (s.id === targetStageId) {
        return { ...s, deals: [updatedDeal, ...s.deals] };
      }
      return s;
    });
    persist({ ...allStages, [pipeline]: nextStages });

    logStatusChange(
      "sales.deals",
      deal.owner,
      deal.id,
      deal.name,
      sourceStage.title,
      targetStage.title,
    );
    notifyStatusChanged({
      recipient: deal.owner,
      entityLabel: `Deal ${deal.name}`,
      from: sourceStage.title,
      to: targetStage.title,
      relatedTo: deal.name,
      relatedHref: "/sales/deals",
    });
    if (
      targetStage.title === "Closed Won" ||
      targetStage.title === "Closed Lost"
    ) {
      notifyDealClosed({
        owner: deal.owner,
        manager: getOrgManager(),
        dealName: deal.name,
        stage: targetStage.title,
        relatedTo: deal.name,
        relatedHref: "/sales/deals",
      });
    }

    setDragInfo(null);
  }

  return (
    <div className="relative w-full overflow-x-auto bg-slate-50/50">
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
                  ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200"
                  : "border-slate-200/60 bg-slate-100/60"
              }`}
            >
              <div className="mb-3 flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${stage.dotColorClass}`}
                  />
                  <h2 className="text-sm font-semibold text-slate-800">
                    {stage.title}
                  </h2>
                  <span className="rounded-full border border-slate-200/80 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {stage.deals.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Add deal"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Column options"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
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

      {toast && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
