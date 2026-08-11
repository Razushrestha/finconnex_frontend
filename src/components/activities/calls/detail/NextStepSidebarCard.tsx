"use client";

import { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NextStepItem {
  id: string;
  text: string;
  dueDate: string;
  isOverdue?: boolean;
  completed: boolean;
}

interface NextStepsSidebarProps {
  steps?: NextStepItem[];
  onToggleStep?: (id: string) => void;
  onAddStep?: (text: string, dueDate: string) => void;
}

export function NextStepsSidebarCard({
  steps = [],
  onToggleStep,
  onAddStep,
}: NextStepsSidebarProps) {
  const [showModal, setShowModal] = useState(false);
  const [stepText, setStepText] = useState("");
  const [stepDueDate, setStepDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepText.trim()) return;

    onAddStep?.(stepText.trim(), stepDueDate.trim() || "Due Soon");
    setStepText("");
    setStepDueDate("");
    setShowModal(false);
  };

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Next Steps
          </h4>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Add next step"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {steps.length > 0 ? (
            steps.map((step) => (
              <div key={step.id} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onToggleStep?.(step.id)}
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    step.completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-muted-foreground bg-background",
                  )}
                >
                  {step.completed && (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  )}
                </button>
                <div className="flex-1 text-xs">
                  <p
                    className={cn(
                      "font-medium leading-normal",
                      step.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground",
                    )}
                  >
                    {step.text}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[11px]",
                      step.isOverdue
                        ? "font-semibold text-rose-600"
                        : "text-muted-foreground",
                    )}
                  >
                    {step.dueDate}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No next steps added yet.
            </p>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Add Next Step
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Task / Action Description
                </label>
                <input
                  type="text"
                  autoFocus
                  value={stepText}
                  onChange={(e) => setStepText(e.target.value)}
                  placeholder="e.g. Schedule touchpoint call..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Due Date label
                </label>
                <input
                  type="text"
                  value={stepDueDate}
                  onChange={(e) => setStepDueDate(e.target.value)}
                  placeholder="e.g. Due Oct 27 or Overdue"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Add Step
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
