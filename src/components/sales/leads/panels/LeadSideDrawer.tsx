"use client";

import { createPortal } from "react-dom";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

const noopSubscribe = () => () => {};
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared width so note / SMS / email / task / meeting / attachment drawers match. */
export const LEAD_QUICK_DRAWER_WIDTH = "max-w-[720px]";

/** Work Queue–style right drawer chrome for lead quick actions. */
export function LeadSideDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClassName = LEAD_QUICK_DRAWER_WIDTH,
  ariaLabel,
  hideHeader = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  widthClassName?: string;
  ariaLabel?: string;
  /** When true, only chrome + close button — caller supplies its own header. */
  hideHeader?: boolean;
}) {
  // True once in the browser (the portal needs document.body); false on
  // the server render.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.28)]",
          widthClassName,
        )}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 -left-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:text-slate-800"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>

        {!hideHeader ? (
          <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold text-slate-900">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 truncate text-[12.5px] text-slate-500">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </header>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
