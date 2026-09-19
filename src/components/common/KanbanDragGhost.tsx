"use client";

import { createPortal } from "react-dom";
import type { KanbanDragGhost as Ghost } from "@/lib/kanban/use-pointer-kanban-drag";

export function KanbanDragGhost({ ghost }: { ghost: Ghost | null }) {
  if (!ghost || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-[80] rounded-md border border-slate-200 bg-white p-3.5 shadow-xl"
      style={{
        left: ghost.x,
        top: ghost.y,
        width: ghost.width,
        minHeight: 56,
      }}
    >
      <p className="truncate text-[13px] font-semibold text-foreground">
        {ghost.name}
      </p>
      <p className="mt-1 text-[11px] text-slate-500">Drop on a column to move</p>
    </div>,
    document.body,
  );
}
