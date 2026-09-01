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
  onDragStartNote: (
    e: React.DragEvent<HTMLDivElement>,
    noteId: string,
    columnId: string,
  ) => void;
  onDragEndNote: () => void;
  onDropNote: (targetColumnId: string) => void;
  embedded?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (noteId: string) => void;
}

export function NotesKanbanColumn({
  column,
  draggingNoteId,
  onDragStartNote,
  onDragEndNote,
  onDropNote,
  embedded = false,
  selectedIds = [],
  onToggleSelect,
}: NotesKanbanColumnProps) {
  const router = useRouter();
  const [isOver, setIsOver] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <KanbanCollapsedRail
        title={column.title}
        count={column.notes.length}
        onExpand={() => setIsCollapsed(false)}
      />
    );
  }

  return (
    <div className={cn("group/stage flex h-full min-h-0 flex-col", KANBAN_COL)}>
      <div className={cn("mb-2 shrink-0", KANBAN_HEADER)}>
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            title="Collapse"
            className="flex items-center gap-1.5 rounded-sm hover:opacity-70"
            aria-expanded
            aria-label={`Collapse ${column.title}`}
          >
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              {column.title}
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
            collapseLabel={`Collapse ${column.title}`}
          />
        }
      >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          onDropNote(column.id);
        }}
        className={cn(
          "flex min-h-full flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          isOver ? dropTargetActive : KANBAN_WELL,
        )}
      >
        <div className="flex min-h-[180px] flex-1 flex-col space-y-3 pb-4">
          {isOver && draggingNoteId ? (
            <div className={KANBAN_DROP_GHOST} />
          ) : null}
          {column.notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              columnId={column.id}
              isDragging={draggingNoteId === note.id}
              onDragStart={(e) => onDragStartNote(e, note.id, column.id)}
              onDragEnd={onDragEndNote}
              isSelected={selectedIds.includes(note.id)}
              onSelect={
                onToggleSelect ? () => onToggleSelect(note.id) : undefined
              }
            />
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
