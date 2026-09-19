"use client";

import type { ElementType, ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function FinanceCreateDialog({
  open,
  onOpenChange,
  title,
  icon: Icon,
  saving,
  saveLabel,
  onSave,
  children,
  wide = true,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  icon: ElementType;
  saving?: boolean;
  saveLabel: string;
  onSave: (createAnother: boolean) => void | Promise<void>;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[min(92vh,900px)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0",
          wide ? "sm:max-w-5xl" : "sm:max-w-3xl",
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70">
          <div className="grid grid-cols-1 content-start gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2">
            {children}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            disabled={saving}
            className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave(true)}
            disabled={saving}
            className="h-8 rounded-md border border-violet-200 bg-violet-50 px-3 text-[12px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
          >
            Save &amp; New
          </button>
          <button
            type="button"
            onClick={() => void onSave(false)}
            disabled={saving}
            className="inline-flex h-8 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-md bg-violet-600 px-4 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-90"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              saveLabel
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
