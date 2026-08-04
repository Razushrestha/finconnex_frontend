"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  /** The clickable trigger — a button, usually built with dropdown state passed via render prop. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
}

/**
 * Positions a click-outside-to-close panel under a trigger. Used by both
 * StatusDropdown and FilterDropdown so the open/close behavior lives in one place.
 */
export function DropdownMenu({
  trigger,
  children,
  align = "left",
  panelClassName,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open ? (
        <div
          className={cn(
            "absolute z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg",
            align === "left" ? "left-0" : "right-0",
            panelClassName,
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownMenuItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between px-3.5 py-2 text-left text-sm font-medium hover:bg-slate-50",
        active ? "text-violet-700" : "text-slate-600",
      )}
    >
      <span className="flex items-center gap-2">
        {label}
        {count !== undefined ? (
          <span className="text-[12px] font-semibold text-slate-400">
            {count}
          </span>
        ) : null}
      </span>
      {active ? <Check className="h-3.5 w-3.5" /> : null}
    </button>
  );
}
