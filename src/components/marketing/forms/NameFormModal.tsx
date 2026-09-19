"use client";

import { useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  InputShell,
  elevatedInputClass,
} from "@/components/sales/CreateEntityForm";

interface NameFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
}

export function NameFormModal({
  open,
  onOpenChange,
  onConfirm,
}: NameFormModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName("");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Form name is required");
      return;
    }
    onConfirm(trimmed);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="flex w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogTitle className="sr-only">Name your form</DialogTitle>
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
            <ClipboardList className="h-4 w-4" />
          </div>
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-slate-900">
            Name your form
          </h2>
          <button
            type="button"
            onClick={() => handleClose(false)}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="bg-slate-50/70 px-5 py-4">
          <Field label="Form name" required error={error ?? undefined}>
            <InputShell error={!!error}>
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                placeholder="e.g. Newsletter Signup"
                className={cn(elevatedInputClass())}
              />
            </InputShell>
          </Field>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex h-8 items-center justify-center rounded-md bg-violet-600 px-4 text-[12px] font-semibold text-white hover:bg-violet-700"
          >
            Create Form
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
