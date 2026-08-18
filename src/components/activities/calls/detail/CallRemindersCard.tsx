"use client";

import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import ReminderModal from "@/components/activities/tasks/ReminderModal";
import {
  createTaskReminder,
  formatTaskReminderWhen,
  reminderNotify,
  type TaskReminder,
} from "@/lib/tasks/types";

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

export function CallRemindersCard({
  reminders,
  dueDate,
  onChange,
}: CallRemindersCardProps) {
  const [editor, setEditor] = useState<TaskReminder | null>(null);
  const [isNew, setIsNew] = useState(false);

  function openNew() {
    setIsNew(true);
    setEditor(
      createTaskReminder({
        type: "Follow-up",
        date: dueDateToInput(dueDate),
        time: "09:45",
        notify: "Email",
        notificationMethod: "Email",
      }),
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          Reminder{reminders.length ? `s (${reminders.length})` : ""}
        </h4>
        <button
          type="button"
          onClick={openNew}
          className="text-[#5A32A3] hover:opacity-80"
          title="Add reminder"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {reminders.length === 0 ? (
        <button
          type="button"
          onClick={openNew}
          className="rounded-xl border border-dashed border-[#5A32A3]/25 bg-[#F3ECFB]/40 px-3 py-4 text-left"
        >
          <p className="text-xs font-semibold text-[#5A32A3]">Add a reminder</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Ping the owner before this call starts.
          </p>
        </button>
      ) : (
        <div className="space-y-2">
          {reminders.map((item) => (
            <div
              key={item.id}
              className="group flex items-start gap-2 rounded-xl border border-slate-100 bg-[#F3ECFB]/30 px-3 py-2.5"
            >
              <button
                type="button"
                onClick={() => {
                  setIsNew(false);
                  setEditor(item);
                }}
                className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
                  <Bell className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-800">
                    {formatTaskReminderWhen(item)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {item.type} · Notify {reminderNotify(item)}
                    {item.repeatType && item.repeatType !== "None"
                      ? ` · ${item.repeatType}`
                      : ""}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(reminders.filter((r) => r.id !== item.id))
                }
                className="mt-1 rounded-md p-1 text-slate-300 opacity-0 hover:bg-white hover:text-rose-500 group-hover:opacity-100"
                aria-label="Delete reminder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editor ? (
        <ReminderModal
          open
          value={editor}
          dueDate={dueDate}
          onCancel={() => {
            setEditor(null);
            setIsNew(false);
          }}
          onDone={(next) => {
            onChange(
              isNew
                ? [...reminders, next]
                : reminders.map((item) => (item.id === next.id ? next : item)),
            );
            setEditor(null);
            setIsNew(false);
          }}
        />
      ) : null}
    </div>
  );
}
