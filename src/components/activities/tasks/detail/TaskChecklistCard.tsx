"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { TaskActionItem } from "@/lib/tasks/types";
import { findTaskById, updateTaskActionItems } from "@/lib/tasks/store";
import { onRulesChange } from "@/lib/rules";

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

  if (checklist.length === 0 && !draft) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Action Items
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          No action items on this task yet.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
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
            className="text-xs font-medium text-violet-700 disabled:text-muted-foreground"
          >
            Add
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Action Items [{completedCount}/{checklist.length}]
        </h2>
      </div>

      {checklist.length > 0 && (
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${(completedCount / checklist.length) * 100}%`,
            }}
          />
        </div>
      )}

      <div className="space-y-3">
        {checklist.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-3 py-1.5"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggleItem(item.id)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
            <span
              className={`text-sm ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}
            >
              {item.text}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
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
          className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-primary transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </button>
      </div>
    </div>
  );
}
