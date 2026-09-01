/** Expand reminder frequency into concrete dates through the due date. */

import {
  createTaskReminder,
  reminderFrequencyLabel,
  type ReminderNotifyOption,
  type ReminderRepeatType,
  type TaskReminder,
} from "@/lib/tasks/types";
import {
  listReminderOccurrences,
  nextReminderOccurrence,
  ruleFromLegacyRepeatType,
  toLegacyRepeatType,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import type { NotificationMethod, ReminderType } from "@/lib/reminders/types";

export function reminderPartsFromDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function parseReminderDateTime(
  date: string,
  time?: string,
): Date | null {
  if (!date.trim()) return null;
  const parsed = new Date(`${date}T${time || "00:00"}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function reminderSameSlot(a: TaskReminder, b: { date: string; time: string }) {
  return a.date === b.date && a.time === b.time;
}

export function stopPendingReminders(
  reminders?: TaskReminder[],
): TaskReminder[] | undefined {
  if (!reminders) return reminders;
  return reminders.map((item) =>
    (item.status ?? "Pending") === "Pending"
      ? { ...item, status: "Stopped" as const }
      : item,
  );
}

function storedRule(rule: ReminderRepeatRule): ReminderRepeatRule | undefined {
  if (rule.preset === "none") return undefined;
  return { ...rule, weekdays: [...rule.weekdays] };
}

export function expandTaskReminder(
  first: TaskReminder,
  due: Date | null,
): TaskReminder[] {
  const at = parseReminderDateTime(first.date, first.time);
  if (!at) return [first];
  const rule =
    first.repeatRule ??
    ruleFromLegacyRepeatType(first.repeatType ?? "None");
  const dates = listReminderOccurrences(at, due, rule);
  if (dates.length === 0) return [];
  const sequenceId = first.sequenceId ?? first.id;
  return dates.map((occurrence, index) => {
    const parts = reminderPartsFromDate(occurrence);
    return createTaskReminder({
      ...first,
      id: index === 0 ? first.id : undefined,
      date: parts.date,
      time: parts.time,
      status: "Pending",
      sequenceId,
      occurrenceIndex: index + 1,
      spawnedNextId: undefined,
      nextScheduledLabel: undefined,
      completedAt: undefined,
    });
  });
}

export function mergeReminderSeries(
  existing: TaskReminder[],
  next: TaskReminder,
  due: Date | null,
  mode: "add" | "replace",
): TaskReminder[] {
  const series = expandTaskReminder(next, due);
  if (mode === "add") return [...existing, ...series];
  const seq = next.sequenceId ?? next.id;
  const kept = existing.filter((row) => {
    if (row.id === next.id) return false;
    const sameSeries = (row.sequenceId ?? row.id) === seq;
    return !(sameSeries && (row.status ?? "Pending") === "Pending");
  });
  return [...kept, ...series];
}

export function buildRemindersFromSchedule(input: {
  first: Date;
  due: Date | null;
  rule: ReminderRepeatRule;
  notify: ReminderNotifyOption;
  notificationMethod: NotificationMethod;
  type?: ReminderType;
}): TaskReminder[] {
  const parts = reminderPartsFromDate(input.first);
  const repeatType: ReminderRepeatType = toLegacyRepeatType(input.rule);
  const seed = createTaskReminder({
    type: input.type ?? "Task Due",
    date: parts.date,
    time: parts.time,
    notificationMethod: input.notificationMethod,
    notify: input.notify,
    repeatType,
    repeatRule: storedRule(input.rule),
    status: "Pending",
    occurrenceIndex: 1,
  });
  return expandTaskReminder(seed, input.due);
}

export function frequencyCaption(type?: ReminderRepeatType) {
  if (!type || type === "None") return "";
  return reminderFrequencyLabel(type);
}

export { nextReminderOccurrence };
