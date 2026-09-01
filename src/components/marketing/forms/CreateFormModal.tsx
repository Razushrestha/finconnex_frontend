"use client";

import { Plus, Sparkles, LayoutTemplate, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
    description: "Generate forms instantly with Zia AI.",
  },
  {
    id: "templates",
    icon: LayoutTemplate,
    iconWrapClass: "bg-cyan-50 text-cyan-500 border border-cyan-100",
    title: "Form Templates",
    description: "Choose from over 100+ pre-built forms.",
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
    return;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-5xl sm:min-h-[480px] flex flex-col justify-between p-8 sm:p-10">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Choose how to create your form
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-3 h-full items-stretch">
          {FORM_OPTIONS.map(
            ({ id, icon: Icon, iconWrapClass, title, description }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card p-5 text-center",
                  "transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:bg-accent/20",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span
                  className={cn(
                    "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm",
                    iconWrapClass,
                  )}
                >
                  <Icon className="h-8 w-8" />
                </span>
                <span className="mb-2 text-base font-bold text-foreground">
                  {title}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </span>
              </button>
            ),
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
