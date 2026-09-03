"use client";

import { Calendar } from "lucide-react";
import {
  defaultReminderRepeatRule,
  formatTaskRepeatSummary,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import { ReminderSettingsCard } from "@/components/activities/tasks/ReminderSettingsCard";
import type { NotificationMethod } from "@/lib/reminders/types";
import { cn } from "@/lib/utils";

export type RequestNotifyMethod = NotificationMethod;

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

export function parseRequestRepeat(label?: string): ReminderRepeatRule {
  if (!label || /^off$/i.test(label.trim())) {
    return { ...defaultReminderRepeatRule };
  }
  const lower = label.toLowerCase();
  if (lower === "every day" || lower.startsWith("every day ")) {
    return { ...defaultReminderRepeatRule, preset: "daily" };
  }
  if (lower === "every week" || lower.startsWith("every week ")) {
    return { ...defaultReminderRepeatRule, preset: "weekly" };
  }
  if (lower.includes("every 2 weeks")) {
    return { ...defaultReminderRepeatRule, preset: "biweekly" };
  }
  if (lower === "every month" || lower.startsWith("every month ")) {
    return { ...defaultReminderRepeatRule, preset: "monthly" };
  }
  if (lower === "every year" || lower.startsWith("every year ")) {
    return { ...defaultReminderRepeatRule, preset: "yearly" };
  }
  const parsed = parseCustomReminderLabel(label);
  if (!parsed.enabled) return { ...defaultReminderRepeatRule };
  return {
    ...defaultReminderRepeatRule,
    preset: "custom",
    interval: parsed.config.every,
    unit: parsed.config.unit === "Weeks" ? "weeks" : "days",
    ends:
      parsed.config.stop === "never"
        ? "never"
        : parsed.config.stop === "after"
          ? "after"
          : "due",
    afterCount: parsed.config.stopAfterCount,
    exceptWeekendsAndHolidays: parsed.config.exceptWeekendsAndHolidays,
  };
}

export function parseNotifyBy(raw?: string[]): NotificationMethod[] {
  const allowed = new Set<NotificationMethod>([
    "Email",
    "SMS",
    "In-app",
    "Web Push",
  ]);
  const next = (raw ?? []).filter((item): item is NotificationMethod =>
    allowed.has(item as NotificationMethod),
  );
  return next.length ? next : ["Email"];
}

export function formatRequestRepeat(rule: ReminderRepeatRule) {
  if (rule.preset === "none") return "";
  return formatTaskRepeatSummary(rule);
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
  reminderEnabled,
  reminderRepeat,
  notifyBy,
  errors,
  onDueDateChange,
  onReminderDateChange,
  onReminderEnabledChange,
  onReminderRepeatChange,
  onToggleNotify,
  className,
}: {
  dueDate: string;
  reminderDate: string;
  reminderEnabled: boolean;
  reminderRepeat: ReminderRepeatRule;
  notifyBy: NotificationMethod[];
  errors?: Partial<Record<"dueDate" | "reminderDate", string>>;
  onDueDateChange: (value: string) => void;
  onReminderDateChange: (value: string) => void;
  onReminderEnabledChange: (on: boolean) => void;
  onReminderRepeatChange: (next: ReminderRepeatRule) => void;
  onToggleNotify: (method: NotificationMethod) => void;
  className?: string;
}) {
  const minDueDate = toDatetimeLocalValue(startOfMinute(new Date()));
  const hasDueDate = Boolean(dueDate.trim());

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
        <ReminderSettingsCard
          enabled={reminderEnabled}
          onEnabledChange={onReminderEnabledChange}
          reminderDate={reminderDate}
          onReminderDateChange={onReminderDateChange}
          min={minDueDate}
          max={dueDate}
          error={errors?.reminderDate}
          notifyBy={notifyBy}
          onToggleNotify={onToggleNotify}
          repeat={reminderRepeat}
          onRepeatChange={onReminderRepeatChange}
          due={parseDatetimeLocal(dueDate)}
        />
      ) : (
        <p className="text-xs text-gray-400">
          Set a due date to add a reminder.
        </p>
      )}
    </div>
  );
}
