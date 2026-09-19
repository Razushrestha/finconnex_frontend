"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LEAD_COLUMNS,
  type KanbanColumn,
  type LeadPipelineStage,
} from "@/lib/leads/types";
import { listLeadColumns, saveLeadColumns } from "@/lib/leads/store";
import { isUuid } from "@/lib/activity-timeline/auth";
import { pipelineStageToCrmStatus } from "@/lib/leads/api/map";
import { syncLeadStatus } from "@/lib/leads/api";
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
} from "@/lib/pipeline-sla/board";
import { onPipelineSlaChange } from "@/lib/pipeline-sla/settings";
import { logStatusChange, notifyStatusChanged } from "@/lib/rules";
import type { LeadFilters } from "./FilterLeadsPanel";
import { leadMatchesFilters } from "@/lib/filters/records";
import { sortLeadCards } from "@/lib/leads/sort";
import { LeadCard } from "./LeadCard";
import {
  LeadCardPanelHost,
  type LeadPanelState,
} from "./panels/LeadCardPanelHost";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { KanbanOutcomeDropBar } from "@/components/common/KanbanOutcomeDropBar";
import { KanbanDragGhost } from "@/components/common/KanbanDragGhost";
import {
  KANBAN_CARD_SLOT_ATTR,
  KANBAN_DROP_COLUMN_ATTR,
  usePointerKanbanDrag,
  type PointerKanbanDrop,
  type PointerKanbanOutcomeDrop,
} from "@/lib/kanban/use-pointer-kanban-drag";
import { cn } from "@/lib/utils";
import {
  KANBAN_BOARD_ROW,
  KANBAN_COL,
  KANBAN_COL_COLLAPSED,
  KANBAN_DROP_GHOST,
  KANBAN_HEADER_COUNT,
  KANBAN_HEADER_TITLE,
  KANBAN_WELL,
} from "@/lib/layout";
import { useRouter } from "next/navigation";
import {
  kanbanHeaderSurfaceStyle,
  resolveKanbanHeaderColor,
} from "@/components/common/KanbanViewControls";
import { notify } from "@/lib/notify/toast";

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
  /** Header Sort By value: newest | oldest | name_asc | name_desc */
  sortValue?: string;
  visibleColumnIds?: string[];
  /** Optional display title overrides keyed by column id. */
  columnTitles?: Record<string, string>;
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
  sortValue,
  visibleColumnIds,
  columnTitles,
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
    LEAD_COLUMNS.map((col) => ({ ...col, cards: [] })),
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
    setColumns(listLeadColumns());
    return onRulesChange(() => {
      setColumns(listLeadColumns());
    });
  }, []);

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
        cards: sortLeadCards(
          col.cards.filter((card) =>
            leadMatchesFilters(
              {
                ...card,
                statusTitle: col.leadStatus,
                stageTitle: col.title,
              },
              filters,
            ),
          ),
          sortValue,
        ),
      }));
  }, [columns, filters, visibleColumnIds, sortValue]);

  const wonColumn = useMemo(
    () => columns.find((c) => /closed won|settled/i.test(c.title)),
    [columns],
  );
  const lostColumn = useMemo(
    () => columns.find((c) => /lost/i.test(c.title)),
    [columns],
  );

  function flash(msg: string) {
    notify(msg);
  }

  function toggleCollapsed(columnId: string) {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
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

    if (isUuid(card.id)) {
      const fromStatus = pipelineStageToCrmStatus(sourceColumn.title);
      const toStatus = pipelineStageToCrmStatus(targetColumn.title);
      if (fromStatus !== toStatus) {
        void syncLeadStatus(card.id, targetColumn.title).then((live) => {
          if (!live) flash("Could not save status on the server");
        });
      }
    }

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

  function handleDrop({
    itemId,
    sourceColumnId,
    targetColumnId,
    targetIndex,
  }: PointerKanbanDrop) {
    const sourceColumn = columns.find((col) => col.id === sourceColumnId);
    const targetColumn = columns.find((col) => col.id === targetColumnId);
    const card = sourceColumn?.cards.find((c) => c.id === itemId);
    if (!card || !sourceColumn || !targetColumn) return;

    const gate = assertPipelineStageChange(
      sourceColumn.title,
      targetColumn.title,
    );
    if (!gate.ok) {
      flash(gate.message);
      return;
    }

    const updatedCard = applyPipelineStageMove(
      card,
      targetColumn.title,
      new Date(),
    );
    moveCard(card, sourceColumn, targetColumn, updatedCard, targetIndex);
  }

  function handleOutcomeDrop({
    itemId,
    sourceColumnId,
    outcome,
  }: PointerKanbanOutcomeDrop) {
    const targetColumn = outcome === "won" ? wonColumn : lostColumn;
    if (!targetColumn) {
      flash(`No "${outcome === "won" ? "Won" : "Lost"}" column found`);
      return;
    }

    const sourceColumn = columns.find((col) => col.id === sourceColumnId);
    const card = sourceColumn?.cards.find((c) => c.id === itemId);
    if (!card || !sourceColumn || sourceColumn.id === targetColumn.id) return;

    if (outcome === "lost") {
      setPendingLostDrop({
        card,
        sourceColumnId: sourceColumn.id,
        targetColumnId: targetColumn.id,
        targetColumnTitle: targetColumn.title,
      });
      setLostReason("");
      return;
    }

    const updatedCard = applyPipelineStageMove(
      card,
      targetColumn.title,
      new Date(),
    );
    moveCard(card, sourceColumn, targetColumn, updatedCard);
    flash(`${card.name} marked as settled`);
  }

  const drag = usePointerKanbanDrag({
    onDrop: handleDrop,
    onOutcomeDrop: handleOutcomeDrop,
  });

  useEffect(() => {
    if (!drag.isDragging || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    setBoardBounds({ left: rect.left, width: rect.width });
  }, [drag.isDragging]);

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
      <div className={KANBAN_BOARD_ROW}>
        {visibleColumns.map((column) => {
          const isOver = drag.overColumnId === column.id;
          const isCollapsed = collapsedColumns.has(column.id);

          return (
            <div
              key={column.id}
              {...{ [KANBAN_DROP_COLUMN_ATTR]: column.id }}
              className={cn(
                "group/stage relative flex h-full min-h-0 flex-col gap-2 transition-all duration-200",
                BOARD_HEIGHT,
                isCollapsed ? KANBAN_COL_COLLAPSED : KANBAN_COL,
              )}
            >
              {isCollapsed ? (
                <KanbanCollapsedRail
                  title={columnTitles?.[column.id] ?? column.title}
                  count={column.cards.length}
                  onExpand={() => toggleCollapsed(column.id)}
                  extra={
                    <span className="text-[10px] font-medium text-slate-500 [writing-mode:vertical-rl]">
                      {column.totalAmount}
                    </span>
                  }
                />
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
                    const title = columnTitles?.[column.id] ?? column.title;
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
                            <h2 className={KANBAN_HEADER_TITLE} title={title}>
                              {title}
                            </h2>
                            <span className={KANBAN_HEADER_COUNT}>
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

                  <KanbanStageScroll
                    footer={
                      <KanbanColumnFooter
                        createLabel="Create lead"
                        createAriaLabel={`Create lead in ${columnTitles?.[column.id] ?? column.title}`}
                        onCreate={() =>
                          onAddLead
                            ? onAddLead(column.id)
                            : router.push(
                                `/sales/leads/create?stage=${encodeURIComponent(column.title)}`,
                              )
                        }
                        onCollapse={() => toggleCollapsed(column.id)}
                        collapseLabel={`Collapse ${columnTitles?.[column.id] ?? column.title}`}
                        inert={drag.isDragging}
                      />
                    }
                  >
                  <div
                    className={cn(
                      "relative flex min-h-full flex-col rounded-sm border p-1",
                      dropTargetIdle,
                      isOver ? dropTargetActive : KANBAN_WELL,
                    )}
                  >
                    <div className="flex min-h-[180px] flex-1 flex-col gap-3 pb-2">
                      {(() => {
                        let visibleIndex = 0;
                        const rendered: React.ReactNode[] = [];

                        const showPlaceholderAt = (idx: number) =>
                          drag.dragInfo &&
                          drag.dropTargetPos?.columnId === column.id &&
                          drag.dropTargetPos.targetIndex === idx;

                        column.cards.forEach((card) => {
                          const isDraggedCard = drag.isDraggingItem(card.id);
                          const myIndex = visibleIndex;

                          if (!isDraggedCard && showPlaceholderAt(myIndex)) {
                            rendered.push(
                              <div
                                key={`placeholder-${card.id}`}
                                className={KANBAN_DROP_GHOST}
                              />,
                            );
                          }

                          const pointer = drag.cardPointerProps({
                            id: card.id,
                            columnId: column.id,
                            name: card.name,
                          });

                          rendered.push(
                            <div
                              key={card.id}
                              {...{ [KANBAN_CARD_SLOT_ATTR]: card.id }}
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
                                onDragPointerDown={pointer.onPointerDown}
                                onDragClickCapture={pointer.onClickCapture}
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
                              className={KANBAN_DROP_GHOST}
                            />,
                          );
                        }

                        return (
                          <>
                            {rendered}
                            {column.cards.length === 0 ? (
                              <KanbanEmptyStage entity="Leads" />
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
      </div>

      <KanbanDragGhost ghost={drag.ghost} />

      {drag.isDragging && boardBounds && (
        <KanbanOutcomeDropBar
          over={drag.overOutcome}
          onOver={() => undefined}
          onLeave={() => undefined}
          onDrop={() => undefined}
          style={{ left: boardBounds.left, width: boardBounds.width }}
        />
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
