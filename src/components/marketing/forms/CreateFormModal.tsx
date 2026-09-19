"use client";

import { Plus, Sparkles, LayoutTemplate, ClipboardList, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBlank: () => void;
  onSelectAi: () => void;
  onSelectTemplates: () => void;
}

const FORM_OPTIONS = [
  {
    id: "blank",
    icon: Plus,
    iconWrapClass: "bg-rose-50 text-rose-500 border border-rose-100",
    title: "Blank Form",
    description: "Create from scratch with an empty form.",
  },
  {
    id: "ai",
    icon: Sparkles,
    iconWrapClass: "bg-violet-50 text-violet-500 border border-violet-100",
    title: "AI Forms",
    description: "Generate forms instantly with AI.",
  },
  {
    id: "templates",
    icon: LayoutTemplate,
    iconWrapClass: "bg-cyan-50 text-cyan-500 border border-cyan-100",
    title: "Form Templates",
    description: "Choose from pre-built form layouts.",
  },
] as const;

export function CreateFormModal({
  open,
  onOpenChange,
  onSelectBlank,
  onSelectAi,
  onSelectTemplates,
}: CreateFormModalProps) {
  const handleSelect = (id: (typeof FORM_OPTIONS)[number]["id"]) => {
    if (id === "blank") return onSelectBlank();
    if (id === "ai") return onSelectAi();
    if (id === "templates") return onSelectTemplates();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(90vh,840px)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Create Form</DialogTitle>
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
            <ClipboardList className="h-4 w-4" />
          </div>
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-slate-900">
            Create Form
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-4">
          <p className="mb-4 text-center text-[13px] text-slate-500">
            Choose how to create your form
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FORM_OPTIONS.map(
              ({ id, icon: Icon, iconWrapClass, title, description }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelect(id)}
                  className={cn(
                    "flex flex-col items-center rounded-lg border border-slate-200 bg-white p-5 text-center",
                    "transition-colors hover:border-violet-300 hover:bg-violet-50/40",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  )}
                >
                  <span
                    className={cn(
                      "mb-3 flex h-12 w-12 items-center justify-center rounded-lg",
                      iconWrapClass,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mb-1 text-[13px] font-bold text-slate-900">
                    {title}
                  </span>
                  <span className="text-[11px] leading-relaxed text-slate-500">
                    {description}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
