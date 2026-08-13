"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  date: string;
}

export function TaskChecklistCard() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: "1",
      text: "Gather regional revenue data",
      completed: true,
      date: "Oct 20",
    },
    {
      id: "2",
      text: "Review churn metrics with Support team",
      completed: true,
      date: "Oct 21",
    },
    { id: "3", text: "Draft summary report", completed: false, date: "Oct 23" },
    { id: "4", text: "Finalize risk matrix", completed: false, date: "Oct 24" },
  ]);

  const completedCount = checklist.filter((item) => item.completed).length;

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Checklist [{completedCount}/{checklist.length}]
        </h2>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(completedCount / checklist.length) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {checklist.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-1.5"
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => {
                  setChecklist(
                    checklist.map((c) =>
                      c.id === item.id ? { ...c, completed: !c.completed } : c,
                    ),
                  );
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
              />
              <span
                className={`text-sm ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {item.text}
              </span>
            </label>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{item.date}</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                AS
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-4 flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Item
      </button>
    </div>
  );
}
