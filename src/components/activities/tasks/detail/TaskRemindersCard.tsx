"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import ReminderModal from "@/components/activities/tasks/ReminderModal";
import {
  createTaskReminder,
  formatTaskReminderWhen,
  reminderNotify,
  type TaskReminder,
} from "@/lib/tasks/types";
import { findTaskById, updateTaskReminders } from "@/lib/tasks/store";
import { onRulesChange } from "@/lib/rules";
import { useRelatedCrmReminders } from "@/lib/reminders/use-related-crm-reminders";
import { cn } from "@/lib/utils";

const EMPTY_REMINDERS: TaskReminder[] = [];

interface TaskRemindersCardProps {
  taskId: string;
  reminders?: TaskReminder[];
  dueDate?: string;
}

function dueDateToInput(value?: string): string {
  if (!value) return "";
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

export function TaskRemindersCard({
  taskId,
  reminders,
  dueDate,
}: TaskRemindersCardProps) {
  const crm = useRelatedCrmReminders("Task", taskId);
  const [items, setItems] = useState<TaskReminder[]>(
    () => reminders ?? EMPTY_REMINDERS,
  );
  const [editor, setEditor] = useState<TaskReminder | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    function load() {
      const found = findTaskById(taskId);
      setItems(found?.task.reminders ?? EMPTY_REMINDERS);
    }
    load();
    return onRulesChange(load);
  }, [taskId]);

  useEffect(() => {
    if (crm.source !== "api") return;
    setItems(crm.items);
    updateTaskReminders(taskId, crm.items);
  }, [crm.source, crm.items, taskId]);

  function persist(next: TaskReminder[]) {
    setItems(next);
    updateTaskReminders(taskId, next);
  }

  function defaultReminder(): TaskReminder {
    return createTaskReminder({
      date: dueDateToInput(dueDate),
      time: "13:00",
      notify: "Email",
      notificationMethod: "Email",
    });
  }

  async function handleDone(next: TaskReminder) {
    if (isNew && crm.live) {
      try {
        const created = await crm.create(next);
        persist([...items, created]);
      } catch {
        persist([...items, next]);
      }
    } else {
      persist(
        isNew
          ? [...items, next]
          : items.map((item) => (item.id === next.id ? next : item)),
      );
    }
    setEditor(null);
    setIsNew(false);
  }

  function handleCancel() {
    setEditor(null);
    setIsNew(false);
  }

  return (
    <section className="border-b border-slate-100 py-7">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Reminders
          {items.length > 0 ? ` (${items.length})` : ""}
          {crm.source === "api" ? (
            <span className={cn("ml-2 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700")}>
              Live CRM
            </span>
          ) : null}
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="mb-4 text-sm text-slate-500">
          No reminders on this task yet. Click add reminder to set one.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-3 transition hover:border-violet-200 hover:bg-violet-50/40"
            >
              <button
                type="button"
                onClick={() => {
                  setIsNew(false);
                  setEditor(item);
                }}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800">
                    {formatTaskReminderWhen(item)}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Notify: {reminderNotify(item)}
                    {item.repeatType && item.repeatType !== "None"
                      ? ` · Repeats ${item.repeatType}`
                      : ""}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (crm.live) void crm.remove(item.id);
                  persist(items.filter((row) => row.id !== item.id));
                }}
                className="rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-white hover:text-rose-600 group-hover:opacity-100"
                aria-label="Remove reminder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setIsNew(true);
          setEditor(defaultReminder());
        }}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Add reminder
      </button>

      <ReminderModal
        open={Boolean(editor)}
        value={editor ?? defaultReminder()}
        dueDate={dueDate}
        onCancel={handleCancel}
        onDone={(next) => void handleDone(next)}
      />
    </section>
  );
}
