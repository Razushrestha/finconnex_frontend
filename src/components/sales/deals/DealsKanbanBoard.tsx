"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { KanbanOutcomeDropBar } from "@/components/common/KanbanOutcomeDropBar";
import { type DealPipeline, type DealStage } from "@/lib/deals/types";
import {
  listDealPipelines,
  saveDealPipelines,
  stageWeightedForecast,
} from "@/lib/deals/store";
import { onRulesChange } from "@/lib/rules";
import {
  assertDealStageChange,
  getOrgManager,
  logStatusChange,
  notifyDealClosed,
  notifyStatusChanged,
} from "@/lib/rules";
import type { DealFilters } from "./FilterDealsPanel";
import { dealMatchesFilters } from "@/lib/filters/records";
import { DealRecordCard } from "./DealRecordCard";
import type { DealQuickActionKind } from "./DealRecordCard";
import {
  DealCardPanelHost,
  type DealPanelState,
} from "./DealCardPanelHost";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  KANBAN_BOARD_ROW,
  KANBAN_COL,
  KANBAN_COL_COLLAPSED,
  KANBAN_DROP_GHOST,
  KANBAN_HEADER,
  KANBAN_HEADER_COUNT,
  KANBAN_HEADER_TITLE,
  KANBAN_WELL,
} from "@/lib/layout";
import { useRouter } from "next/navigation";

interface DragInfo {
  dealIds: string[];
  sourceStageId: string;
}

interface DropTargetPosition {
  stageId: string;
  targetIndex: number;
}

type DealRecord = DealStage["deals"][number];

/** A "mark as lost" drop that's waiting on a reason before it's committed. */
interface PendingLostDrop {
  deals: DealRecord[];
  sourceStageId: string;
  targetStageId: string;
  targetStageTitle: string;
}

interface DealsKanbanBoardProps {
  pipeline: DealPipeline;
  filters?: DealFilters;
  visibleColumnIds?: string[];
  onAddDeal?: (stageId: string) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onQuickAction?: (kind: DealQuickActionKind, deal: DealRecord) => void;
}

export function DealsKanbanBoard({
  pipeline,
  filters,
  visibleColumnIds,
  onAddDeal,
  selectedIds = [],
  onToggleSelect,
  onQuickAction,
}: DealsKanbanBoardProps) {
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardBounds, setBoardBounds] = useState<{
    left: number;
    width: number;
  } | null>(null);

  const [allStages, setAllStages] = useState<Record<DealPipeline, DealStage[]>>(
    {} as Record<DealPipeline, DealStage[]>,
  );

  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(
    new Set(),
  );
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<DealPanelState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function openQuickAction(kind: DealQuickActionKind, deal: DealRecord) {
    setPanel({
      type: "quick-action",
      kind,
      dealId: deal.id,
      dealName: deal.name,
      account: deal.account,
      owner: deal.owner,
    });
    onQuickAction?.(kind, deal);
  }

  // Sync internal/external selection
  const activeSelectedIds = useMemo(() => {
    return selectedIds.length > 0 ? new Set(selectedIds) : internalSelectedIds;
  }, [selectedIds, internalSelectedIds]);

  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPosition | null>(
    null,
  );
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [overOutcome, setOverOutcome] = useState<"won" | "lost" | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingLostDrop, setPendingLostDrop] =
    useState<PendingLostDrop | null>(null);
  const [lostReason, setLostReason] = useState("");

  useEffect(() => {
    function updateBounds() {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        setBoardBounds({ left: rect.left, width: rect.width });
      }
    }
    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, []);

  useEffect(() => {
    if (dragInfo && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setBoardBounds({ left: rect.left, width: rect.width });
    }
  }, [dragInfo]);

  useEffect(() => {
    setAllStages(listDealPipelines());
  }, []);

  useEffect(() => {
    return onRulesChange(() => setAllStages(listDealPipelines()));
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

    return result
      .filter((s) => !hasStageFilter || filters!.stages.includes(s.title))
      .map((s) => ({
        ...s,
        deals: s.deals.filter((deal) =>
          dealMatchesFilters({ ...deal, stageTitle: s.title }, filters),
        ),
      }));
  }, [stages, filters, visibleColumnIds]);

  const wonStage = useMemo(
    () => stages.find((s) => /won/i.test(s.title)),
    [stages],
  );
  const lostStage = useMemo(
    () => stages.find((s) => /lost/i.test(s.title)),
    [stages],
  );

  function handleSelectDeal(
    dealId: string,
    stageDeals: DealRecord[],
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
  ) {
    if (onToggleSelect) {
      // If external handler is provided, delegate to it
      onToggleSelect(dealId);
      return;
    }

    const isShift = "shiftKey" in e && (e as React.MouseEvent).shiftKey;
    const isMeta =
      ("metaKey" in e && (e as React.MouseEvent).metaKey) ||
      ("ctrlKey" in e && (e as React.MouseEvent).ctrlKey);

    setInternalSelectedIds((prev) => {
      const next = new Set(prev);

      if (isShift && lastSelectedId) {
        const startIdx = stageDeals.findIndex((d) => d.id === lastSelectedId);
        const endIdx = stageDeals.findIndex((d) => d.id === dealId);
        if (startIdx !== -1 && endIdx !== -1) {
          const [min, max] =
            startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          for (let i = min; i <= max; i++) {
            next.add(stageDeals[i].id);
          }
        }
      } else if (isMeta) {
        if (next.has(dealId)) {
          next.delete(dealId);
        } else {
          next.add(dealId);
          setLastSelectedId(dealId);
        }
      } else {
        if (next.size === 1 && next.has(dealId)) {
          next.clear();
          setLastSelectedId(null);
        } else {
          next.clear();
          next.add(dealId);
          setLastSelectedId(dealId);
        }
      }
      return next;
    });
  }

  function handleSelectAllStage(stage: DealStage) {
    const stageDealIds = stage.deals.map((d) => d.id);
    const allSelected = stageDealIds.every((id) => activeSelectedIds.has(id));

    if (onToggleSelect) {
      stageDealIds.forEach((id) => {
        if (allSelected && activeSelectedIds.has(id)) {
          onToggleSelect(id);
        } else if (!allSelected && !activeSelectedIds.has(id)) {
          onToggleSelect(id);
        }
      });
      return;
    }

    setInternalSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        stageDealIds.forEach((id) => next.delete(id));
      } else {
        stageDealIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function handleDragStart(
    e: React.DragEvent<HTMLDivElement>,
    dealId: string,
    stageId: string,
  ) {
    let activeIds = activeSelectedIds;
    if (!activeIds.has(dealId)) {
      activeIds = new Set([dealId]);
      if (!onToggleSelect) setInternalSelectedIds(activeIds);
    }
    setDragInfo({ dealIds: Array.from(activeIds), sourceStageId: stageId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragInfo(null);
    setOverStageId(null);
    setOverOutcome(null);
  }

  function visibleDealCount(stage: DealStage) {
    if (dragInfo && dragInfo.sourceStageId === stage.id) {
      const draggedSet = new Set(dragInfo.dealIds);
      return stage.deals.filter((d) => !draggedSet.has(d.id)).length;
    }
    return stage.deals.length;
  }

  function moveDeals(
    dealsToMove: DealRecord[],
    sourceStage: DealStage,
    targetStage: DealStage,
    updatedDeals: DealRecord[],
    targetIndex?: number,
  ) {
    const moveIdsSet = new Set(dealsToMove.map((d) => d.id));

    const nextStages = allStages[pipeline].map((s) => {
      if (s.id === sourceStage.id && s.id === targetStage.id) {
        const filteredDeals = s.deals.filter((d) => !moveIdsSet.has(d.id));
        const insertAt =
          targetIndex !== undefined
            ? Math.min(targetIndex, filteredDeals.length)
            : filteredDeals.length;
        const newDeals = [...filteredDeals];
        newDeals.splice(insertAt, 0, ...updatedDeals);
        return { ...s, deals: newDeals };
      }
      if (s.id === sourceStage.id) {
        return { ...s, deals: s.deals.filter((d) => !moveIdsSet.has(d.id)) };
      }
      if (s.id === targetStage.id) {
        const filteredDeals = s.deals.filter((d) => !moveIdsSet.has(d.id));
        const insertAt =
          targetIndex !== undefined
            ? Math.min(targetIndex, filteredDeals.length)
            : filteredDeals.length;
        const newDeals = [...filteredDeals];
        newDeals.splice(insertAt, 0, ...updatedDeals);
        return { ...s, deals: newDeals };
      }
      return s;
    });

    persist({ ...allStages, [pipeline]: nextStages });

    void import("@/lib/deals/api").then(({ updateCrmDeal, apiDealStage, tryCrmDeal, isCrmDealId }) => {
      for (const deal of dealsToMove) {
        if (!isCrmDealId(deal.id)) continue;
        void tryCrmDeal(() =>
          updateCrmDeal(deal.id, { stage: apiDealStage(targetStage.title) }),
        );
      }
    });

    dealsToMove.forEach((deal) => {
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
    });

    if (!onToggleSelect) {
      setInternalSelectedIds(new Set());
    }
  }

  function handleDrop(targetStageId: string, targetIndex?: number) {
    setOverStageId(null);
    setDropTargetPos(null);
    if (!dragInfo) return;
    const { dealIds, sourceStageId } = dragInfo;

    const currentStages = allStages[pipeline];
    const sourceStage = currentStages.find((s) => s.id === sourceStageId);
    const targetStage = currentStages.find((s) => s.id === targetStageId);

    if (!sourceStage || !targetStage) {
      setDragInfo(null);
      return;
    }

    const dealsToMove = sourceStage.deals.filter((d) => dealIds.includes(d.id));
    if (dealsToMove.length === 0) {
      setDragInfo(null);
      return;
    }

    const gate = assertDealStageChange(sourceStage.title, targetStage.title);
    if (!gate.ok) {
      flash(gate.message);
      setDragInfo(null);
      return;
    }

    if (/lost/i.test(targetStage.title)) {
      setPendingLostDrop({
        deals: dealsToMove,
        sourceStageId: sourceStage.id,
        targetStageId: targetStage.id,
        targetStageTitle: targetStage.title,
      });
      setLostReason("");
      setDragInfo(null);
      return;
    }

    const updatedDeals = dealsToMove.map((deal) => ({
        ...deal,
        accentColorClass: targetStage.dotColorClass,
    }));

    moveDeals(dealsToMove, sourceStage, targetStage, updatedDeals, targetIndex);
    setDragInfo(null);
    flash(
      `Moved ${dealsToMove.length} deal${dealsToMove.length > 1 ? "s" : ""} to ${targetStage.title}`,
    );
  }

  function handleOutcomeDrop(outcome: "won" | "lost") {
    setOverOutcome(null);
    if (!dragInfo) return;
    const { dealIds, sourceStageId } = dragInfo;

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
    if (!sourceStage || sourceStage.id === targetStage.id) {
      setDragInfo(null);
      return;
    }

    const dealsToMove = sourceStage.deals.filter((d) => dealIds.includes(d.id));
    if (dealsToMove.length === 0) {
      setDragInfo(null);
      return;
    }

    if (outcome === "lost") {
      setPendingLostDrop({
        deals: dealsToMove,
        sourceStageId: sourceStage.id,
        targetStageId: targetStage.id,
        targetStageTitle: targetStage.title,
      });
      setLostReason("");
      setDragInfo(null);
      return;
    }

    const updatedDeals = dealsToMove.map((deal) => ({
      ...deal,
      accentColorClass: targetStage.dotColorClass,
    }));
    moveDeals(dealsToMove, sourceStage, targetStage, updatedDeals);
    setDragInfo(null);
    flash(
      `${dealsToMove.length} deal${dealsToMove.length > 1 ? "s" : ""} marked as won`,
    );
  }

  function confirmLostDrop() {
    if (!pendingLostDrop) return;
    const { deals, sourceStageId, targetStageId } = pendingLostDrop;

    const currentStages = allStages[pipeline];
    const sourceStage = currentStages.find((s) => s.id === sourceStageId);
    const targetStage = currentStages.find((s) => s.id === targetStageId);
    if (!sourceStage || !targetStage) {
      setPendingLostDrop(null);
      return;
    }

    const updatedDeals = deals.map((deal) => ({
      ...deal,
      accentColorClass: targetStage.dotColorClass,
      lostReason: lostReason.trim(),
    }));

    moveDeals(deals, sourceStage, targetStage, updatedDeals);
    flash(`${deals.length} deal${deals.length > 1 ? "s" : ""} marked as lost`);
    setPendingLostDrop(null);
    setLostReason("");
  }

  function cancelLostDrop() {
    setPendingLostDrop(null);
    setLostReason("");
  }

  return (
    <div
      ref={boardRef}
      className="relative h-full w-full overflow-x-auto overflow-y-hidden bg-slate-50"
    >
      <div className={KANBAN_BOARD_ROW}>
        {visibleStages.map((stage) => {
          const isOver = overStageId === stage.id;
          const isCollapsed = collapsedStages.has(stage.id);
          const stageDealIds = stage.deals.map((d) => d.id);
          const allStageSelected =
            stageDealIds.length > 0 &&
            stageDealIds.every((id) => activeSelectedIds.has(id));
          const someStageSelected = stageDealIds.some((id) =>
            activeSelectedIds.has(id),
          );

          return (
            <div
              key={stage.id}
              className={cn(
                "group/stage relative flex h-full min-h-0 flex-col gap-2 transition-all duration-200",
                isCollapsed ? KANBAN_COL_COLLAPSED : KANBAN_COL,
              )}
            >
              {isCollapsed ? (
                <KanbanCollapsedRail
                  title={stage.title}
                  count={stage.deals.length}
                  onExpand={() => toggleCollapsed(stage.id)}
                  extra={
                    stage.deals.length > 0 ? (
                      <span className="text-[10px] font-medium text-slate-500 [writing-mode:vertical-rl]">
                        ${Math.round(stageWeightedForecast(stage)).toLocaleString()}
                      </span>
                    ) : null
                  }
                />
              ) : (
                <>
                  <div className={KANBAN_HEADER}>
                    <div className="flex h-6 items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className={KANBAN_HEADER_TITLE} title={stage.title}>
                          {stage.title}
                        </h2>
                        <span className={KANBAN_HEADER_COUNT}>
                          {stage.deals.length}
                        </span>
                      </div>
                    </div>
                    <div className="truncate text-xs font-medium leading-5 text-slate-500">
                      {stage.deals.length > 0
                        ? `$${Math.round(
                            stageWeightedForecast(stage),
                          ).toLocaleString()} wtd`
                        : "No deals"}
                    </div>
                  </div>

                  <KanbanStageScroll
                    footer={
                      <KanbanColumnFooter
                        createLabel="Create Deal"
                        onCreate={() => router.push("/sales/deals/create")}
                        onCollapse={() => toggleCollapsed(stage.id)}
                        collapseLabel={`Collapse ${stage.title}`}
                      />
                    }
                  >
                  <div
              onDragOver={(e) => {
                e.preventDefault();
                if (dragInfo) setOverStageId(stage.id);
              }}
              onDragLeave={() =>
                      setOverStageId((prev) =>
                        prev === stage.id ? null : prev,
                      )
              }
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(stage.id);
              }}
                    className={cn(
                      "relative flex min-h-full flex-col rounded-sm border p-1",
                      dropTargetIdle,
                isOver
                        ? dropTargetActive
                        : KANBAN_WELL,
                    )}
                  >
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
                      className="flex min-h-[180px] flex-1 flex-col gap-3 pb-8"
                    >
                      {(() => {
                        let visibleIndex = 0;
                        const rendered: React.ReactNode[] = [];
                        const draggedSet = dragInfo
                          ? new Set(dragInfo.dealIds)
                          : new Set();

                        const showPlaceholderAt = (idx: number) =>
                          dragInfo &&
                          dropTargetPos?.stageId === stage.id &&
                          dropTargetPos.targetIndex === idx;

                        stage.deals.forEach((deal) => {
                          const isDraggedDeal = draggedSet.has(deal.id);
                          const myIndex = visibleIndex;

                          if (!isDraggedDeal && showPlaceholderAt(myIndex)) {
                            rendered.push(
                              <div
                                key={`placeholder-${deal.id}`}
                                className={KANBAN_DROP_GHOST}
                              />,
                            );
                          }

                          const isSelected = activeSelectedIds.has(deal.id);

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
                              className="relative group/card"
                            >
                  <DealRecordCard
                    deal={deal}
                                isDragging={isDraggedDeal}
                                isSelected={activeSelectedIds.has(deal.id)}
                                onSelect={(e) =>
                                  handleSelectDeal(deal.id, stage.deals, e)
                                }
                                onDragStart={(e) =>
                                  handleDragStart(e, deal.id, stage.id)
                                }
                    onDragEnd={handleDragEnd}
                                onQuickAction={(kind) =>
                                  openQuickAction(kind, deal)
                                }
                              />
                            </div>,
                          );

                          if (!isDraggedDeal) visibleIndex++;
                        });

                        if (showPlaceholderAt(visibleIndex)) {
                          rendered.push(
                            <div
                              key="placeholder-end"
                              className={KANBAN_DROP_GHOST}
                            />,
                          );
                        }

                        return (
                          <>
                            {rendered}
                {stage.deals.length === 0 ? (
                  <KanbanEmptyStage entity="Deals" />
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  </KanbanStageScroll>
                </>
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

      {activeSelectedIds.size > 0 && !dragInfo && !selectedIds.length && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-slate-900/90 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
          <span className="text-xs font-medium">
            {activeSelectedIds.size} deal{activeSelectedIds.size > 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={() => setInternalSelectedIds(new Set())}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {dragInfo && boardBounds && (
        <KanbanOutcomeDropBar
          over={overOutcome}
          onOver={setOverOutcome}
          onLeave={(outcome) =>
            setOverOutcome((prev) => (prev === outcome ? null : prev))
          }
          onDrop={handleOutcomeDrop}
          wonLabel={`Win (${dragInfo.dealIds.length})`}
          lostLabel={`Lost (${dragInfo.dealIds.length})`}
          style={{ left: boardBounds.left, width: boardBounds.width }}
        />
      )}

      {pendingLostDrop && (
        <LostReasonModal
          dealCount={pendingLostDrop.deals.length}
          dealName={
            pendingLostDrop.deals.length === 1
              ? pendingLostDrop.deals[0].name
              : undefined
          }
          reason={lostReason}
          onReasonChange={setLostReason}
          onCancel={cancelLostDrop}
          onConfirm={confirmLostDrop}
        />
      )}

      <DealCardPanelHost
        panel={panel}
        onClose={() => setPanel(null)}
        onQuickActionSuccess={(message) => flash(message)}
      />

      {toast && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function LostReasonModal({
  dealCount,
  dealName,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  dealCount: number;
  dealName?: string;
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
            Mark {dealCount > 1 ? `${dealCount} deals` : "as lost"} as lost
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-900">
            {dealName ? dealName : `${dealCount} selected deals`}
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
            placeholder="Why were these deals lost?"
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
