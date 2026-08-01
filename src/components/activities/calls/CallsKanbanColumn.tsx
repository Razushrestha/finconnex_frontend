"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CallColumn } from "@/lib/calls/types";
import { CallCard } from "./CallCard";
import { cn } from "@/lib/utils";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";

interface CallsKanbanColumnProps {
  column: CallColumn;
  draggingCallId: string | null;
  onDragStartCall: (
    e: React.DragEvent<HTMLDivElement>,
    callId: string,
    columnId: string,
  ) => void;
  onDragEndCall: () => void;
  onDropCall: (targetColumnId: string) => void;
}

export function CallsKanbanColumn({
  column,
  draggingCallId,
  onDragStartCall,
  onDragEndCall,
  onDropCall,
}: CallsKanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="flex h-full w-10 shrink-0 flex-col rounded-sm">
        <div
          className={cn(
            "flex h-full flex-col items-center gap-3 rounded-sm p-2 shadow-sm",
            column.badgeColorClass,
          )}
        >
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="shrink-0 rounded-sm hover:opacity-70"
            title="Expand"
            aria-expanded={false}
            aria-label={`Expand ${column.title}`}
          >
            <ChevronRight className="h-4 w-4 text-slate-700" />
          </button>

          <span className="inline-flex shrink-0 items-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
            {column.count}
          </span>

          <span className="mt-1 flex-1 [writing-mode:vertical-rl] text-sm font-semibold text-slate-900">
            {column.title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-72 shrink-0 flex-col">
      {/* Separate Header Box */}
      <div
        className={cn(
          "mb-3 shrink-0 rounded-sm p-2 shadow-sm",
          column.badgeColorClass,
        )}
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
          <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
            {column.count}
          </span>
        </div>
      </div>

      {/* Call List / Drop Zone Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          onDropCall(column.id);
        }}
        className={cn(
          "flex flex-1 flex-col rounded-sm border border-transparent p-2",
          dropTargetIdle,
          isOver ? dropTargetActive : "bg-slate-200/70",
        )}
      >
        <div className="flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          {column.calls.map((call) => (
            <CallCard
              key={call.id}
              call={call}
              columnId={column.id}
              isDragging={draggingCallId === call.id}
              onDragStart={(e) => onDragStartCall(e, call.id, column.id)}
              onDragEnd={onDragEndCall}
            />
          ))}

          {column.calls.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-8 text-center text-xs text-slate-400">
              Drop a call here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
