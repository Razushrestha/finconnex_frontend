"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  MoreVertical,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  PhoneCall,
  RefreshCw,
  Layers,
  Globe,
} from "lucide-react";
import {
  LEAD_COLUMNS,
  type ContactCardData,
  type KanbanColumn,
} from "@/lib/leads/types";
import type { LeadFilters } from "./FilterLeadsPanel";

interface ContactCardProps {
  card: ContactCardData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

function ContactCard({
  card,
  isDragging,
  onDragStart,
  onDragEnd,
}: ContactCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`w-full cursor-grab rounded-md border border-slate-200/80 bg-white p-4 shadow-2xs transition-all active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <div
        className={`mb-3.5 h-1.5 w-full rounded-full ${card.accentColorClass}`}
      />

      <div className="mb-3.5 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${card.avatarBgClass}`}
        >
          {card.initials}
        </div>
        <h3 className="text-sm font-semibold text-slate-800 truncate">
          {card.name}
        </h3>
      </div>

      {/* Details List */}
      <div className="space-y-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="font-medium text-slate-700">{card.amount}</span>
        </div>

        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{card.email}</span>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{card.phone}</span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{card.location}</span>
        </div>
      </div>

      <div className="my-3.5 border-t border-slate-100" />

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Status icon"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-blue-600 shadow-2xs hover:bg-slate-100 transition-colors"
        >
          <Globe className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Call"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <PhoneCall className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            aria-label="Refresh / Sync"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            aria-label="Layers / Options"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface DragInfo {
  cardId: string;
  sourceColumnId: string;
}

interface LeadKanbanBoardProps {
  /** When omitted (or both arrays empty), every column/card is shown. */
  filters?: LeadFilters;
}

export function LeadKanbanBoard({ filters }: LeadKanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(LEAD_COLUMNS);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  // Filtering only changes what's rendered — the underlying `columns` state
  // (and therefore card positions) is untouched, so toggling a filter off
  // doesn't lose any drag-and-drop moves made while it was on.
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
      const card = sourceColumn?.cards.find((c) => c.id === cardId);
      if (!card) return prev;

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
            cards: [card, ...col.cards],
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
                  <ContactCard
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
