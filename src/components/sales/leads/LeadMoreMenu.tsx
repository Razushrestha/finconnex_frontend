"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Clock,
  Copy,
  Download,
  MoreHorizontal,
  Printer,
  Share2,
  Trash2,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LeadMoreAction =
  | "clone"
  | "share"
  | "print"
  | "export"
  | "meet-now"
  | "delete"
  | "archive"
  | "history";

const ITEMS: {
  id: LeadMoreAction;
  label: string;
  icon: typeof Copy;
  danger?: boolean;
}[] = [
  { id: "clone", label: "Clone Lead", icon: Copy },
  { id: "share", label: "Share Lead", icon: Share2 },
  { id: "print", label: "Print", icon: Printer },
  { id: "export", label: "Export", icon: Download },
  { id: "meet-now", label: "Meet Now", icon: Video },
  { id: "delete", label: "Delete Lead", icon: Trash2, danger: true },
  { id: "archive", label: "Archive Lead", icon: Archive },
  { id: "history", label: "View Change History", icon: Clock },
];

export function LeadMoreMenu({
  onAction,
}: {
  onAction: (action: LeadMoreAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
      >
        <MoreHorizontal className="h-4 w-4" />
        More
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-40 mt-1 w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onAction(item.id);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-slate-50",
                  item.danger ? "text-rose-600" : "text-slate-700",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
