"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

interface Task {
  id: string;
  label: string;
  completed: boolean;
}

export const PreparationTasksCard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", label: "Review Q2 Performance Report", completed: false },
    { id: "2", label: "Draft preliminary contract", completed: true },
    { id: "3", label: "Send agenda to internal team", completed: false },
  ]);

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Preparation
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Tasks to complete before this meeting.
        </p>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <label
            key={task.id}
            className="flex items-center space-x-3 p-2 bg-input/30 hover:bg-input/60 rounded-lg border border-border cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
            <span
              className={`text-xs ${task.completed ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}
            >
              {task.label}
            </span>
          </label>
        ))}
      </div>

      <button
        type="button"
        className="flex items-center space-x-1.5 text-xs font-semibold text-primary hover:underline pt-1"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add Task</span>
      </button>
    </div>
  );
};
