"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type RecordDetailField = {
  label: string;
  value: string;
};

interface RecordDetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields: RecordDetailField[];
  body?: string;
}

/** Lightweight read-only detail dialog for Activity deep-links. */
export function RecordDetailModal({
  open,
  onClose,
  title,
  subtitle,
  fields,
  body,
}: RecordDetailModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-t border-slate-100" />
        <dl className="space-y-2.5 px-5 py-4 text-[12px]">
          {fields.map((f) => (
            <div key={f.label} className="grid grid-cols-[7rem_1fr] gap-2">
              <dt className="font-medium text-slate-400">{f.label}</dt>
              <dd className="text-slate-800">{f.value || "—"}</dd>
            </div>
          ))}
        </dl>
        {body ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              Body
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] text-slate-700">
              {body}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
