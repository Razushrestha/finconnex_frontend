"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { AddTaskModal } from "./AddTaskModal";

type TaskVariant = "default" | "dark" | "purple" | "green";

type Task = {
  id: string;
  title: string;
  time: string;
  done: boolean;
  variant: TaskVariant;
};

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Prepare monthly financial report",
    time: "04:25PM",
    done: false,
    variant: "default",
  },
  {
    id: "2",
    title: "Develop new marketing strategy",
    time: "04:25PM",
    done: true,
    variant: "dark",
  },
  {
    id: "3",
    title: "Reply to customer emails",
    time: "04:25PM",
    done: false,
    variant: "default",
  },
  {
    id: "4",
    title: "Update website content",
    time: "04:25PM",
    done: false,
    variant: "default",
  },
  {
    id: "5",
    title: "Review employee performance",
    time: "04:25PM",
    done: true,
    variant: "purple",
  },
  {
    id: "6",
    title: "Reply to customer emails",
    time: "04:25PM",
    done: true,
    variant: "green",
  },
  {
    id: "7",
    title: "Reply to customer emails",
    time: "04:25PM",
    done: false,
    variant: "green",
  },
];

const variantStyles: Record<
  TaskVariant,
  { row: string; check: string; text: string }
> = {
  default: { row: "", check: "border-gray-300", text: "text-gray-900" },
  dark: {
    row: "bg-gray-50",
    check: "border-gray-900 bg-gray-900",
    text: "text-gray-400 line-through",
  },
  purple: {
    row: "bg-violet-50",
    check: "border-violet-600 bg-violet-600",
    text: "text-violet-500 line-through",
  },
  green: {
    row: "bg-emerald-50",
    check: "border-emerald-500 bg-emerald-500",
    text: "text-emerald-600 line-through",
  },
};

export function TaskUpdateCard() {
  const [tasks, setTasks] = React.useState(initialTasks);
  const [modalOpen, setModalOpen] = React.useState(false);
  const listRef = React.useRef<HTMLUListElement>(null);
  const [maxHeight, setMaxHeight] = React.useState<number>();

  // Measure the height of the first 6 rows (+ gaps) so the box always
  // fits exactly 6 tasks: anything beyond that scrolls inside the list
  // instead of growing the card.
  React.useLayoutEffect(() => {
    if (!listRef.current) return;
    const items = Array.from(listRef.current.children) as HTMLElement[];
    const visible = items.slice(0, 6);
    if (visible.length === 0) return;
    const gap = 8; // matches gap-2
    const total =
      visible.reduce((sum, el) => sum + el.offsetHeight, 0) +
      gap * (visible.length - 1);
    setMaxHeight(total);
  }, [tasks.length]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addTask = (title: string, _category: string) => {
    setTasks((prev) => [
      {
        id: crypto.randomUUID(),
        title,
        time: "04:25PM",
        done: false,
        variant: "default",
      },
      ...prev,
    ]);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[17px] font-semibold text-gray-900">Task Update</h3>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-sm font-medium text-violet-600 hover:underline"
          >
            View All
          </button>
          <Button
            className="gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <ul
        ref={listRef}
        style={{ maxHeight }}
        className="flex flex-col gap-2 overflow-y-auto pr-1"
      >
        {tasks.map((task) => {
          const styles = variantStyles[task.done ? task.variant : "default"];
          return (
            <li
              key={task.id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                styles.row,
              )}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" />

              <button
                type="button"
                onClick={() => toggleTask(task.id)}
                aria-pressed={task.done}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                  styles.check,
                )}
              >
                {task.done && (
                  <svg
                    viewBox="0 0 12 12"
                    className="h-3 w-3 text-white"
                    fill="none"
                  >
                    <path
                      d="M2.5 6.5 5 9l4.5-5.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              <span
                className={cn(
                  "flex-1 text-sm font-medium",
                  task.done ? styles.text : "text-gray-900",
                )}
              >
                {task.title}
              </span>

              <span className="shrink-0 text-xs text-gray-400">
                {task.time}
              </span>

              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                aria-label="Delete task"
                className="shrink-0 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <AddTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAddTask={addTask}
      />
    </div>
  );
}

export default TaskUpdateCard;
