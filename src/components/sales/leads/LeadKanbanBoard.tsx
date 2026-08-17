"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Trophy, XCircle } from "lucide-react";
import { type KanbanColumn, type LeadPipelineStage } from "@/lib/leads/types";
import { listLeadColumns, saveLeadColumns } from "@/lib/leads/store";
import { onRulesChange } from "@/lib/rules";
import {
  emitLeadActivityChange,
  onLeadActivityChange,
} from "@/lib/leads/lead-extras-store";
import {
  loadLeadCardSettings,
  onLeadCardSettingsChange,
  type LeadCardSettings,
} from "@/lib/leads/lead-card-settings";
import type { QuickActionKind } from "@/lib/leads/panel-actions";
import {
  applyPipelineStageMove,
  assertPipelineStageChange,
  isMortgagePipelineStage,
} from "@/lib/pipeline-sla/board";
import { onPipelineSlaChange } from "@/lib/pipeline-sla/settings";
import { logStatusChange, notifyStatusChanged } from "@/lib/rules";
import type { LeadFilters } from "./FilterLeadsPanel";
import { LeadCard } from "./LeadCard";
import {
  LeadCardPanelHost,
  type LeadPanelState,
} from "./panels/LeadCardPanelHost";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { cn } from "@/lib/utils";
import {
  KANBAN_CARD_SLOT,
  KANBAN_COL,
  KANBAN_COL_COLLAPSED,
  KANBAN_HEADER_TITLE,
} from "@/lib/layout";
import { useRouter } from "next/navigation";
import {
  kanbanHeaderSurfaceStyle,
  resolveKanbanHeaderColor,
} from "@/components/common/KanbanViewControls";

interface DragInfo {
  cardId: string;
  sourceColumnId: string;
}

interface DropTargetPosition {
  columnId: string;
  targetIndex: number;
}

type LeadCardRecord = KanbanColumn["cards"][number];

/** A "mark as lost" drop that's waiting on a reason before it's committed. */
interface PendingLostDrop {
  card: LeadCardRecord;
  sourceColumnId: string;
  targetColumnId: string;
  targetColumnTitle: LeadPipelineStage;
}

interface LeadKanbanBoardProps {
  filters?: LeadFilters;
  visibleColumnIds?: string[];
  onAddLead?: (columnId: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  /** Kanban Select Fields → which fields render on each card. */
  cardFieldKeys?: readonly string[];
  showOwnerAvatar?: boolean;
  headerStyle?: string;
  singleHeaderColor?: string;
  multiHeaderColors?: Record<string, string>;
}

// Column height fills the board area so Create lead stays on-screen.
const BOARD_HEIGHT = "h-full";

export function LeadKanbanBoard({
  filters,
  visibleColumnIds,
  onAddLead,
  selectedIds,
  onToggleSelect,
  cardFieldKeys,
  showOwnerAvatar,
  headerStyle = "Multi Colour",
  singleHeaderColor,
  multiHeaderColors,
}: LeadKanbanBoardProps) {
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardBounds, setBoardBounds] = useState<{
    left: number;
    width: number;
  } | null>(null);

  const [columns, setColumns] = useState<KanbanColumn[]>(() =>
    listLeadColumns(),
  );
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPosition | null>(
    null,
  );
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [overOutcome, setOverOutcome] = useState<"settled" | "lost" | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [panel, setPanel] = useState<LeadPanelState | null>(null);
  const [activityRevision, setActivityRevision] = useState(0);
  const [cardSettings, setCardSettings] = useState<LeadCardSettings>(() =>
    loadLeadCardSettings(),
  );
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
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
    return onRulesChange(() => {
      setColumns(listLeadColumns());
    });
  }, []);

  // recompute right when a drag starts too, in case layout shifted (sidebar toggle, etc.)
  useEffect(() => {
    if (dragInfo && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setBoardBounds({ left: rect.left, width: rect.width });
    }
  }, [dragInfo]);

  useEffect(() => {
    return onLeadActivityChange(() => {
      setActivityRevision((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    return onLeadCardSettingsChange(() => {
      setCardSettings(loadLeadCardSettings());
      setActivityRevision((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    return onPipelineSlaChange(() => {
      setActivityRevision((n) => n + 1);
    });
  }, []);

  function persist(next: KanbanColumn[]) {
    saveLeadColumns(next);
    setColumns(next);
  }

  const visibleColumns = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    const hasSourceFilter = !!filters?.sources.length;
    const hasColumnFilter = !!visibleColumnIds;

    const result = hasColumnFilter
      ? visibleColumnIds!
          .map((id) => columns.find((col) => col.id === id))
          .filter((col): col is KanbanColumn => !!col)
      : columns;

    return result
      .filter(
        (col) =>
          !hasStatusFilter ||
          filters!.statuses.includes(col.title) ||
          filters!.statuses.includes(col.leadStatus),
      )
      .map((col) => ({
        ...col,
        cards: hasSourceFilter
          ? col.cards.filter((card) => filters!.sources.includes(card.source))
          : col.cards,
      }));
  }, [columns, filters, visibleColumnIds]);

  const wonColumn = useMemo(
    () => columns.find((c) => /settled/i.test(c.title)),
    [columns],
  );
  const lostColumn = useMemo(
    () => columns.find((c) => /lost/i.test(c.title)),
    [columns],
  );

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function toggleCollapsed(columnId: string) {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  }

  function handleDragStart(
    e: React.DragEvent<HTMLElement>,
    cardId: string,
    columnId: string,
  ) {
    setDragInfo({ cardId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragInfo(null);
    setOverColumnId(null);
    setOverOutcome(null);
  }

  /** Shared move: pulls the card out of the source column, drops it into the target. */
  function moveCard(
    card: LeadCardRecord,
    sourceColumn: KanbanColumn,
    targetColumn: KanbanColumn,
    updatedCard: LeadCardRecord,
    targetIndex?: number,
  ) {
    const next = columns.map((col) => {
      if (col.id === sourceColumn.id && col.id === targetColumn.id) {
        // Reordering within the same column: remove then re-insert at the new index.
        const filteredCards = col.cards.filter((c) => c.id !== card.id);
        const insertAt =
          targetIndex !== undefined ? targetIndex : filteredCards.length;
        const newCards = [...filteredCards];
        newCards.splice(insertAt, 0, updatedCard);
        return { ...col, cards: newCards, leadCount: newCards.length };
      }
      if (col.id === sourceColumn.id) {
        return {
          ...col,
          cards: col.cards.filter((c) => c.id !== card.id),
          leadCount: col.leadCount - 1,
        };
      }
      if (col.id === targetColumn.id) {
        const filteredCards = col.cards.filter((c) => c.id !== card.id);
        const insertAt =
          targetIndex !== undefined ? targetIndex : filteredCards.length;
        const newCards = [...filteredCards];
        newCards.splice(insertAt, 0, updatedCard);
        return { ...col, cards: newCards, leadCount: newCards.length };
      }
      return col;
    });
    persist(next);

    logStatusChange(
      "sales.leads",
      card.owner,
      card.id,
      card.name,
      sourceColumn.title,
      targetColumn.title,
    );
    emitLeadActivityChange();
    notifyStatusChanged({
      recipient: card.owner,
      entityLabel: `Lead ${card.name}`,
      from: sourceColumn.title,
      to: targetColumn.title,
      relatedTo: card.name,
      relatedHref: "/sales/leads",
    });
  }

  function handleDrop(targetColumnId: string, targetIndex?: number) {
    setOverColumnId(null);
    setDropTargetPos(null);
    if (!dragInfo) return;
    const { cardId, sourceColumnId } = dragInfo;

    const sourceColumn = columns.find((col) => col.id === sourceColumnId);
    const targetColumn = columns.find((col) => col.id === targetColumnId);
    const card = sourceColumn?.cards.find((c) => c.id === cardId);

    if (!card || !sourceColumn || !targetColumn) {
      setDragInfo(null);
      return;
    }

    const gate = assertPipelineStageChange(
      sourceColumn.title,
      targetColumn.title,
    );
    if (!gate.ok) {
      flash(gate.message);
      setDragInfo(null);
      return;
    }

    const updatedCard = applyPipelineStageMove(
      card,
      targetColumn.title,
      new Date(),
    );

    moveCard(card, sourceColumn, targetColumn, updatedCard, targetIndex);
    setDragInfo(null);
  }

  /** Drop onto the floating Win / Lost zone rather than a column. */
  function handleOutcomeDrop(outcome: "settled" | "lost") {
    setOverOutcome(null);
    if (!dragInfo) return;
    const { cardId, sourceColumnId } = dragInfo;

    const targetColumn = outcome === "settled" ? wonColumn : lostColumn;
    if (!targetColumn) {
      flash(`No "${outcome === "settled" ? "Won" : "Lost"}" column found`);
      setDragInfo(null);
      return;
    }

    const sourceColumn = columns.find((col) => col.id === sourceColumnId);
    const card = sourceColumn?.cards.find((c) => c.id === cardId);
    if (!card || !sourceColumn || sourceColumn.id === targetColumn.id) {
      setDragInfo(null);
      return;
    }

    if (outcome === "lost") {
      setPendingLostDrop({
        card,
        sourceColumnId: sourceColumn.id,
        targetColumnId: targetColumn.id,
        targetColumnTitle: targetColumn.title,
      });
      setLostReason("");
      setDragInfo(null);
      return;
    }

    const updatedCard = applyPipelineStageMove(
      card,
      targetColumn.title,
      new Date(),
    );
    moveCard(card, sourceColumn, targetColumn, updatedCard);
    setDragInfo(null);
    flash(`${card.name} marked as settled`);
  }

  function visibleCardCount(column: KanbanColumn) {
    if (dragInfo && dragInfo.sourceColumnId === column.id) {
      return column.cards.length - 1;
    }
    return column.cards.length;
  }

  function confirmLostDrop() {
    if (!pendingLostDrop) return;
    const { card, sourceColumnId, targetColumnId, targetColumnTitle } =
      pendingLostDrop;

    const sourceColumn = columns.find((col) => col.id === sourceColumnId);
    const targetColumn = columns.find((col) => col.id === targetColumnId);
    if (!sourceColumn || !targetColumn) {
      setPendingLostDrop(null);
      return;
    }

    const updatedCard: LeadCardRecord & { lostReason?: string } = {
      ...applyPipelineStageMove(card, targetColumnTitle, new Date()),
      lostReason: lostReason.trim() || undefined,
    };

    moveCard(card, sourceColumn, targetColumn, updatedCard);
    flash(`${card.name} marked as lost`);
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
      <div className="flex h-full items-stretch gap-3 p-1">
        {visibleColumns.map((column) => {
          const isOver = overColumnId === column.id;
          const isCollapsed = collapsedColumns.has(column.id);

          return (
            <div
              key={column.id}
              className={cn(
                "group relative flex h-full min-h-0 flex-col gap-2 transition-all duration-200",
                BOARD_HEIGHT,
                isCollapsed ? KANBAN_COL_COLLAPSED : KANBAN_COL,
              )}
            >
              {isCollapsed ? (
                <div
                  className={cn(
                    "flex h-full flex-col rounded-sm border p-2",
                    dropTargetIdle,
                    isOver ? dropTargetActive : "border-slate-200/60 bg-slate-100/60",
                  )}
                >
                  <CollapsedColumn
                    column={column}
                    onExpand={() => toggleCollapsed(column.id)}
                  />
                </div>
              ) : (
                <>
                  {/* Header box — driven by Kanban View → Header Style */}
                  {(() => {
                    const hex = resolveKanbanHeaderColor(
                      {
                        headerStyle,
                        singleHeaderColor,
                        multiHeaderColors,
                      },
                      column.id,
                    );
                    const surface = kanbanHeaderSurfaceStyle(hex);
                    return (
                      <div
                        className={cn(
                          "flex h-14 w-full shrink-0 flex-col justify-center overflow-hidden rounded-xs p-1.5",
                          surface.className,
                        )}
                        style={surface.style}
                      >
                        <div className="flex h-6 items-center justify-between gap-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <h2 className={KANBAN_HEADER_TITLE} title={column.title}>
                              {column.title}
                            </h2>
                            <span className="rounded-full border border-slate-200/80 bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
                              {column.cards.length}
                            </span>
                          </div>
                        </div>
                        <div className="truncate text-xs font-medium leading-5 text-foreground/70">
                          {column.totalAmount} total
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card list box — cards scroll; Create lead stays pinned */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragInfo) setOverColumnId(column.id);
                    }}
                    onDragLeave={() =>
                      setOverColumnId((prev) =>
                        prev === column.id ? null : prev,
                      )
                    }
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(column.id);
                    }}
                    className={cn(
                      "group relative flex min-h-0 flex-1 flex-col rounded-sm border p-1",
                      dropTargetIdle,
                      isOver ? dropTargetActive : "border-slate-200/60 bg-slate-100/60",
                    )}
                  >
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragInfo) {
                          setOverColumnId(column.id);
                          if (
                            !dropTargetPos ||
                            dropTargetPos.columnId !== column.id
                          ) {
                            setDropTargetPos({
                              columnId: column.id,
                              targetIndex: visibleCardCount(column),
                            });
                          }
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDrop(column.id, dropTargetPos?.targetIndex);
                      }}
                      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2 no-scrollbar"
                    >
                      {(() => {
                        let visibleIndex = 0;
                        const rendered: React.ReactNode[] = [];

                        const showPlaceholderAt = (idx: number) =>
                          dragInfo &&
                          dropTargetPos?.columnId === column.id &&
                          dropTargetPos.targetIndex === idx;

                        column.cards.forEach((card) => {
                          const isDraggedCard = dragInfo?.cardId === card.id;
                          const myIndex = visibleIndex;

                          if (!isDraggedCard && showPlaceholderAt(myIndex)) {
                            rendered.push(
                              <div
                                key={`placeholder-${card.id}`}
                                className={cn(KANBAN_CARD_SLOT, "shrink-0 rounded-md border-2 border-dashed border-violet-300 bg-violet-50/50 transition-all duration-150 ease-out")}
                              />,
                            );
                          }

                          rendered.push(
                            <div
                              key={card.id}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!dragInfo || isDraggedCard) return;

                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                const midpoint = rect.top + rect.height / 2;
                                const insertIndex =
                                  e.clientY < midpoint ? myIndex : myIndex + 1;

                                setDropTargetPos({
                                  columnId: column.id,
                                  targetIndex: insertIndex,
                                });
                              }}
                            >
                              <LeadCard
                                card={card}
                                status={column.leadStatus}
                                cardSettings={cardSettings}
                                dynamicFieldKeys={cardFieldKeys}
                                showOwnerAvatar={showOwnerAvatar}
                                revision={activityRevision}
                                isDragging={isDraggedCard}
                                isSelected={selectedIds.includes(card.id)}
                                onToggleSelect={onToggleSelect}
                                onDragStart={(e) =>
                                  handleDragStart(e, card.id, column.id)
                                }
                                onDragEnd={handleDragEnd}
                                onOpenActivitySummary={() =>
                                  setPanel({
                                    type: "activity-summary",
                                    leadId: card.id,
                                    leadName: card.name,
                                    status: column.leadStatus,
                                  })
                                }
                                onOpenLastActivity={() =>
                                  setPanel({
                                    type: "last-activity",
                                    leadId: card.id,
                                    leadName: card.name,
                                    status: column.leadStatus,
                                  })
                                }
                                onQuickAction={(kind: QuickActionKind) =>
                                  setPanel({
                                    type: "quick-action",
                                    kind,
                                    leadId: card.id,
                                    leadName: card.name,
                                    status: column.leadStatus,
                                    email: card.email,
                                    phone: card.phone,
                                  })
                                }
                              />
                            </div>,
                          );

                          if (!isDraggedCard) visibleIndex++;
                        });

                        if (showPlaceholderAt(visibleIndex)) {
                          rendered.push(
                            <div
                              key="placeholder-end"
                              className={cn(KANBAN_CARD_SLOT, "shrink-0 rounded-md border-2 border-dashed border-violet-300 bg-violet-50/50 transition-all duration-150 ease-out")}
                            />,
                          );
                        }

                        return (
                          <>
                            {rendered}
                            {column.cards.length === 0 && (
                              <div className="rounded-md border border-dashed border-slate-200 bg-background py-4 text-center text-xs text-slate-400">
                                No Lead found
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <KanbanColumnFooter
                      createLabel="Create lead"
                      createAriaLabel={`Create lead in ${column.title}`}
                      onCreate={() =>
                        onAddLead
                          ? onAddLead(column.id)
                          : router.push(
                              `/sales/leads/create?stage=${encodeURIComponent(column.title)}`,
                            )
                      }
                      onCollapse={() => toggleCollapsed(column.id)}
                      collapseLabel={`Collapse ${column.title}`}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Win / Lost drop zones — shown only while a card is being dragged */}
      {dragInfo && boardBounds && (
        <div
          className="pointer-events-none fixed bottom-6 z-50 flex justify-center px-6"
          style={{ left: boardBounds.left, width: boardBounds.width }}
        >
          <div className="flex w-full gap-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOverOutcome("settled");
              }}
              onDragLeave={() =>
                setOverOutcome((prev) => (prev === "settled" ? null : prev))
              }
              onDrop={(e) => {
                e.preventDefault();
                handleOutcomeDrop("settled");
              }}
              className={cn(
                "pointer-events-auto flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-sm font-semibold shadow-lg backdrop-blur-sm transition-colors",
                overOutcome === "settled"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-emerald-300 bg-white text-emerald-700",
              )}
            >
              <Trophy className="h-4 w-4" />
              Win
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
                "pointer-events-auto flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-sm font-semibold shadow-lg backdrop-blur-sm transition-colors",
                overOutcome === "lost"
                  ? "border-rose-500 bg-rose-50 text-rose-800"
                  : "border-rose-300 bg-white text-rose-700",
              )}
            >
              <XCircle className="h-4 w-4" />
              Lost
            </div>
          </div>
        </div>
      )}

      {pendingLostDrop && (
        <LostReasonModal
          cardName={pendingLostDrop.card.name}
          reason={lostReason}
          onReasonChange={setLostReason}
          onCancel={cancelLostDrop}
          onConfirm={confirmLostDrop}
        />
      )}

      <LeadCardPanelHost
        panel={panel}
        onClose={() => setPanel(null)}
        revision={activityRevision}
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

function CollapsedColumn({
  column,
  onExpand,
}: {
  column: KanbanColumn;
  onExpand: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-between py-2">
      <div className="flex flex-col items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${column.dotColorClass}`} />
        <span className="rounded-full border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
          {column.cards.length}
        </span>
      </div>
      <div className="flex flex-col items-center gap-3 flex-1 py-3">
        <p
          className="text-xs font-semibold text-foreground [writing-mode:vertical-rl]"
          title={column.title}
        >
          {column.title}
        </p>
        <div className="text-[10px] font-medium text-foreground/70 [writing-mode:vertical-rl]">
          {column.totalAmount} total
        </div>
      </div>
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Expand ${column.title}`}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LostReasonModal({
  cardName,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  cardName: string;
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
          <p className="mt-0.5 text-[13px] font-semibold text-foreground">
            {cardName}
          </p>
        </div>

        <div className="px-5 py-4">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Why was this lead lost?"
            className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] text-foreground outline-none placeholder:text-foreground/50 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-foreground/80 hover:bg-foreground/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reason.trim()}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mark as lost
          </button>
        </div>
      </div>
    </div>
  );
}
