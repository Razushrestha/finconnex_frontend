"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { NoteColumn } from "@/lib/notes/types";
import { NoteCard } from "./NoteCard";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import {
  KANBAN_COL,
  KANBAN_DROP_GHOST,
  KANBAN_HEADER,
  KANBAN_HEADER_COUNT,
  KANBAN_WELL,
} from "@/lib/layout";

interface NotesKanbanColumnProps {
  column: NoteColumn;
  draggingNoteId: string | null;
  onCardPointerDown: (
    e: React.PointerEvent<HTMLElement>,
    item: { id: string; columnId: string; name: string },
  ) => void;
  onDragClickCapture?: (e: React.MouseEvent) => void;
  embedded?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (noteId: string) => void;
  displayTitle?: string;
}

export function NotesKanbanColumn({
  column,
  draggingNoteId,
  onCardPointerDown,
  onDragClickCapture,
  embedded = false,
  selectedIds = [],
  onToggleSelect,
  displayTitle,
}: NotesKanbanColumnProps) {
  const heading = displayTitle ?? column.title;
  const router = useRouter();
  const [isOver, setIsOver] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <KanbanCollapsedRail
        title={heading}
        count={column.notes.length}
        onExpand={() => setIsCollapsed(false)}
      />
    );
  }

  return (
    <div
      data-kanban-drop-column={column.id}
      className={cn("group/stage flex h-full min-h-0 flex-col", KANBAN_COL)}
    >
      <div className={cn("mb-2 shrink-0", KANBAN_HEADER)}>
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            title="Collapse"
            className="flex items-center gap-1.5 rounded-sm hover:opacity-70"
            aria-expanded
            aria-label={`Collapse ${heading}`}
          >
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              {heading}
            </h3>
          </button>
          <span className={KANBAN_HEADER_COUNT}>{column.notes.length}</span>
        </div>
      </div>

      <KanbanStageScroll
        footer={
          <KanbanColumnFooter
            createLabel="Create note"
            onCreate={() => router.push("/activities/notes/create")}
            onCollapse={() => setIsCollapsed(true)}
            collapseLabel={`Collapse ${heading}`}
          />
        }
      >
      <div
        className={cn(
          "flex min-h-full flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          draggingNoteId ? dropTargetActive : KANBAN_WELL,
        )}
      >
        <div className="flex min-h-[180px] flex-1 flex-col space-y-3 pb-4">
          {isOver && draggingNoteId ? (
            <div className={KANBAN_DROP_GHOST} />
          ) : null}
          {column.notes.map((note) => (
            <div key={note.id} data-kanban-card-slot={note.id}>
              <NoteCard
                note={note}
                columnId={column.id}
                isDragging={draggingNoteId === note.id}
                onDragPointerDown={(e) =>
                  onCardPointerDown(e, {
                    id: note.id,
                    columnId: column.id,
                    name: note.title || "Note",
                  })
                }
                onDragClickCapture={onDragClickCapture}
                isSelected={selectedIds.includes(note.id)}
                onSelect={
                  onToggleSelect ? () => onToggleSelect(note.id) : undefined
                }
              />
            </div>
          ))}

          {column.notes.length === 0 ? (
            <KanbanEmptyStage entity="Notes" />
          ) : null}
        </div>
      </div>
      </KanbanStageScroll>
    </div>
  );
}
