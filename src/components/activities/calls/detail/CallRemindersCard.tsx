"use client";

import { useMemo, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import ReminderModal from "@/components/activities/tasks/ReminderModal";
import {
  createTaskReminder,
  formatTaskReminderWhen,
  reminderFrequencyLabel,
  reminderNotify,
  type TaskReminder,
} from "@/lib/tasks/types";
import { mergeReminderSeries } from "@/lib/tasks/reminder-series";
import { parseTaskDueDate } from "@/lib/dashboard/layout";

interface CallRemindersCardProps {
  reminders: TaskReminder[];
  dueDate?: string;
  onChange: (next: TaskReminder[]) => void;
}

function dueDateToInput(value?: string): string {
  if (!value) return "";
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function reminderStatus(item: TaskReminder) {
  return item.status ?? "Pending";
}

export function CallRemindersCard({
  reminders,
  dueDate,
  onChange,
}: CallRemindersCardProps) {
  const [editor, setEditor] = useState<TaskReminder | null>(null);
  const [isNew, setIsNew] = useState(false);
  const activeItems = useMemo(
    () => reminders.filter((item) => reminderStatus(item) === "Pending"),
    [reminders],
  );

  function defaultReminder(): TaskReminder {
    return createTaskReminder({
      type: "Follow-up",
      date: dueDateToInput(dueDate),
      time: "09:45",
      notify: "Email",
      notificationMethod: "Email",
    });
  }

  function openNew() {
    setIsNew(true);
    setEditor(defaultReminder());
  }

  return (
    <section className="py-6">
      <h2 className="mb-3 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        Reminders
        {activeItems.length > 0 ? ` (${activeItems.length})` : ""}
      </h2>

      {activeItems.length === 0 ? (
        <p className="mb-4 text-2xl font-light leading-none text-slate-300">—</p>
      ) : (
        <div className="space-y-2">
          {activeItems.map((item) => (
            <div key={item.id} className="group flex items-center gap-3 py-1">
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
                      ? ` · ${reminderFrequencyLabel(item.repeatType)}`
                      : ""}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(reminders.filter((row) => row.id !== item.id))
                }
                className="rounded-md p-1 text-slate-300 opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
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
        onClick={openNew}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Add reminder
      </button>

      <ReminderModal
        open={Boolean(editor)}
        value={editor ?? defaultReminder()}
        dueDate={dueDate}
        onCancel={() => {
          setEditor(null);
          setIsNew(false);
        }}
        onDone={(next) => {
          onChange(
            mergeReminderSeries(
              reminders,
              next,
              dueDate ? parseTaskDueDate(dueDate) : null,
              isNew ? "add" : "replace",
            ),
          );
          setEditor(null);
          setIsNew(false);
        }}
      />
    </section>
  );
}
