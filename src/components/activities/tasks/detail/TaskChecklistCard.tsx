"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { TaskActionItem } from "@/lib/tasks/types";
import { findTaskById, updateTaskActionItems } from "@/lib/tasks/store";
import { onRulesChange } from "@/lib/rules";
import { useTaskSectionEdit } from "./TaskEditContext";

const EMPTY_ACTION_ITEMS: TaskActionItem[] = [];

interface TaskChecklistCardProps {
  taskId: string;
  items?: TaskActionItem[];
}

export function TaskChecklistCard({
  taskId,
  items,
}: TaskChecklistCardProps) {
  const [checklist, setChecklist] = useState<TaskActionItem[]>(
    () => items ?? EMPTY_ACTION_ITEMS,
  );
  const [draft, setDraft] = useState("");
  const [editItems, setEditItems] = useState<TaskActionItem[]>([]);

  useEffect(() => {
    const found = findTaskById(taskId);
    setChecklist(found?.task.actionItems ?? EMPTY_ACTION_ITEMS);
    return onRulesChange(() => {
      const latest = findTaskById(taskId);
      setChecklist(latest?.task.actionItems ?? EMPTY_ACTION_ITEMS);
    });
  }, [taskId]);

  const completedCount = checklist.filter((item) => item.done).length;

  function persist(next: TaskActionItem[]) {
    setChecklist(next);
    updateTaskActionItems(taskId, next);
  }

  function toggleItem(id: string) {
    persist(
      checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  }

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    persist([
      ...checklist,
      {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `ai-${Date.now()}`,
        text,
        done: false,
      },
    ]);
    setDraft("");
  }

  const editing = useTaskSectionEdit({
    start() {
      setEditItems(checklist.map((item) => ({ ...item })));
    },
    save() {
      persist(
        editItems
          .map((item) => ({ ...item, text: item.text.trim() }))
          .filter((item) => item.text.length > 0),
      );
    },
    cancel() {
      setEditItems([]);
    },
  });

  if (checklist.length === 0 && !draft && !editing) {
    return (
      <section className="border-b border-slate-100 py-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Action Items
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          No action items on this task yet.
        </p>
        <div className="flex items-center gap-2 border-b border-slate-200 py-1.5 focus-within:border-violet-400">
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
            className="text-xs font-medium text-violet-700 disabled:text-slate-400"
          >
            Add
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-slate-100 py-7">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Action Items [{completedCount}/{checklist.length}]
        </h2>
      </div>

      {checklist.length > 0 && (
        <div className="mb-4 h-px w-full bg-slate-100">
          <div
            className="h-px bg-[#5A32A3] transition-all duration-300"
            style={{
              width: `${(completedCount / checklist.length) * 100}%`,
            }}
          />
        </div>
      )}

      <div className="space-y-3">
        {(editing ? editItems : checklist).map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-3 py-0.5"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => {
                if (editing) {
                  setEditItems((prev) =>
                    prev.map((row) =>
                      row.id === item.id ? { ...row, done: !row.done } : row,
                    ),
                  );
                  return;
                }
                toggleItem(item.id);
              }}
              className="h-4 w-4 rounded border-slate-300 text-[#5A32A3] focus:ring-[#5A32A3]"
            />
            {editing ? (
              <>
                <input
                  value={item.text}
                  onChange={(e) =>
                    setEditItems((prev) =>
                      prev.map((row) =>
                        row.id === item.id
                          ? { ...row, text: e.target.value }
                          : row,
                      ),
                    )
                  }
                  className="min-w-0 flex-1 border-b border-slate-200 bg-transparent text-sm text-slate-800 outline-none focus:border-violet-400"
                />
                <button
                  type="button"
                  aria-label={`Remove ${item.text}`}
                  onClick={() =>
                    setEditItems((prev) =>
                      prev.filter((row) => row.id !== item.id),
                    )
                  }
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <span
                className={`text-sm ${item.done ? "text-slate-400 line-through" : "text-slate-800"}`}
              >
                {item.text}
              </span>
            )}
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
          placeholder="Add new action item…"
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
