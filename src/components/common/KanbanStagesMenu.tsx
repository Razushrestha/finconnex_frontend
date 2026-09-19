"use client";

import { useState } from "react";
import { ChevronDown, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

export interface KanbanStageColumnOption {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

export function KanbanStagesMenu({
  columns,
  onToggle,
  onRename,
  onAdd,
  onReorder,
}: {
  columns: KanbanStageColumnOption[];
  onToggle?: (columnId: string) => void;
  onRename?: (columnId: string, nextLabel: string) => void;
  onAdd?: (title: string) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
}) {
  const [isStagesOpen, setIsStagesOpen] = useState(false);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  if (!columns.length) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsStagesOpen((open) => {
            const next = !open;
            if (!next) setIsAddStageOpen(false);
            return next;
          });
        }}
        aria-expanded={isStagesOpen}
        aria-haspopup="true"
        className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-[14px] font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800"
      >
        <span>Stages</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
            isStagesOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isStagesOpen ? (
        <div className="mt-0.5 rounded-md border border-slate-100 bg-slate-50/80 p-1 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="max-h-52 overflow-y-auto">
            {columns
              .filter((col) => col.visible)
              .map((col) => (
                <div
                  key={col.id}
                  draggable={!!onReorder}
                  onDragStart={(e) => {
                    setDraggedColumnId(col.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (!draggedColumnId) return;
                    e.preventDefault();
                    if (dragOverColumnId !== col.id) {
                      setDragOverColumnId(col.id);
                    }
                  }}
                  onDragLeave={() =>
                    setDragOverColumnId((prev) =>
                      prev === col.id ? null : prev,
                    )
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedColumnId && draggedColumnId !== col.id) {
                      onReorder?.(draggedColumnId, col.id);
                    }
                    setDraggedColumnId(null);
                    setDragOverColumnId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedColumnId(null);
                    setDragOverColumnId(null);
                  }}
                  className={`flex items-center gap-1 rounded border-t-2 ${
                    dragOverColumnId === col.id &&
                    draggedColumnId !== col.id
                      ? "border-violet-400"
                      : "border-transparent"
                  } ${draggedColumnId === col.id ? "opacity-40" : ""}`}
                >
                  {onReorder ? (
                    <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 active:cursor-grabbing" />
                  ) : null}
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-zinc-800">
                    <input
                      type="checkbox"
                      checked
                      disabled={col.required}
                      onChange={() => onToggle?.(col.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-400 disabled:opacity-50 dark:border-zinc-600"
                    />
                    <span className="truncate">{col.label}</span>
                  </label>
                  {onRename ? (
                    <button
                      type="button"
                      title={`Rename ${col.label}`}
                      aria-label={`Rename ${col.label}`}
                      onClick={() => {
                        const next = window.prompt("Stage title", col.label);
                        const trimmed = next?.trim();
                        if (!trimmed || trimmed === col.label) return;
                        onRename(col.id, trimmed);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-slate-200"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  ) : null}
                  {onToggle && !col.required ? (
                    <button
                      type="button"
                      title={`Remove ${col.label} from the board`}
                      aria-label={`Remove ${col.label} from the board`}
                      onClick={() => onToggle(col.id)}
                      className="rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              ))}
            {columns.every((col) => !col.visible) ? (
              <p className="px-2 py-2 text-[12px] text-slate-400">
                No stages on the board
              </p>
            ) : null}
          </div>

          <div className="relative mt-1 border-t border-slate-200 pt-1 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsAddStageOpen((open) => !open)}
              aria-expanded={isAddStageOpen}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[13px] font-medium text-violet-700 hover:bg-white dark:text-violet-300 dark:hover:bg-zinc-800"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add stage
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  isAddStageOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isAddStageOpen ? (
              <div className="mt-0.5 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
                {onAdd ? (
                  <button
                    type="button"
                    onClick={() => {
                      const next = window.prompt("Stage title");
                      const trimmed = next?.trim();
                      if (!trimmed) return;
                      onAdd(trimmed);
                      setIsAddStageOpen(false);
                    }}
                    className="flex w-full items-center rounded px-2 py-1.5 text-left text-[13px] font-medium text-violet-700 hover:bg-slate-50 dark:text-violet-300 dark:hover:bg-zinc-800"
                  >
                    Custom title…
                  </button>
                ) : null}
                {columns
                  .filter((col) => !col.visible)
                  .map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        onToggle?.(col.id);
                        setIsAddStageOpen(false);
                      }}
                      className="flex w-full items-center rounded px-2 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800"
                    >
                      {col.label}
                    </button>
                  ))}
                {columns.every((col) => col.visible) ? (
                  <p className="px-2 py-2 text-[12px] text-slate-400">
                    All stages are already on the board. Hide one to reuse it
                    as a custom title.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
