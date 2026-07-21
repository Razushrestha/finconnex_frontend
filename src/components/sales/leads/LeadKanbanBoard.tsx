"use client";

import { useMemo, useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import { LEAD_COLUMNS, type KanbanColumn } from "@/lib/leads/types";
import type { LeadFilters } from "./FilterLeadsPanel";
import { LeadCard } from "./LeadCard";

interface DragInfo {
  cardId: string;
  sourceColumnId: string;
}

interface LeadKanbanBoardProps {
  filters?: LeadFilters;
}

export function LeadKanbanBoard({ filters }: LeadKanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(LEAD_COLUMNS);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const visibleColumns = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    const hasSourceFilter = !!filters?.sources.length;
    if (!hasStatusFilter && !hasSourceFilter) return columns;

    return columns
      .filter(
        (col) => !hasStatusFilter || filters!.statuses.includes(col.title),
      )
      .map((col) => ({
        ...col,
        cards: hasSourceFilter
          ? col.cards.filter((card) => filters!.sources.includes(card.source))
          : col.cards,
      }));
  }, [columns, filters]);

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

    setColumns((prev) => {
      const sourceColumn = prev.find((col) => col.id === sourceColumnId);
      const targetColumn = prev.find((col) => col.id === targetColumnId);
      const card = sourceColumn?.cards.find((c) => c.id === cardId);

      if (!card || !targetColumn) return prev;

      const updatedCard = {
        ...card,
        accentColorClass: targetColumn.dotColorClass,
      };

      return prev.map((col) => {
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
    });

    setDragInfo(null);
  }

  return (
    <div className="w-full overflow-x-auto bg-slate-50/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[1100px] items-start">
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
              className={`flex flex-col rounded-sm border p-3 transition-colors ${
                isOver
                  ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-slate-200/60 bg-slate-100/60"
              }`}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${column.dotColorClass}`}
                  />
                  <h2 className="text-sm font-semibold text-slate-800">
                    {column.title}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 border border-slate-200/80">
                    {column.cards.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Add lead"
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

              {/* Column Subtitle / Metrics */}
              <div className="mb-3 px-1 text-xs text-slate-500 font-medium">
                {column.totalAmount} total
              </div>

              {/* Cards Stack */}
              <div className="flex flex-col gap-3">
                {column.cards.map((card) => (
                  <LeadCard
                    key={card.id}
                    card={card}
                    isDragging={dragInfo?.cardId === card.id}
                    onDragStart={(e) => handleDragStart(e, card.id, column.id)}
                    onDragEnd={handleDragEnd}
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

        {visibleColumns.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white/60 py-12 text-center text-sm text-slate-400">
            No leads match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
