"use client";

import { useEffect, useState } from "react";
import { Calendar, Mail, MessageSquare, X } from "lucide-react";
import type { DocumentRequest } from "@/lib/documents/requests/types";
import { upsertDocumentRequest } from "@/lib/documents/requests/types";
import { appendTimeline, nowStamp } from "@/lib/documents/requests/pack";
import {
  formatCustomReminder,
  formatRequestDateTime,
  parseCustomReminderLabel,
  parseStoredDateTime,
  toDatetimeLocalValue,
  type CustomReminderConfig,
  type ReminderStop,
  type ReminderUnit,
  type RequestNotifyMethod,
} from "@/components/documents/requests/RequestScheduleCard";
import { cn } from "@/lib/utils";

export function EditRemindersModal({
  request,
  onClose,
  onSaved,
}: {
  request: DocumentRequest;
  onClose: () => void;
  onSaved: (next: DocumentRequest) => void;
}) {
  const due = parseStoredDateTime(request.dueDate);
  const existing = parseStoredDateTime(request.reminderDate);
  const parsedRepeat = parseCustomReminderLabel(request.repeat);
  const [reminderDate, setReminderDate] = useState(
    existing ? toDatetimeLocalValue(existing) : "",
  );
  const [repeatEnabled, setRepeatEnabled] = useState(parsedRepeat.enabled);
  const [customReminder, setCustomReminder] = useState<CustomReminderConfig>(
    parsedRepeat.config,
  );
  const [notifyBy, setNotifyBy] = useState<RequestNotifyMethod[]>(
    (request.notifyBy?.filter(
      (item): item is RequestNotifyMethod =>
        item === "Email" || item === "SMS",
    ) ?? ["Email"]) as RequestNotifyMethod[],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function patchCustom(patch: Partial<CustomReminderConfig>) {
    setCustomReminder((prev) => ({ ...prev, ...patch }));
  }

  function toggleNotify(method: RequestNotifyMethod) {
    setNotifyBy((prev) =>
      prev.includes(method)
        ? prev.filter((item) => item !== method)
        : [...prev, method],
    );
  }

  function save() {
    if (reminderDate.trim()) {
      const reminder = parseStoredDateTime(reminderDate);
      if (!reminder) {
        setError("Enter a valid reminder date and time");
        return;
      }
      if (reminder.getTime() <= Date.now()) {
        setError("Reminder must be after the current date and time");
        return;
      }
      if (due && reminder.getTime() > due.getTime() && due.getTime() > Date.now()) {
        setError("Reminder cannot be after the due date");
        return;
      }
    }

    const next = {
      ...request,
      reminderDate: reminderDate.trim()
        ? formatRequestDateTime(reminderDate)
        : undefined,
      repeat: repeatEnabled
        ? formatCustomReminder(customReminder)
        : undefined,
      notifyBy,
      lastUpdated: nowStamp(),
      timeline: appendTimeline(request, {
        at: nowStamp(),
        by: request.requestedBy,
        label: "Reminder updated",
        detail: [
          reminderDate.trim()
            ? formatRequestDateTime(reminderDate)
            : "No reminder date",
          repeatEnabled ? formatCustomReminder(customReminder) : "Does not repeat",
          notifyBy.length ? `Notify by ${notifyBy.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      }),
    };
    upsertDocumentRequest(next);
    onSaved(next);
  }

  const dueLabel = due
    ? due.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : request.dueDate;
  const minValue = toDatetimeLocalValue(new Date());
  const maxValue = due ? toDatetimeLocalValue(due) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-reminders-title"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[86vh] w-full max-w-[440px] overflow-y-auto rounded-2xl bg-white px-6 pt-6 pb-5 shadow-xl"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
        <h2
          id="edit-reminders-title"
          className="pr-8 text-[18px] font-bold text-slate-900"
        >
          Edit reminders
        </h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Due {dueLabel}. Change the reminder date, repeat, and how the client
          is notified.
        </p>

        <label className="mt-5 block text-[11px] font-medium tracking-wide text-gray-500 uppercase">
          Reminder date
        </label>
        <div className="relative mt-1">
          <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="datetime-local"
            min={minValue}
            max={maxValue}
            value={reminderDate}
            onChange={(e) => {
              setReminderDate(e.target.value);
              setError(null);
            }}
            className="w-full rounded-md border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-800 outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
          />
        </div>
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to turn the reminder date off.
          </p>
        )}

        <label className="mt-4 block text-[11px] font-medium tracking-wide text-gray-500 uppercase">
          Repeat
        </label>
        <div className="mt-1 flex items-center justify-between rounded-md border border-violet-100 bg-[#F8F4FC] px-3 py-2">
          <button
            type="button"
            onClick={() => setRepeatEnabled((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              repeatEnabled ? "bg-green-500" : "bg-gray-300",
            )}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                repeatEnabled ? "translate-x-5" : "translate-x-1",
              )}
            />
          </button>
          <span
            className={cn(
              "text-sm",
              repeatEnabled ? "text-slate-700" : "text-gray-400",
            )}
          >
            {repeatEnabled ? "On" : "Off"}
          </span>
        </div>

        {repeatEnabled ? (
          <div className="mt-2 space-y-2.5 rounded-xl bg-[#F3ECFB] px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="w-[88px] shrink-0 text-[12px] font-medium text-slate-700">
                Repeat every
              </span>
              <input
                type="number"
                min={1}
                value={customReminder.every}
                onChange={(e) =>
                  patchCustom({ every: Math.max(1, Number(e.target.value) || 1) })
                }
                className="h-8 w-12 rounded-md border border-violet-200 bg-white text-center text-[13px] outline-none"
              />
              <select
                value={customReminder.unit}
                onChange={(e) =>
                  patchCustom({ unit: e.target.value as ReminderUnit })
                }
                className="h-8 rounded-md border border-violet-200 bg-white px-2 text-[13px] outline-none"
              >
                <option value="Days">Days</option>
                <option value="Weeks">Weeks</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-[88px] shrink-0 text-[12px] font-medium text-slate-700">
                Start reminder
              </span>
              <input
                type="number"
                min={0}
                value={customReminder.startAfterDays}
                onChange={(e) =>
                  patchCustom({
                    startAfterDays: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="h-8 w-12 rounded-md border border-violet-200 bg-white text-center text-[13px] outline-none"
              />
              <span className="text-[12px] text-slate-600">
                days after request
              </span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-800">
              <input
                type="checkbox"
                checked={customReminder.exceptWeekendsAndHolidays}
                onChange={(e) =>
                  patchCustom({ exceptWeekendsAndHolidays: e.target.checked })
                }
                className="h-3.5 w-3.5 rounded border-slate-300 accent-[#5A32A3]"
              />
              Except weekends and holidays
            </label>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-slate-700">
                Stop reminders
              </p>
              <div className="space-y-1.5">
                {(
                  [
                    ["completed", "When documents are completed"],
                    ["due", `On due date${dueLabel ? ` (${dueLabel})` : ""}`],
                    ["after", "After"],
                    ["never", "Never stop"],
                  ] as const
                ).map(([id, label]) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-800"
                  >
                    <input
                      type="radio"
                      name="edit-reminder-stop"
                      checked={customReminder.stop === id}
                      onChange={() => patchCustom({ stop: id as ReminderStop })}
                      className="h-3.5 w-3.5 accent-[#5A32A3]"
                    />
                    {id === "after" ? (
                      <>
                        After
                        <input
                          type="number"
                          min={1}
                          value={customReminder.stopAfterCount}
                          onChange={(e) =>
                            patchCustom({
                              stop: "after",
                              stopAfterCount: Math.max(
                                1,
                                Number(e.target.value) || 1,
                              ),
                            })
                          }
                          className="h-7 w-10 rounded-md border border-violet-200 bg-white text-center text-[12px] outline-none"
                        />
                        reminders
                      </>
                    ) : (
                      label
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <label className="mt-4 block text-[11px] font-medium tracking-wide text-gray-500 uppercase">
          Notify by
        </label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(["Email", "SMS"] as const).map((method) => {
            const active = notifyBy.includes(method);
            const Icon = method === "SMS" ? MessageSquare : Mail;
            return (
              <button
                key={method}
                type="button"
                onClick={() => toggleNotify(method)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium",
                  active
                    ? "border-[#5A32A3] bg-[#F3ECFB] text-[#5A32A3]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {method}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 min-w-[96px] rounded-lg border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="h-10 min-w-[96px] rounded-lg bg-slate-900 px-5 text-[13px] font-semibold text-white hover:bg-slate-800"
          >
            Save reminders
          </button>
        </div>
      </div>
    </div>
  );
}
