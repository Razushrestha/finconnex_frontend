"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: "top" | "bottom" | "auto";
  disabled?: boolean;
  fullWidth?: boolean;
};

export function Tooltip({
  content,
  children,
  placement = "auto",
  disabled,
  fullWidth,
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<{
    left: number;
    top: number;
    placement: "top" | "bottom";
  } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function handleMouseEnter() {
    if (disabled) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    let resolved: "top" | "bottom" =
      placement === "auto" ? "bottom" : placement;
    if (placement === "auto") {
      const spaceBelow = window.innerHeight - rect.bottom;
      resolved = spaceBelow < 60 ? "top" : "bottom";
    }

    setCoords({
      left: rect.left,
      top: resolved === "bottom" ? rect.bottom + 8 : rect.top - 8,
      placement: resolved,
    });
    setShow(true);
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative min-w-0 ${fullWidth ? "block w-full" : "inline-flex"}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show &&
        !disabled &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100]"
            style={{
              left: coords.left,
              top: coords.top,
              transform:
                coords.placement === "top" ? "translateY(-100%)" : "none",
            }}
          >
            <div className="whitespace-nowrap rounded-lg border border-violet-500/30 bg-slate-900 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-lg shadow-slate-900/20 dark:border-violet-500/40 dark:bg-zinc-800">
              {content}
            </div>
            <div
              className={`absolute left-3 h-2.5 w-2.5 rotate-45 border-violet-500/30 bg-slate-900 dark:border-violet-500/40 dark:bg-zinc-800 ${
                coords.placement === "bottom"
                  ? "-top-[5px] border-l border-t"
                  : "-bottom-[5px] border-r border-b"
              }`}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
