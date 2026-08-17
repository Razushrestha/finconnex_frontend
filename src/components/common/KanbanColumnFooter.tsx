"use client";

import { FoldHorizontal, Plus } from "lucide-react";

export function KanbanColumnFooter({
  createLabel,
  createAriaLabel,
  onCreate,
  onCollapse,
  collapseLabel,
}: {
  createLabel: string;
  createAriaLabel?: string;
  onCreate: () => void;
  onCollapse: () => void;
  collapseLabel: string;
}) {
  return (
    <div className="mt-2 flex w-full shrink-0 overflow-hidden rounded-md bg-white shadow-sm opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      <button
        type="button"
        onClick={onCreate}
        aria-label={createAriaLabel ?? createLabel}
        className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
      >
        <Plus className="h-4 w-4 shrink-0" />
        {createLabel}
      </button>
      <button
        type="button"
        onClick={onCollapse}
        aria-label={collapseLabel}
        title="Collapse column"
        className="flex w-9 shrink-0 items-center justify-center border-l border-slate-200 text-slate-800 hover:bg-slate-50"
      >
        <FoldHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
