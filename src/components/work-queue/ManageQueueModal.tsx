"use client";

import * as React from "react";
import { Check, GripVertical, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { menuEnter } from "@/lib/motion";
import type { WorkqueueCategoryDef } from "@/lib/work-queue/config";
import { cloneCategories } from "@/lib/work-queue/config";

interface ManageQueueModalProps {
  open: boolean;
  categories: WorkqueueCategoryDef[];
  onClose: () => void;
  onSave: (categories: WorkqueueCategoryDef[]) => void;
}

export function ManageQueueModal({
  open,
  categories,
  onClose,
  onSave,
}: ManageQueueModalProps) {
  const [draft, setDraft] = React.useState(() => cloneCategories(categories));
  const [viewType, setViewType] = React.useState<"category" | "list">(
    "category",
  );
  const [dragCatId, setDragCatId] = React.useState<string | null>(null);
  const [dragItem, setDragItem] = React.useState<{
    catId: string;
    itemId: string;
  } | null>(null);

  React.useEffect(() => {
    if (open) setDraft(cloneCategories(categories));
  }, [open, categories]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function toggleCategory(catId: string) {
    setDraft((prev) =>
      prev.map((c) =>
        c.id !== catId
          ? c
          : {
              ...c,
              checked: !c.checked,
              items: c.items.map((it) => ({ ...it, checked: !c.checked })),
            },
      ),
    );
  }

  function toggleItem(catId: string, itemId: string) {
    setDraft((prev) =>
      prev.map((c) =>
        c.id !== catId
          ? c
          : {
              ...c,
              items: c.items.map((it) =>
                it.id === itemId ? { ...it, checked: !it.checked } : it,
              ),
            },
      ),
    );
  }

  function removeItem(catId: string, itemId: string) {
    setDraft((prev) =>
      prev.map((c) =>
        c.id !== catId
          ? c
          : { ...c, items: c.items.filter((it) => it.id !== itemId) },
      ),
    );
  }

  function onCatDrop(targetId: string) {
    if (!dragCatId || dragCatId === targetId) {
      setDragCatId(null);
      return;
    }
    setDraft((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((c) => c.id === dragCatId);
      const to = arr.findIndex((c) => c.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
    setDragCatId(null);
  }

  function onItemDrop(catId: string, targetItemId: string) {
    if (
      !dragItem ||
      dragItem.catId !== catId ||
      dragItem.itemId === targetItemId
    ) {
      setDragItem(null);
      return;
    }
    setDraft((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c;
        const items = [...c.items];
        const from = items.findIndex((it) => it.id === dragItem.itemId);
        const to = items.findIndex((it) => it.id === targetItemId);
        if (from < 0 || to < 0) return c;
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        return { ...c, items };
      }),
    );
    setDragItem(null);
  }

  const flatItems =
    viewType === "list"
      ? draft.flatMap((c) =>
          c.items.map((it) => ({ ...it, catId: c.id, catLabel: c.label })),
        )
      : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "flex max-h-[82vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]",
          menuEnter,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Manage Queue"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 pt-5 pb-4">
          <div>
            <h2 className="text-[19px] leading-6 font-bold tracking-tight text-gray-900">
              Manage Queue
            </h2>
            <p className="mt-1 text-[12.5px] text-gray-400">
              Choose which queues appear in your sidebar
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 px-6 py-3">
          <span className="text-[13px] font-medium text-gray-600">
            Queues View Type
          </span>
          <select
            value={viewType}
            onChange={(e) =>
              setViewType(e.target.value as "category" | "list")
            }
            className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-[12.5px] font-medium text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
          >
            <option value="category">Category View</option>
            <option value="list">List View</option>
          </select>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-1">
          {viewType === "category"
            ? draft.map((cat) => (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={() => setDragCatId(cat.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onCatDrop(cat.id);
                  }}
                  onDragEnd={() => setDragCatId(null)}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-xl border border-gray-200 bg-[var(--wq-surface,#FAFAFA)] p-2.5 px-3 transition-opacity",
                    dragCatId === cat.id && "opacity-40",
                  )}
                >
                  <div className="flex items-center gap-2.5 px-0.5 py-1">
                    <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-gray-300" />
                    <Checkbox
                      checked={cat.checked}
                      onToggle={() => toggleCategory(cat.id)}
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      {cat.label}
                    </span>
                  </div>
                  {cat.items.map((it) => (
                    <div
                      key={it.id}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDragItem({ catId: cat.id, itemId: it.id });
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onItemDrop(cat.id, it.id);
                      }}
                      onDragEnd={() => setDragItem(null)}
                      className={cn(
                        "group flex h-8 items-center gap-2.5 rounded-lg px-1.5 transition-colors hover:bg-blue-50",
                        dragItem?.itemId === it.id && "opacity-40",
                      )}
                    >
                      <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-gray-300 opacity-50" />
                      <Checkbox
                        checked={it.checked}
                        onToggle={() => toggleItem(cat.id, it.id)}
                        size="sm"
                      />
                      <span className="flex-1 truncate text-[13.5px] text-gray-900">
                        {it.label}
                      </span>
                      <button
                        type="button"
                        aria-label="Remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(cat.id, it.id);
                        }}
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            : flatItems.map((it) => (
                <div
                  key={`${it.catId}-${it.id}`}
                  className="flex h-10 items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3"
                >
                  <Checkbox
                    checked={it.checked}
                    onToggle={() => toggleItem(it.catId, it.id)}
                  />
                  <span className="flex-1 truncate text-[13.5px] text-gray-900">
                    {it.label}
                  </span>
                  <span className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                    {it.catLabel}
                  </span>
                </div>
              ))}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-gray-100 px-6 pt-4 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-[13.5px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="h-9 rounded-lg bg-blue-600 px-5 text-[13.5px] font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  onToggle,
  size = "md",
}: {
  checked: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-4 w-4" : "h-[17px] w-[17px]";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors",
        dim,
        checked
          ? "border-blue-600 bg-blue-600"
          : "border-gray-300 bg-white hover:border-gray-400",
      )}
    >
      {checked ? (
        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
      ) : null}
    </button>
  );
}
