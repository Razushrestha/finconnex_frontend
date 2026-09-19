"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { EmailColumn } from "@/lib/emails/types";
import { EmailCard } from "./EmailCard";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { KANBAN_COL, KANBAN_DROP_GHOST, KANBAN_HEADER, KANBAN_HEADER_COUNT, KANBAN_WELL } from "@/lib/layout";
import { useRouter } from "next/navigation";
import type { DropTargetPos } from "./EmailsKanbanBoard";

interface EmailsKanbanColumnProps {
  column: EmailColumn;
  draggingEmailId: string | null;
  dropTargetPos: DropTargetPos | null;
  setDropTargetPos: React.Dispatch<React.SetStateAction<DropTargetPos | null>>;
  onCardPointerDown: (
    e: React.PointerEvent<HTMLElement>,
    item: { id: string; columnId: string; name: string },
  ) => void;
  onDragClickCapture?: (e: React.MouseEvent) => void;
}

export function EmailsKanbanColumn({
  column,
  draggingEmailId,
  dropTargetPos,
  setDropTargetPos,
  onCardPointerDown,
  onDragClickCapture,
}: EmailsKanbanColumnProps) {
  const router = useRouter();
  const [isOver, setIsOver] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  function handleDragOverContainer(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsOver(true);

    const container = e.currentTarget;
    const cardElements = Array.from(
      container.querySelectorAll<HTMLElement>("[data-email-card]"),
    );

    const mouseY = e.clientY;
    let targetIndex = column.emails.length;

    for (let i = 0; i < cardElements.length; i++) {
      const rect = cardElements[i].getBoundingClientRect();
      const cardMidpoint = rect.top + rect.height / 2;
      if (mouseY < cardMidpoint) {
        targetIndex = i;
        break;
      }
    }

    setDropTargetPos({ columnId: column.id, targetIndex });
  }

  if (isCollapsed) {
    return (
      <KanbanCollapsedRail
        title={column.title}
        count={column.count}
        onExpand={() => setIsCollapsed(false)}
      />
    );
  }

  return (
    <div
      data-kanban-drop-column={column.id}
      className={cn("group/stage flex h-full min-h-0 flex-col", KANBAN_COL)}
    >
      {/* Separate Header Box */}
      <div
        className={cn("mb-2 shrink-0", KANBAN_HEADER)}
      >
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            title="Collapse"
            className="flex items-center gap-1.5 rounded-sm hover:opacity-70"
            aria-expanded={true}
            aria-label={`Collapse ${column.title}`}
          >
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              {column.title}
            </h3>
          </button>
          <span className={KANBAN_HEADER_COUNT}>
            {column.count}
          </span>
        </div>
      </div>

      <KanbanStageScroll
        footer={
          <KanbanColumnFooter
            createLabel="Create email"
            onCreate={() => router.push("/activities/emails/create")}
            onCollapse={() => setIsCollapsed(true)}
            collapseLabel={`Collapse ${column.title}`}
          />
        }
      >
      <div
        onDragOver={handleDragOverContainer}
        onDragLeave={() => {
          setIsOver(false);
          if (dropTargetPos?.columnId === column.id) {
            setDropTargetPos(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
        }}
        className={cn(
          "flex min-h-full flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          isOver ? dropTargetActive : KANBAN_WELL,
        )}
      >
        <div className="flex min-h-[180px] flex-1 flex-col space-y-3 pb-4">
          {column.emails.map((email, index) => {
            const showPlaceholderBefore =
              dropTargetPos?.columnId === column.id &&
              dropTargetPos.targetIndex === index &&
              draggingEmailId !== email.id;

            const showPlaceholderAfter =
              dropTargetPos?.columnId === column.id &&
              dropTargetPos.targetIndex === column.emails.length &&
              index === column.emails.length - 1 &&
              draggingEmailId !== email.id;

            return (
              <div key={email.id} className="space-y-3">
                {showPlaceholderBefore && (
                  <div className={KANBAN_DROP_GHOST} />
                )}

                <div data-email-card data-kanban-card-slot={email.id}>
                  <EmailCard
                    email={email}
                    columnId={column.id}
                    isDragging={draggingEmailId === email.id}
                    onDragPointerDown={(e) =>
                      onCardPointerDown(e, {
                        id: email.id,
                        columnId: column.id,
                        name: email.subject,
                      })
                    }
                    onDragClickCapture={onDragClickCapture}
                  />
                </div>

                {showPlaceholderAfter && (
                  <div className={KANBAN_DROP_GHOST} />
                )}
              </div>
            );
          })}

          {column.emails.length === 0 ? (
            <KanbanEmptyStage entity="Emails" />
          ) : null}
        </div>
      </div>
      </KanbanStageScroll>
    </div>
  );
}
