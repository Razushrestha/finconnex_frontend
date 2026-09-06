"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export function SlideOverPanel({
  title,
  subtitle,
  onClose,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      {/* Stops above the persistent BottomBar (BOTTOM_BAR_H = h-10) so its
          Quick Add / softphone / voice controls stay reachable while a
          workflow-builder panel is open, instead of being covered by it. */}
      <div className="fixed inset-x-0 top-0 bottom-10 z-40 bg-slate-900/10" onClick={onClose} aria-hidden />
      <aside
        className={cn(
          "fixed right-0 top-0 bottom-10 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl",
          className
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-4">
          <div>
            <h2 className="font-heading text-base font-semibold text-slate-800">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="border-t border-slate-100 p-4">{footer}</div>}
      </aside>
    </>
  );
}
