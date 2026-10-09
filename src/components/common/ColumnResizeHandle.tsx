"use client";

import { useRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

/** Short 1px mark in a column header. The wide hit area stays invisible. */
export function HeaderColumnGrip({
  active,
  onMouseDown,
}: {
  active?: boolean;
  onMouseDown: (event: MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group/resize absolute top-1/2 right-0 z-10 flex h-5 w-3 -translate-y-1/2 cursor-col-resize touch-none items-center justify-center"
    >
      <span
        className={cn(
          "block h-3 w-px rounded-full bg-transparent group-hover/resize:bg-slate-400",
          active && "bg-[var(--brand-primary)]",
        )}
      />
    </div>
  );
}

export function ColumnResizeHandle({
  onDelta,
  onCommit,
  className,
  label = "Resize column",
}: {
  onDelta: (delta: number) => void;
  onCommit?: () => void;
  className?: string;
  label?: string;
}) {
  const startX = useRef(0);

  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={-1}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        startX.current = event.clientX;
        const handle = event.currentTarget;
        handle.setPointerCapture(event.pointerId);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        onDelta(event.clientX - startX.current);
        startX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        onCommit?.();
      }}
      className={cn(
        "absolute top-0 right-0 z-20 h-full w-2.5 cursor-col-resize touch-none border-0 bg-transparent p-0",
        "after:absolute after:top-0 after:right-[4px] after:h-full after:w-px after:bg-slate-300 after:content-['']",
        "hover:after:w-0.5 hover:after:bg-[#5A32A3] active:after:w-0.5 active:after:bg-[#5A32A3]",
        className,
      )}
    />
  );
}
