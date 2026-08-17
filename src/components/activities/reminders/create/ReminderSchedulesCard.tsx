"use client";

import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import {
  NOTIFICATION_METHODS,
  REMINDER_LEAD_TIMES,
  createReminderScheduleEntry,
  type NotificationMethod,
  type ReminderLeadTime,
  type ReminderScheduleEntry,
} from "@/lib/reminders/types";

interface ReminderSchedulesCardProps {
  entries: ReminderScheduleEntry[];
  onChange: (entries: ReminderScheduleEntry[]) => void;
  defaultNotificationMethod?: NotificationMethod;
}

export function ReminderSchedulesCard({
  entries,
  onChange,
  defaultNotificationMethod = "Web Push",
}: ReminderSchedulesCardProps) {
  function updateEntry(
    id: string,
    patch: Partial<ReminderScheduleEntry>,
  ) {
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function addEntry() {
    onChange([
      ...entries,
      createReminderScheduleEntry(defaultNotificationMethod),
    ]);
  }

  function removeEntry(id: string) {
    if (entries.length <= 1) return;
    onChange(entries.filter((entry) => entry.id !== id));
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-white p-6 text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Reminders
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Add one or more reminder times. Web Push is supported for browser
            alerts.
          </p>
        </div>
        <button
          type="button"
          onClick={addEntry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Reminder
        </button>
      </div>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="rounded-lg border border-border bg-slate-50/60 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Reminder {index + 1}
              </p>
              {entries.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-rose-600"
                  aria-label={`Remove reminder ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-muted-foreground">
                  Date
                </span>
                <div className="flex items-center rounded-lg border border-border bg-white px-3 py-2 text-sm">
                  <Calendar className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) =>
                      updateEntry(entry.id, { date: e.target.value })
                    }
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-muted-foreground">
                  Time
                </span>
                <div className="flex items-center rounded-lg border border-border bg-white px-3 py-2 text-sm">
                  <Clock className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type="time"
                    value={entry.time}
                    onChange={(e) =>
                      updateEntry(entry.id, { time: e.target.value })
                    }
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-muted-foreground">
                  Lead Time
                </span>
                <select
                  value={entry.leadTime}
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      leadTime: e.target.value as ReminderLeadTime,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none"
                >
                  {REMINDER_LEAD_TIMES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-muted-foreground">
                  Notification
                </span>
                <select
                  value={entry.notificationMethod}
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      notificationMethod: e.target.value as NotificationMethod,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none"
                >
                  {NOTIFICATION_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
