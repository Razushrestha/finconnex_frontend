"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trophy, XCircle } from "lucide-react";
import { type DealPipeline, type DealStage } from "@/lib/deals/types";
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
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface DragInfo {
  dealId: string;
  sourceStageId: string;
}

interface DropTargetPosition {
  stageId: string;
  targetIndex: number;
}

type DealRecord = DealStage["deals"][number];

/** A "mark as lost" drop that's waiting on a reason before it's committed. */
interface PendingLostDrop {
  deal: DealRecord;
  sourceStageId: string;
  targetStageId: string;
  targetStageTitle: string;
}

interface DealsKanbanBoardProps {
  pipeline: DealPipeline;
  filters?: DealFilters;
  visibleColumnIds?: string[];
  onAddDeal?: (stageId: string) => void;
}

// Adjust this offset to match whatever chrome (nav bar, filter bar, tabs)
// sits above the board on the page that renders it.
const BOARD_HEIGHT = "h-[calc(100vh-5rem)]";

export function DealsKanbanBoard({
  pipeline,
  filters,
  visibleColumnIds,
  onAddDeal,
}: DealsKanbanBoardProps) {
  const [allStages, setAllStages] = useState<Record<DealPipeline, DealStage[]>>(
    {} as Record<DealPipeline, DealStage[]>,
  );
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPosition | null>(
    null,
  );
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [overOutcome, setOverOutcome] = useState<"won" | "lost" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingLostDrop, setPendingLostDrop] =
    useState<PendingLostDrop | null>(null);
  const [lostReason, setLostReason] = useState("");

  useEffect(() => {
    setAllStages(listDealPipelines());
  }, []);

  function persist(next: Record<DealPipeline, DealStage[]>) {
    saveDealPipelines(next);
    setAllStages(next);
  }

  function toggleCollapsed(stageId: string) {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }

  const stages = allStages[pipeline] ?? [];

  const visibleStages = useMemo(() => {
    const hasStageFilter = !!filters?.stages.length;
    const hasColumnFilter = !!visibleColumnIds;

    const result = hasColumnFilter
      ? visibleColumnIds!
          .map((id) => stages.find((s) => s.id === id))
          .filter((s): s is DealStage => !!s)
      : stages;

    return result.filter(
      (s) => !hasStageFilter || filters!.stages.includes(s.title),
    );
  }, [stages, filters, visibleColumnIds]);

  const wonStage = useMemo(
    () => stages.find((s) => /won/i.test(s.title)),
    [stages],
  );
  const lostStage = useMemo(
    () => stages.find((s) => /lost/i.test(s.title)),
    [stages],
  );

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
    setOverOutcome(null);
  }

  function visibleDealCount(stage: DealStage) {
    if (dragInfo && dragInfo.sourceStageId === stage.id) {
      return stage.deals.length - 1;
    }
    return stage.deals.length;
  }

  /** Shared move: pulls the deal out of the source stage, drops it into the target. */
  function moveDeal(
    deal: DealRecord,
    sourceStage: DealStage,
    targetStage: DealStage,
    updatedDeal: DealRecord,
    targetIndex?: number,
  ) {
    const nextStages = allStages[pipeline].map((s) => {
      if (s.id === sourceStage.id && s.id === targetStage.id) {
        // Reordering within the same stage: remove then re-insert at the new index.
        const filteredDeals = s.deals.filter((d) => d.id !== deal.id);
        const insertAt =
          targetIndex !== undefined ? targetIndex : filteredDeals.length;
        const newDeals = [...filteredDeals];
        newDeals.splice(insertAt, 0, updatedDeal);
        return { ...s, deals: newDeals };
      }
      if (s.id === sourceStage.id) {
        return { ...s, deals: s.deals.filter((d) => d.id !== deal.id) };
      }
      if (s.id === targetStage.id) {
        const filteredDeals = s.deals.filter((d) => d.id !== deal.id);
        const insertAt =
          targetIndex !== undefined ? targetIndex : filteredDeals.length;
        const newDeals = [...filteredDeals];
        newDeals.splice(insertAt, 0, updatedDeal);
        return { ...s, deals: newDeals };
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
  }

  function handleDrop(targetStageId: string, targetIndex?: number) {
    setOverStageId(null);
    setDropTargetPos(null);
    if (!dragInfo) return;
    const { dealId, sourceStageId } = dragInfo;

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

    // If dropped directly into the "Closed Lost" stage via normal column drop, intercept to prompt for lost reason
    if (/lost/i.test(targetStage.title)) {
      setPendingLostDrop({
        deal,
        sourceStageId: sourceStage.id,
        targetStageId: targetStage.id,
        targetStageTitle: targetStage.title,
      });
      setLostReason("");
      setDragInfo(null);
      return;
    }

    const updatedDeal = {
      ...deal,
      accentColorClass: targetStage.dotColorClass,
    };

    moveDeal(deal, sourceStage, targetStage, updatedDeal, targetIndex);
    setDragInfo(null);
  }

  /** Drop onto the floating Win / Lost zone rather than a stage. */
  function handleOutcomeDrop(outcome: "won" | "lost") {
    setOverOutcome(null);
    if (!dragInfo) return;
    const { dealId, sourceStageId } = dragInfo;

    const targetStage = outcome === "won" ? wonStage : lostStage;
    if (!targetStage) {
      flash(
        `No "${outcome === "won" ? "Closed Won" : "Closed Lost"}" stage found`,
      );
      setDragInfo(null);
      return;
    }

    const currentStages = allStages[pipeline];
    const sourceStage = currentStages.find((s) => s.id === sourceStageId);
    const deal = sourceStage?.deals.find((d) => d.id === dealId);
    if (!deal || !sourceStage || sourceStage.id === targetStage.id) {
      setDragInfo(null);
      return;
    }

    if (outcome === "lost") {
      setPendingLostDrop({
        deal,
        sourceStageId: sourceStage.id,
        targetStageId: targetStage.id,
        targetStageTitle: targetStage.title,
      });
      setLostReason("");
      setDragInfo(null);
      return;
    }

    const updatedDeal = {
      ...deal,
      accentColorClass: targetStage.dotColorClass,
    };
    moveDeal(deal, sourceStage, targetStage, updatedDeal);
    setDragInfo(null);
    flash(`${deal.name} marked as won`);
  }

  function confirmLostDrop() {
    if (!pendingLostDrop) return;
    const { deal, sourceStageId, targetStageId } = pendingLostDrop;

    const currentStages = allStages[pipeline];
    const sourceStage = currentStages.find((s) => s.id === sourceStageId);
    const targetStage = currentStages.find((s) => s.id === targetStageId);
    if (!sourceStage || !targetStage) {
      setPendingLostDrop(null);
      return;
    }

    const updatedDeal = {
      ...deal,
      accentColorClass: targetStage.dotColorClass,
      lostReason: lostReason.trim(),
    };

    moveDeal(deal, sourceStage, targetStage, updatedDeal);
    flash(`${deal.name} marked as lost`);
    setPendingLostDrop(null);
    setLostReason("");
  }

  function cancelLostDrop() {
    setPendingLostDrop(null);
    setLostReason("");
  }

  return (
    <div className="relative w-full overflow-x-auto bg-slate-50/50 no-scrollbar">
      <div className="flex items-start gap-3 p-1">
        {visibleStages.map((stage) => {
          const isOver = overStageId === stage.id;
          const isCollapsed = collapsedStages.has(stage.id);

          return (
            <div
              key={stage.id}
              className={cn(
                "group relative flex flex-col gap-2 transition-all duration-200",
                BOARD_HEIGHT,
                isCollapsed
                  ? "w-14 min-w-[3.5rem] flex-shrink-0"
                  : "w-[300px] flex-shrink-0",
              )}
            >
              {isCollapsed ? (
                <div
                  className={cn(
                    "flex h-full flex-col rounded-sm border p-2",
                    dropTargetIdle,
                    isOver
                      ? dropTargetActive
                      : "border-slate-200/60 bg-slate-100/60",
                  )}
                >
                  <CollapsedStage
                    stage={stage}
                    onExpand={() => toggleCollapsed(stage.id)}
                  />
                </div>
              ) : (
                <div
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
                  className={cn(
                    "relative flex min-h-0 flex-1 flex-col rounded-sm border p-1",
                    dropTargetIdle,
                    isOver
                      ? dropTargetActive
                      : "border-slate-200/60 bg-slate-100/60",
                  )}
                >
                  <div className="p-2">
                    <div className="mb-3 flex items-center justify-between px-1 py-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${stage.dotColorClass}`}
                        />
                        <h2 className="max-w-[9.5rem] text-xs font-semibold leading-snug text-slate-800 xl:text-sm">
                          {stage.title}
                        </h2>
                        <span className="rounded-full border border-slate-200/80 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                          {stage.deals.length}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3 px-1 text-xs font-medium text-slate-500">
                      {stage.deals.length > 0
                        ? `avg ${Math.round(
                            stage.deals.reduce((s, d) => s + d.probability, 0) /
                              stage.deals.length,
                          )}%`
                        : "No deals"}
                    </div>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragInfo) {
                        setOverStageId(stage.id);
                        if (
                          !dropTargetPos ||
                          dropTargetPos.stageId !== stage.id
                        ) {
                          setDropTargetPos({
                            stageId: stage.id,
                            targetIndex: visibleDealCount(stage),
                          });
                        }
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDrop(stage.id, dropTargetPos?.targetIndex);
                    }}
                    className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-8 p-2 no-scrollbar"
                  >
                    {(() => {
                      let visibleIndex = 0;
                      const rendered: React.ReactNode[] = [];

                      const showPlaceholderAt = (idx: number) =>
                        dragInfo &&
                        dropTargetPos?.stageId === stage.id &&
                        dropTargetPos.targetIndex === idx;

                      stage.deals.forEach((deal) => {
                        const isDraggedDeal = dragInfo?.dealId === deal.id;
                        const myIndex = visibleIndex;

                        if (!isDraggedDeal && showPlaceholderAt(myIndex)) {
                          rendered.push(
                            <div
                              key={`placeholder-${deal.id}`}
                              className="h-[88px] rounded-md border-2 border-dashed border-indigo-300 bg-indigo-50/60 transition-all duration-150 ease-out"
                            />,
                          );
                        }

                        rendered.push(
                          <div
                            key={deal.id}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!dragInfo || isDraggedDeal) return;

                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              const midpoint = rect.top + rect.height / 2;
                              const insertIndex =
                                e.clientY < midpoint ? myIndex : myIndex + 1;

                              setDropTargetPos({
                                stageId: stage.id,
                                targetIndex: insertIndex,
                              });
                            }}
                          >
                            <DealRecordCard
                              deal={deal}
                              isDragging={isDraggedDeal}
                              onDragStart={(e) =>
                                handleDragStart(e, deal.id, stage.id)
                              }
                              onDragEnd={handleDragEnd}
                            />
                          </div>,
                        );

                        if (!isDraggedDeal) visibleIndex++;
                      });

                      if (showPlaceholderAt(visibleIndex)) {
                        rendered.push(
                          <div
                            key="placeholder-end"
                            className="h-[88px] rounded-md border-2 border-dashed border-indigo-300 bg-indigo-50/60 transition-all duration-150 ease-out"
                          />,
                        );
                      }

                      return (
                        <>
                          {rendered}
                          {stage.deals.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-8 text-center text-xs text-slate-400">
                              No deals found
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Collapse control */}
                  <div className="mt-2 flex shrink-0 items-center justify-between gap-2 px-2 pb-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onAddDeal?.(stage.id)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Deal
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleCollapsed(stage.id)}
                      aria-label={`Collapse ${stage.title}`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {visibleStages.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-12 text-center text-sm text-slate-400">
            No stages match the current filters.
          </div>
        )}
      </div>

      {/* Win / Lost drop zones — shown only while a deal is being dragged */}
      {dragInfo && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOverOutcome("won");
            }}
            onDragLeave={() =>
              setOverOutcome((prev) => (prev === "won" ? null : prev))
            }
            onDrop={(e) => {
              e.preventDefault();
              handleOutcomeDrop("won");
            }}
            className={cn(
              "pointer-events-auto flex w-40 items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur-sm transition-colors",
              overOutcome === "won"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-emerald-300 bg-white/90 text-emerald-600",
            )}
          >
            <Trophy className="h-4 w-4" />
            Won
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOverOutcome("lost");
            }}
            onDragLeave={() =>
              setOverOutcome((prev) => (prev === "lost" ? null : prev))
            }
            onDrop={(e) => {
              e.preventDefault();
              handleOutcomeDrop("lost");
            }}
            className={cn(
              "pointer-events-auto flex w-40 items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur-sm transition-colors",
              overOutcome === "lost"
                ? "border-rose-500 bg-rose-50 text-rose-700"
                : "border-rose-300 bg-white/90 text-rose-600",
            )}
          >
            <XCircle className="h-4 w-4" />
            Lost
          </div>
        </div>
      )}

      {pendingLostDrop && (
        <LostReasonModal
          dealName={pendingLostDrop.deal.name}
          reason={lostReason}
          onReasonChange={setLostReason}
          onCancel={cancelLostDrop}
          onConfirm={confirmLostDrop}
        />
      )}

      {toast && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function CollapsedStage({
  stage,
  onExpand,
}: {
  stage: DealStage;
  onExpand: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-between py-2">
      <div className="flex flex-col items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${stage.dotColorClass}`} />
        <span className="rounded-full border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
          {stage.deals.length}
        </span>
      </div>
      <p
        className="flex-1 py-3 text-xs font-semibold text-slate-600 [writing-mode:vertical-rl]"
        title={stage.title}
      >
        {stage.title}
      </p>
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Expand ${stage.title}`}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LostReasonModal({
  dealName,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  dealName: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">
            Mark as lost
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-900">
            {dealName}
          </p>
        </div>

        <div className="px-5 py-4">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Why was this deal lost?"
            className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reason.trim()}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mark as lost
          </button>
        </div>
      </div>
    </div>
  );
}
