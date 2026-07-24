"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, MoreVertical } from "lucide-react";
import { type KanbanColumn } from "@/lib/leads/types";
import { listLeadColumns, saveLeadColumns } from "@/lib/leads/store";
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
import { cn } from "@/lib/utils";

interface DragInfo {
  cardId: string;
  sourceColumnId: string;
}

interface LeadKanbanBoardProps {
  filters?: LeadFilters;
}

export function LeadKanbanBoard({ filters }: LeadKanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(() =>
    listLeadColumns(),
  );
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [panel, setPanel] = useState<LeadPanelState | null>(null);
  const [activityRevision, setActivityRevision] = useState(0);
  const [cardSettings, setCardSettings] = useState<LeadCardSettings>(() =>
    loadLeadCardSettings(),
  );

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
    if (!hasStatusFilter && !hasSourceFilter) return columns;

    return columns
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
  }, [columns, filters]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function handleDragStart(
    e: React.DragEvent<HTMLDivElement>,
    cardId: string,
    columnId: string,
  ) {
    setDragInfo({ cardId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragInfo(null);
    setOverColumnId(null);
  }

  function handleDrop(targetColumnId: string) {
    setOverColumnId(null);
    if (!dragInfo) return;
    const { cardId, sourceColumnId } = dragInfo;

    if (sourceColumnId === targetColumnId) {
      setDragInfo(null);
      return;
    }

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

    if (!isMortgagePipelineStage(targetColumn.title)) {
      flash(`Unknown pipeline stage "${targetColumn.title}"`);
      setDragInfo(null);
      return;
    }

    const updatedCard = applyPipelineStageMove(
      card,
      targetColumn.title,
      new Date(),
    );

    const next = columns.map((col) => {
      if (col.id === sourceColumnId) {
        return {
          ...col,
          cards: col.cards.filter((c) => c.id !== cardId),
          leadCount: col.leadCount - 1,
        };
      }
      if (col.id === targetColumnId) {
        return {
          ...col,
          cards: [updatedCard, ...col.cards],
          leadCount: col.leadCount + 1,
        };
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

    setDragInfo(null);
  }

  return (
    <div className="relative w-full overflow-x-auto bg-slate-50/50">
      <div className="grid min-w-[1800px] grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {visibleColumns.map((column) => {
          const isOver = overColumnId === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragInfo) setOverColumnId(column.id);
              }}
              onDragLeave={() =>
                setOverColumnId((prev) => (prev === column.id ? null : prev))
              }
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(column.id);
              }}
              className={cn(
                "flex flex-col rounded-sm border p-3",
                dropTargetIdle,
                isOver
                  ? dropTargetActive
                  : "border-slate-200/60 bg-slate-100/60",
              )}
            >
              <div className="mb-3 flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${column.dotColorClass}`}
                  />
                  <h2 className="max-w-[9.5rem] text-xs font-semibold leading-snug text-slate-800 xl:text-sm">
                    {column.title}
                  </h2>
                  <span className="rounded-full border border-slate-200/80 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {column.cards.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/sales/leads/create?stage=${encodeURIComponent(column.title)}`}
                    aria-label={`Add lead to ${column.title}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Link>
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
                {column.totalAmount} total
              </div>

              <div className="flex flex-col gap-3">
                {column.cards.map((card) => (
                  <LeadCard
                    key={card.id}
                    card={card}
                    status={column.leadStatus}
                    cardSettings={cardSettings}
                    revision={activityRevision}
                    isDragging={dragInfo?.cardId === card.id}
                    onDragStart={(e) => handleDragStart(e, card.id, column.id)}
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
                ))}

                {column.cards.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-8 text-center text-xs text-slate-400">
                    Drop a lead here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
