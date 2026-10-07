"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

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
