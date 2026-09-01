"use client";

import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import type { DashboardWidgetId } from "@/lib/dashboard/layout";
import { cn } from "@/lib/utils";

export function DashboardWidgetSlot({
  id,
  span,
  editing,
  dragging,
  over,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: {
  id: DashboardWidgetId;
  span: string;
  editing: boolean;
  dragging: DashboardWidgetId | null;
  over: DashboardWidgetId | null;
  onDragStart: (id: DashboardWidgetId) => void;
  onDragOver: (id: DashboardWidgetId) => void;
  onDrop: (id: DashboardWidgetId) => void;
  onDragEnd: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative min-w-0",
        span,
        editing && "rounded-2xl",
        editing && dragging === id && "opacity-50",
        editing &&
          over === id &&
          dragging &&
          dragging !== id &&
          "ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-50",
      )}
      onDragOver={(e) => {
        if (!editing) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(id);
      }}
      onDrop={(e) => {
        if (!editing) return;
        e.preventDefault();
        onDrop(id);
      }}
    >
      {editing ? (
        <button
          type="button"
          draggable
          aria-label="Drag to move widget"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", id);
            onDragStart(id);
          }}
          onDragEnd={onDragEnd}
          className="absolute left-2 top-2 z-20 flex h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-600 shadow-sm active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      {children}
    </div>
  );
}
