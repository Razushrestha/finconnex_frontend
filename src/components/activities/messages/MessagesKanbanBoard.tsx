"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { MESSAGE_STATUSES, type Message, type MessageStatus } from "@/lib/messages/types";
import { upsertMessage } from "@/lib/messages/store";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { cn } from "@/lib/utils";
import {
  KANBAN_BOARD_ROW,
  KANBAN_CARD,
  KANBAN_COL,
  KANBAN_HEADER,
  KANBAN_HEADER_COUNT,
  KANBAN_WELL,
} from "@/lib/layout";
import { cardMotion, dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { KanbanDragGhost } from "@/components/common/KanbanDragGhost";
import {
  usePointerKanbanDrag,
  type PointerKanbanDrop,
} from "@/lib/kanban/use-pointer-kanban-drag";

const COLUMN_IDS = MESSAGE_STATUSES.map((status) => ({
  id: status.toLowerCase().replace(/\s+/g, "-"),
  status,
}));

export const MESSAGE_STAGE_CATALOG = COLUMN_IDS.map((col) => ({
  id: col.id,
  label: col.status,
}));

export function MessagesKanbanBoard({
  rows,
  visibleColumnIds,
  columnTitles,
  onChange,
}: {
  rows: Message[];
  visibleColumnIds?: string[];
  columnTitles?: Record<string, string>;
  onChange?: () => void;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const columns = useMemo(() => {
    return COLUMN_IDS.filter(
      (col) => !visibleColumnIds?.length || visibleColumnIds.includes(col.id),
    ).map((col) => ({
      ...col,
      messages: rows.filter((row) => row.status === col.status),
    }));
  }, [rows, visibleColumnIds]);

  function handleDrop({ itemId, targetColumnId }: PointerKanbanDrop) {
    const status = columns.find((col) => col.id === targetColumnId)?.status;
    if (!status) return;
    const row = rows.find((item) => item.id === itemId);
    if (row && row.status !== status) {
      upsertMessage({ ...row, status });
      onChange?.();
    }
  }

  const drag = usePointerKanbanDrag({ onDrop: handleDrop });

  return (
    <div className={KANBAN_BOARD_ROW}>
      {columns.map((col) => {
        const heading = columnTitles?.[col.id] ?? col.status;
        if (collapsed.has(col.id)) {
          return (
            <KanbanCollapsedRail
              key={col.id}
              title={heading}
              count={col.messages.length}
              onExpand={() =>
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  next.delete(col.id);
                  return next;
                })
              }
            />
          );
        }
        return (
          <div
            key={col.id}
            data-kanban-drop-column={col.id}
            className={cn("group/stage flex h-full min-h-0 flex-col", KANBAN_COL)}
          >
            <div className={cn("mb-2 shrink-0", KANBAN_HEADER)}>
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => new Set(prev).add(col.id))
                  }
                  className="flex items-center gap-1.5 rounded-sm hover:opacity-70"
                >
                  <ChevronDown className="h-4 w-4 text-slate-700" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    {heading}
                  </h3>
                </button>
                <span className={KANBAN_HEADER_COUNT}>{col.messages.length}</span>
              </div>
            </div>
            <KanbanStageScroll
              footer={
                <KanbanColumnFooter
                  createLabel="Create message"
                  onCreate={() => router.push("/activities/messages/create")}
                  onCollapse={() =>
                    setCollapsed((prev) => new Set(prev).add(col.id))
                  }
                  collapseLabel={`Collapse ${heading}`}
                />
              }
            >
              <div
                className={cn(
                  "flex min-h-full flex-col rounded-sm p-2",
                  dropTargetIdle,
                  drag.overColumnId === col.id ? dropTargetActive : KANBAN_WELL,
                )}
              >
                {col.messages.length ? (
                  col.messages.map((row) => {
                    const pointer = drag.cardPointerProps({
                      id: row.id,
                      columnId: col.id,
                      name: row.subject || "(No subject)",
                    });
                    return (
                    <div
                      key={row.id}
                      data-kanban-card-slot={row.id}
                      role="link"
                      tabIndex={0}
                      onPointerDown={pointer.onPointerDown}
                      onClickCapture={pointer.onClickCapture}
                      onClick={() =>
                        router.push(`/activities/messages/detail/${row.id}`)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/activities/messages/detail/${row.id}`);
                        }
                      }}
                      className={cn(
                        KANBAN_CARD,
                        cardMotion,
                        "mb-2 cursor-grab text-left",
                        drag.isDraggingItem(row.id) && "opacity-50",
                      )}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {row.subject || "(No subject)"}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-slate-500">
                        {row.to}
                      </p>
                    </div>
                    );
                  })
                ) : (
                  <KanbanEmptyStage entity="messages" />
                )}
              </div>
            </KanbanStageScroll>
          </div>
        );
      })}
      <KanbanDragGhost ghost={drag.ghost} />
    </div>
  );
}
