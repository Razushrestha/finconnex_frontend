"use client";

import { Calendar, Mail, MessageSquare } from "lucide-react";
import {
  defaultRepeatConfig,
  type RepeatConfig,
} from "@/components/activities/tasks/RepeatModal";
import { cn } from "@/lib/utils";

export type RequestNotifyMethod = "Email" | "SMS";

export type ReminderFrequency =
  | "off"
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom";

export type ReminderUnit = "Days" | "Weeks";
export type ReminderStop = "completed" | "due" | "after" | "never";

export interface CustomReminderConfig {
  every: number;
  unit: ReminderUnit;
  startAfterDays: number;
  stop: ReminderStop;
  stopAfterCount: number;
  exceptWeekendsAndHolidays: boolean;
}

export const defaultCustomReminder: CustomReminderConfig = {
  every: 2,
  unit: "Days",
  startAfterDays: 2,
  stop: "completed",
  stopAfterCount: 5,
  exceptWeekendsAndHolidays: false,
};

export function formatCustomReminder(config: CustomReminderConfig): string {
  const every = `every ${config.every} ${config.unit.toLowerCase()}`;
  const start = `start ${config.startAfterDays} day${config.startAfterDays === 1 ? "" : "s"} after request`;
  const stop =
    config.stop === "completed"
      ? "stop when documents are completed"
      : config.stop === "due"
        ? "stop on due date"
        : config.stop === "after"
          ? `stop after ${config.stopAfterCount} reminders`
          : "never stop";
  const weekends = config.exceptWeekendsAndHolidays
    ? " · except weekends and holidays"
    : "";
  return `Custom · ${every} · ${start} · ${stop}${weekends}`;
}

const NOTIFY_BY_OPTIONS: {
  id: RequestNotifyMethod;
  label: string;
  icon: typeof Mail;
}[] = [
  { id: "Email", label: "Email", icon: Mail },
  { id: "SMS", label: "SMS", icon: MessageSquare },
];

const labelClass =
  "text-[11px] font-medium uppercase tracking-wide text-gray-500";
const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12";

export function parseDatetimeLocal(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfMinute(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  return next;
}

export function formatRequestDateTime(value: string): string {
  const parsed = parseDatetimeLocal(value);
  if (!parsed) return value.trim();
  return parsed.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export function parseStoredDateTime(value?: string): Date | null {
  if (!value?.trim()) return null;
  const local = parseDatetimeLocal(value);
  if (local) return local;

  const slash = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})\s*(am|pm)?)?/i,
  );
  if (slash) {
    let hour = slash[4] ? Number(slash[4]) : 9;
    const minute = slash[5] ? Number(slash[5]) : 0;
    const ap = slash[6]?.toLowerCase();
    if (ap === "pm" && hour < 12) hour += 12;
    if (ap === "am" && hour === 12) hour = 0;
    return new Date(
      Number(slash[3]),
      Number(slash[2]) - 1,
      Number(slash[1]),
      hour,
      minute,
    );
  }

  const named = value.match(
    /^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})(?:,?\s*)?(\d{1,2})?:?(\d{2})?\s*(am|pm)?/i,
  );
  if (named && MONTHS[named[2]] !== undefined) {
    let hour = named[4] ? Number(named[4]) : 9;
    const minute = named[5] ? Number(named[5]) : 0;
    const ap = named[6]?.toLowerCase();
    if (ap === "pm" && hour < 12) hour += 12;
    if (ap === "am" && hour === 12) hour = 0;
    return new Date(Number(named[3]), MONTHS[named[2]]!, Number(named[1]), hour, minute);
  }

  return null;
}

export function parseCustomReminderLabel(label?: string): {
  enabled: boolean;
  config: CustomReminderConfig;
} {
  if (!label || /^off$/i.test(label.trim())) {
    return { enabled: false, config: { ...defaultCustomReminder } };
  }
  const config: CustomReminderConfig = { ...defaultCustomReminder };
  const every = label.match(/every (\d+)\s+(days?|weeks?)/i);
  if (every) {
    config.every = Math.max(1, Number(every[1]));
    config.unit = /^week/i.test(every[2]) ? "Weeks" : "Days";
  }
  const start = label.match(/start (\d+)\s+days?/i);
  if (start) config.startAfterDays = Math.max(0, Number(start[1]));
  const after = label.match(/stop after (\d+)/i);
  if (after) {
    config.stop = "after";
    config.stopAfterCount = Math.max(1, Number(after[1]));
  } else if (/stop on due/i.test(label)) {
    config.stop = "due";
  } else if (/never stop/i.test(label)) {
    config.stop = "never";
  } else {
    config.stop = "completed";
  }
  config.exceptWeekendsAndHolidays = /except weekends/i.test(label);
  return { enabled: true, config };
}

export function formatRequestDueDate(value: string): string {
  const parsed = parseDatetimeLocal(value);
  if (!parsed) return "";
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${parsed.getFullYear()}`;
}

export function validateRequestSchedule(
  dueDate: string,
  reminderDate: string,
): Partial<Record<"dueDate" | "reminderDate", string>> {
  const errors: Partial<Record<"dueDate" | "reminderDate", string>> = {};
  const now = startOfMinute(new Date());
  const due = parseDatetimeLocal(dueDate);

  if (!dueDate.trim()) {
    errors.dueDate = "Due date is required";
  } else if (!due) {
    errors.dueDate = "Enter a valid due date and time";
  } else if (due.getTime() < now.getTime()) {
    errors.dueDate = "Due date cannot be before the current date and time";
  }

  if (reminderDate.trim()) {
    const reminder = parseDatetimeLocal(reminderDate);
    if (!reminder) {
      errors.reminderDate = "Enter a valid reminder date and time";
    } else if (due && reminder.getTime() > due.getTime()) {
      errors.reminderDate = "Reminder cannot be after the due date";
    } else if (reminder.getTime() <= now.getTime()) {
      errors.reminderDate = "Reminder must be after the current date and time";
    }
  }

  return errors;
}

export function RequestScheduleCard({
  dueDate,
  reminderDate,
  customReminder,
  repeatEnabled,
  notifyBy,
  errors,
  onDueDateChange,
  onReminderDateChange,
  onCustomReminderChange,
  onRepeatEnabledChange,
  onNotifyByChange,
  className,
}: {
  dueDate: string;
  reminderDate: string;
  customReminder: CustomReminderConfig;
  repeatEnabled: boolean;
  notifyBy: RequestNotifyMethod[];
  errors?: Partial<Record<"dueDate" | "reminderDate", string>>;
  onDueDateChange: (value: string) => void;
  onReminderDateChange: (value: string) => void;
  onCustomReminderChange: (value: CustomReminderConfig) => void;
  onRepeatEnabledChange: (enabled: boolean) => void;
  onNotifyByChange: (value: RequestNotifyMethod[]) => void;
  className?: string;
}) {
  const minDueDate = toDatetimeLocalValue(startOfMinute(new Date()));
  const hasDueDate = Boolean(dueDate.trim());
  const dueLabel = parseDatetimeLocal(dueDate)?.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  function patchCustom(patch: Partial<CustomReminderConfig>) {
    onCustomReminderChange({ ...customReminder, ...patch });
  }

  function toggleNotify(method: RequestNotifyMethod) {
    const selected = notifyBy.includes(method);
    onNotifyByChange(
      selected ? notifyBy.filter((item) => item !== method) : [...notifyBy, method],
    );
  }

  return (
    <div
      className={cn(
        "h-full space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div>
        <label className={labelClass}>
          Due Date <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="datetime-local"
            min={minDueDate}
            className={cn(
              inputClass,
              "pl-9",
              errors?.dueDate && "border-red-300",
            )}
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
          />
        </div>
        {errors?.dueDate ? (
          <p className="mt-1 text-xs text-red-600">{errors.dueDate}</p>
        ) : null}
      </div>

      {hasDueDate ? (
        <div>
          <label className={labelClass}>Reminder Date</label>
          <div className="relative mt-1">
            <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="datetime-local"
              min={minDueDate}
              max={dueDate}
              className={cn(
                inputClass,
                "pl-9",
                errors?.reminderDate && "border-red-300",
              )}
              value={reminderDate}
              onChange={(e) => onReminderDateChange(e.target.value)}
            />
          </div>
          {errors?.reminderDate ? (
            <p className="mt-1 text-xs text-red-600">{errors.reminderDate}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Choose a time after now and no later than the due date.
            </p>
          )}
        </div>
      ) : null}

      <div>
        <label className={labelClass}>Repeat</label>
        <div
          className={cn(
            "mt-1 flex items-center justify-between rounded-md border px-3 py-2",
            hasDueDate
              ? "border-violet-100 bg-[#F8F4FC]"
              : "border-gray-100 bg-gray-50",
          )}
        >
          <button
            type="button"
            disabled={!hasDueDate}
            onClick={() => onRepeatEnabledChange(!repeatEnabled)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              repeatEnabled ? "bg-green-500" : "bg-gray-300",
              !hasDueDate && "cursor-not-allowed opacity-50",
            )}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                repeatEnabled ? "translate-x-5" : "translate-x-1",
              )}
            />
          </button>
          <span className={cn("text-sm", repeatEnabled ? "text-slate-700" : "text-gray-400")}>
            {repeatEnabled ? "On" : "Off"}
          </span>
        </div>
        {!hasDueDate ? (
          <p className="mt-1 text-xs text-gray-400">
            Set a due date to enable repeat.
          </p>
        ) : null}

        {repeatEnabled && hasDueDate ? (
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
                className="h-8 w-12 rounded-md border border-violet-200 bg-white text-center text-[13px] outline-none focus:border-[#5A32A3]"
              />
              <select
                value={customReminder.unit}
                onChange={(e) =>
                  patchCustom({ unit: e.target.value as ReminderUnit })
                }
                className="h-8 rounded-md border border-violet-200 bg-white px-2 text-[13px] outline-none focus:border-[#5A32A3]"
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
                className="h-8 w-12 rounded-md border border-violet-200 bg-white text-center text-[13px] outline-none focus:border-[#5A32A3]"
              />
              <span className="text-[12px] text-slate-600">days after request</span>
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
                      name="reminder-stop"
                      checked={customReminder.stop === id}
                      onChange={() => patchCustom({ stop: id })}
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
                          className="h-7 w-10 rounded-md border border-violet-200 bg-white text-center text-[12px] outline-none focus:border-[#5A32A3]"
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
      </div>

      <div>
        <label className={labelClass}>Notify by</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {NOTIFY_BY_OPTIONS.map((option) => {
            const active = notifyBy.includes(option.id);
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleNotify(option.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
                  active
                    ? "border-[#5A32A3] bg-[#F3ECFB] text-[#5A32A3]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Choose how the owner is notified for this request.
        </p>
      </div>

    </div>
  );
}

export { defaultRepeatConfig };
export type { RepeatConfig };
