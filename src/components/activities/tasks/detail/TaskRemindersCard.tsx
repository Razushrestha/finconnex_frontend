"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Plus, Trash2 } from "lucide-react";
import ReminderModal from "@/components/activities/tasks/ReminderModal";
import {
  createTaskReminder,
  formatTaskReminderWhen,
  reminderFrequencyLabel,
  reminderNotify,
  type TaskReminder,
} from "@/lib/tasks/types";
import {
  completeTaskReminder,
  findTaskById,
  updateTaskReminders,
} from "@/lib/tasks/store";
import { afterCompletionSummary } from "@/lib/tasks/repeat-reminder";
import { mergeReminderSeries } from "@/lib/tasks/reminder-series";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import { onRulesChange } from "@/lib/rules";

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

function reminderStatus(item: TaskReminder) {
  return item.status ?? "Pending";
}

export function TaskRemindersCard({
  taskId,
  reminders,
  dueDate,
}: TaskRemindersCardProps) {
  const [items, setItems] = useState<TaskReminder[]>(
    () => reminders ?? EMPTY_REMINDERS,
  );
  const [editor, setEditor] = useState<TaskReminder | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [justCompleted, setJustCompleted] = useState<TaskReminder | null>(null);

  useEffect(() => {
    function load() {
      const found = findTaskById(taskId);
      setItems(found?.task.reminders ?? EMPTY_REMINDERS);
    }
    load();
    return onRulesChange(load);
  }, [taskId]);

  const activeItems = useMemo(
    () => items.filter((item) => reminderStatus(item) === "Pending"),
    [items],
  );

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

  function handleDone(next: TaskReminder) {
    persist(
      mergeReminderSeries(
        items,
        next,
        dueDate ? parseTaskDueDate(dueDate) : null,
        isNew ? "add" : "replace",
      ),
    );
    setEditor(null);
    setIsNew(false);
  }

  function handleCancel() {
    setEditor(null);
    setIsNew(false);
  }

  function handleComplete(item: TaskReminder) {
    const updated = completeTaskReminder(taskId, item.id);
    const completed = updated?.reminders?.find((row) => row.id === item.id);
    if (completed) setJustCompleted(completed);
  }

  function handleRemove(item: TaskReminder) {
    persist(
      items.filter((row) => {
        if (row.id === item.id) return false;
        if (
          item.sequenceId &&
          row.sequenceId === item.sequenceId &&
          reminderStatus(row) !== "Pending"
        ) {
          return true;
        }
        return true;
      }),
    );
    if (justCompleted?.id === item.id) setJustCompleted(null);
  }

  return (
    <section className="border-b border-slate-100 py-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Reminders
          {activeItems.length > 0 ? ` (${activeItems.length})` : ""}
        </h2>
      </div>

      {justCompleted?.nextScheduledLabel ? (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
          <p className="text-sm font-semibold text-emerald-800">✓ Completed</p>
          <p className="mt-0.5 text-[13px] text-emerald-700">
            Next reminder scheduled for {justCompleted.nextScheduledLabel}.
          </p>
        </div>
      ) : justCompleted ? (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
          <p className="text-sm font-semibold text-emerald-800">✓ Completed</p>
        </div>
      ) : null}

      {activeItems.length === 0 && !justCompleted ? (
        <p className="mb-4 text-2xl font-light leading-none text-slate-300">—</p>
      ) : (
        <div className="space-y-2">
          {activeItems.map((item) => {
            const afterCompletion = item.repeatRule?.preset === "afterCompletion";
            return (
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
                      {afterCompletion && item.repeatRule
                        ? ` · 🔄 ${afterCompletionSummary(item.repeatRule)}`
                        : item.repeatType && item.repeatType !== "None"
                          ? ` · ${reminderFrequencyLabel(item.repeatType)}`
                          : ""}
                    </span>
                  </span>
                </button>
                {afterCompletion ? (
                  <button
                    type="button"
                    onClick={() => handleComplete(item)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Complete
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-white hover:text-rose-600 group-hover:opacity-100"
                  aria-label="Remove reminder"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
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
        onDone={handleDone}
      />
    </section>
  );
}
