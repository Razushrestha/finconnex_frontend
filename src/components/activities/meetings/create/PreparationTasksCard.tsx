"use client";

import React, { useRef, useState } from "react";
import { ListChecks, Plus, X } from "lucide-react";

interface Task {
  id: string;
  label: string;
  completed: boolean;
}

export const PreparationTasksCard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const completedCount = tasks.filter((task) => task.completed).length;

  function addTask(options?: { focusAfter?: boolean }) {
    const label = draft.trim();
    if (!label) {
      if (options?.focusAfter) inputRef.current?.focus();
      return;
    }
    setTasks((current) => [
      ...current,
      { id: `prep-${Date.now()}`, label, completed: false },
    ]);
    setDraft("");
    if (options?.focusAfter) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

  function updateTask(id: string, label: string) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, label } : task)),
    );
  }

  function finalizeTask(id: string) {
    setTasks((current) =>
      current.filter((task) => task.id !== id || task.label.trim().length > 0),
    );
  }

  function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  return (
    <div className="rounded-md border border-border bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
          <ListChecks className="h-4 w-4 text-foreground/70" />
          Preparation
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground/75">
          {completedCount}/{tasks.length} Completed
        </span>
      </div>

      {tasks.length > 0 ? (
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-300"
            style={{
              width: `${
                tasks.length ? (completedCount / tasks.length) * 100 : 0
              }%`,
            }}
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        {tasks.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-400">
            No action items yet. Add your first step below.
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-2.5 rounded-md border border-gray-100 bg-white px-3 py-2"
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
                className="h-4 w-4 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-400"
                aria-label={`Mark "${task.label}" complete`}
              />
              <input
                type="text"
                value={task.label}
                onChange={(event) => updateTask(task.id, event.target.value)}
                onBlur={() => finalizeTask(task.id)}
                className={
                  "min-w-0 flex-1 bg-transparent text-sm focus:outline-none " +
                  (task.completed
                    ? "text-foreground/50 line-through"
                    : "text-foreground/80")
                }
              />
              <button
                type="button"
                onClick={() => removeTask(task.id)}
                className="shrink-0 text-gray-400 opacity-100 transition-opacity hover:text-gray-600 md:opacity-0 md:group-hover:opacity-100"
                aria-label={`Remove "${task.label}"`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}

        <div className="flex items-center gap-2.5 rounded-md border border-dashed border-gray-200 px-3 py-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
          <Plus className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => addTask()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTask({ focusAfter: true });
              }
            }}
            placeholder="Add new action item…"
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => addTask({ focusAfter: true })}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-violet-700 transition-colors hover:text-violet-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Item
      </button>
    </div>
  );
};
