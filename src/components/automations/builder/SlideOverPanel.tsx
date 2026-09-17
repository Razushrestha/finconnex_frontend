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
      {/* Fills the builder's canvas area, not the viewport: it starts below
          the workflow toolbar (name, Test Workflow, Save stay usable) and
          ends above the persistent BottomBar. The parent must be the
          `relative` canvas container. */}
      <div className="absolute inset-0 z-40 bg-slate-900/10" onClick={onClose} aria-hidden />
      <aside
        className={cn(
          "absolute inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl",
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
