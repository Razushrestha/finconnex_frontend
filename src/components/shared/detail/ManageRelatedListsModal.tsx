"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { RelatedListItem } from "./types";

interface ManageRelatedListsModalProps {
  open: boolean;
  allItems: RelatedListItem[];
  visibleIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}

export function ManageRelatedListsModal({
  open,
  allItems,
  visibleIds,
  onClose,
  onSave,
}: ManageRelatedListsModalProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set(visibleIds));

  useEffect(() => {
    if (open) setChecked(new Set(visibleIds));
  }, [open, visibleIds]);

  if (!open) return null;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-semibold text-slate-900">
            Add Related List
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto px-5 py-3 no-scrollbar">
          {allItems.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center justify-between py-1.5 text-[13px] font-medium text-slate-700"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                {item.label}
              </span>
              {typeof item.count === "number" && (
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-600">
                  {item.count}
                </span>
              )}
            </label>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(Array.from(checked))}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
