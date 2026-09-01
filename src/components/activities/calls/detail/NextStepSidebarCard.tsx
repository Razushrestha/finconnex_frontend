"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
  const [draft, setDraft] = useState("");
  const completedCount = steps.filter((step) => step.completed).length;

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    onAddStep?.(text, "Due soon");
    setDraft("");
  }

  return (
    <section className="border-b border-slate-100 py-7">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          {steps.length
            ? `Action Items [${completedCount}/${steps.length}]`
            : "Action Items"}
        </h2>
      </div>

      {steps.length > 0 ? (
        <div className="mb-4 h-px w-full bg-slate-100">
          <div
            className="h-px bg-[#5A32A3] transition-all duration-300"
            style={{
              width: `${(completedCount / steps.length) * 100}%`,
            }}
          />
        </div>
      ) : (
        <p className="mb-4 text-2xl font-light leading-none text-slate-300">—</p>
      )}

      <div className="space-y-3">
        {steps.map((step) => (
          <label
            key={step.id}
            className="flex cursor-pointer items-start gap-3 py-0.5"
          >
            <input
              type="checkbox"
              checked={step.completed}
              onChange={() => onToggleStep?.(step.id)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5A32A3] focus:ring-[#5A32A3]"
            />
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-sm",
                  step.completed
                    ? "text-slate-400 line-through"
                    : "text-slate-800",
                )}
              >
                {step.text}
              </span>
              {step.dueDate ? (
                <span
                  className={cn(
                    "mt-0.5 block text-[11px]",
                    step.isOverdue ? "font-semibold text-rose-500" : "text-slate-400",
                  )}
                >
                  {step.dueDate}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-b border-slate-200 py-1.5 focus-within:border-violet-400">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Add an action item…"
          className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#5A32A3] hover:opacity-80 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </button>
      </div>
    </section>
  );
}
