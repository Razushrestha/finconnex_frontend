"use client";

import { useState } from "react";
import type { CallColumn } from "@/lib/calls/types";
import { CallCard } from "./CallCard";

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

  return (
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
      className={`flex h-full w-72 shrink-0 flex-col rounded-2xl p-3 transition-colors ${
        isOver ? "bg-indigo-50 ring-2 ring-indigo-300" : "bg-slate-100/70"
      }`}
    >
      {/* Header — fixed */}
      <div className="mb-3 shrink-0">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${column.badgeColorClass}`}
        >
          {column.title} ({column.count})
        </span>
      </div>

      {/* Scrollable call list */}
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
  );
}
