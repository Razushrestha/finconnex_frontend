/** Recurring reminder rules for create-task (and stored on TaskReminder.repeatRule). */

import { toNextBusinessDay } from "@/lib/tasks/business-days";

export type ReminderRepeatPreset =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly"
  | "custom"
  | "afterCompletion";

export type ReminderRepeatUnit = "days" | "weeks" | "months" | "years";
export type ReminderRepeatEnds = "never" | "on" | "after" | "due";
export type ReminderUntilChoice = "due" | "on" | "never";

export const REMINDER_CUSTOM_UNITS: {
  id: Exclude<ReminderRepeatUnit, "years">;
  label: string;
}[] = [
  { id: "days", label: "Days" },
  { id: "weeks", label: "Weeks" },
  { id: "months", label: "Months" },
];

export function reminderUntilChoice(rule: ReminderRepeatRule): ReminderUntilChoice {
  if (rule.ends === "on") return "on";
  if (rule.ends === "never") return "never";
  return "due";
}
export type MonthlyRepeatMode = "day" | "weekday";
export type MonthlyWeekIndex = 1 | 2 | 3 | 4 | -1;

export interface ReminderRepeatRule {
  preset: ReminderRepeatPreset;
  interval: number;
  unit: ReminderRepeatUnit;
  weekdays: number[];
  ends: ReminderRepeatEnds;
  endDate: string;
  afterCount: number;
  /** Clock time (HH:mm) used for the next after-completion reminder. */
  time?: string;
  /** Skip Sat/Sun and public holidays; run on the next business day. */
  exceptWeekendsAndHolidays?: boolean;
  monthlyMode?: MonthlyRepeatMode;
  monthDay?: number;
  monthWeek?: MonthlyWeekIndex;
  yearMonth?: number;
}

export const defaultReminderRepeatRule: ReminderRepeatRule = {
  preset: "none",
  interval: 2,
  unit: "days",
  weekdays: [],
  ends: "never",
  endDate: "",
  afterCount: 10,
  exceptWeekendsAndHolidays: false,
  monthlyMode: "day",
  monthDay: 1,
  monthWeek: 1,
  yearMonth: 0,
};

export const MONTH_WEEK_OPTIONS: { id: MonthlyWeekIndex; label: string }[] = [
  { id: 1, label: "First" },
  { id: 2, label: "Second" },
  { id: 3, label: "Third" },
  { id: 4, label: "Fourth" },
  { id: -1, label: "Last" },
];

export const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

export const YEAR_MONTH_OPTIONS: { id: number; label: string }[] = [
  { id: 0, label: "January" },
  { id: 1, label: "February" },
  { id: 2, label: "March" },
  { id: 3, label: "April" },
  { id: 4, label: "May" },
  { id: 5, label: "June" },
  { id: 6, label: "July" },
  { id: 7, label: "August" },
  { id: 8, label: "September" },
  { id: 9, label: "October" },
  { id: 10, label: "November" },
  { id: 11, label: "December" },
];

export const REPEAT_PRESET_OPTIONS: {
  id: ReminderRepeatPreset;
  label: string;
}[] = [
  { id: "none", label: "Does not repeat" },
  { id: "daily", label: "Every day" },
  { id: "weekly", label: "Every week" },
  { id: "monthly", label: "Every month" },
  { id: "yearly", label: "Every year" },
  { id: "custom", label: "Custom" },
  { id: "afterCompletion", label: "After Completion" },
];

export const REPEAT_UNIT_OPTIONS: {
  id: ReminderRepeatUnit;
  label: string;
}[] = [
  { id: "days", label: "Days" },
  { id: "weeks", label: "Weeks" },
  { id: "months", label: "Months" },
  { id: "years", label: "Years" },
];

export const REPEAT_WEEKDAYS: { id: number; label: string; longLabel: string }[] = [
  { id: 1, label: "Mon", longLabel: "Monday" },
  { id: 2, label: "Tue", longLabel: "Tuesday" },
  { id: 3, label: "Wed", longLabel: "Wednesday" },
  { id: 4, label: "Thu", longLabel: "Thursday" },
  { id: 5, label: "Fri", longLabel: "Friday" },
  { id: 6, label: "Sat", longLabel: "Saturday" },
  { id: 0, label: "Sun", longLabel: "Sunday" },
];

export function presetLabel(preset: ReminderRepeatPreset) {
  return REPEAT_PRESET_OPTIONS.find((item) => item.id === preset)?.label ?? "Does not repeat";
}

export function resolvedRepeatInterval(rule: ReminderRepeatRule): {
  interval: number;
  unit: ReminderRepeatUnit;
} {
  switch (rule.preset) {
    case "daily":
      return { interval: 1, unit: "days" };
    case "weekly":
      return { interval: 1, unit: "weeks" };
    case "biweekly":
      return { interval: 2, unit: "weeks" };
    case "monthly":
      return { interval: 1, unit: "months" };
    case "yearly":
      return { interval: 1, unit: "years" };
    case "custom":
      return { interval: Math.max(1, rule.interval || 1), unit: rule.unit };
    case "afterCompletion":
      return {
        interval: Math.max(1, rule.interval || 7),
        unit: rule.unit || "days",
      };
    default:
      return { interval: 1, unit: "days" };
  }
}

export function usesWeekdays(rule: ReminderRepeatRule) {
  return rule.preset === "custom" && rule.unit === "weeks";
}

export function calendarDaysBetween(start: Date, end: Date) {
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function availableTaskRepeatPresets(
  start: Date | null,
  due: Date | null,
  allowAfterCompletion = false,
  ignoreDueWindow = false,
): ReminderRepeatPreset[] {
  if (ignoreDueWindow && !due) {
    const options: ReminderRepeatPreset[] = [
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "custom",
    ];
    if (allowAfterCompletion) options.push("afterCompletion");
    return options;
  }
  const options: ReminderRepeatPreset[] = ["none"];
  if (!start || !due) {
    return allowAfterCompletion ? [...options, "afterCompletion"] : options;
  }
  const days = calendarDaysBetween(start, due);
  if (days >= 1) options.push("daily");
  if (days >= 7) options.push("weekly");
  options.push("monthly", "yearly");
  options.push("custom");
  if (allowAfterCompletion) options.push("afterCompletion");
  return options;
}

/** Reminder frequency options that fit the window from first reminder to due. */
export function availableReminderFrequencies(
  first: Date | null,
  due: Date | null,
): LegacyRepeatType[] {
  const options: LegacyRepeatType[] = ["None"];
  if (!first || !due) {
    options.push("Daily", "Custom");
    return options;
  }
  const days = Math.max(0, calendarDaysBetween(first, due));
  if (days >= 1) options.push("Daily");
  if (days >= 7) options.push("Weekly");
  if (days >= 28) options.push("Monthly");
  if (days >= 365) options.push("Yearly");
  options.push("Custom");
  return options;
}

export function availableReminderCustomUnits(
  first: Date | null,
  until: Date | null,
) {
  if (!first || !until) return REMINDER_CUSTOM_UNITS;
  const days = Math.max(0, calendarDaysBetween(first, until));
  return REMINDER_CUSTOM_UNITS.filter((unit) => {
    if (unit.id === "days") return true;
    if (unit.id === "weeks") return days >= 7;
    return days >= 28;
  });
}

export function availableRepeatUnits(start: Date | null, due: Date | null) {
  if (!start || !due) return REPEAT_UNIT_OPTIONS.filter((u) => u.id === "days");
  const days = calendarDaysBetween(start, due);
  return REPEAT_UNIT_OPTIONS.filter((unit) => {
    if (unit.id === "days") return days >= 1;
    if (unit.id === "weeks") return days >= 7;
    if (unit.id === "months") return days >= 28;
    return days >= 365;
  });
}

export function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function dateOnMonthDay(year: number, month: number, day: number) {
  const clamped = Math.min(Math.max(1, day), lastDayOfMonth(year, month));
  return new Date(year, month, clamped);
}

function dateOnNthWeekday(
  year: number,
  month: number,
  weekday: number,
  nth: MonthlyWeekIndex,
) {
  if (nth === -1) {
    const cursor = new Date(year, month + 1, 0);
    while (cursor.getDay() !== weekday) {
      cursor.setDate(cursor.getDate() - 1);
    }
    return cursor;
  }
  const cursor = new Date(year, month, 1);
  let seen = 0;
  while (cursor.getMonth() === month) {
    if (cursor.getDay() === weekday) {
      seen += 1;
      if (seen === nth) return new Date(cursor.getTime());
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dateOnNthWeekday(year, month, weekday, -1);
}

function monthlyOccurrence(year: number, month: number, rule: ReminderRepeatRule, start: Date) {
  if (rule.monthlyMode === "weekday") {
    const weekday = rule.weekdays[0] ?? start.getDay();
    const week = rule.monthWeek ?? 1;
    return dateOnNthWeekday(year, month, weekday, week);
  }
  return dateOnMonthDay(year, month, rule.monthDay ?? start.getDate());
}

function yearlyOccurrence(year: number, rule: ReminderRepeatRule, start: Date) {
  const month = rule.yearMonth ?? start.getMonth();
  return monthlyOccurrence(year, month, rule, start);
}

function addCalendar(date: Date, interval: number, unit: ReminderRepeatUnit) {
  const next = new Date(date.getTime());
  if (unit === "days") {
    next.setDate(next.getDate() + interval);
    return next;
  }
  if (unit === "weeks") {
    next.setDate(next.getDate() + interval * 7);
    return next;
  }
  if (unit === "months") {
    const day = next.getDate();
    next.setMonth(next.getMonth() + interval);
    if (next.getDate() < day) next.setDate(0);
    return next;
  }
  next.setFullYear(next.getFullYear() + interval);
  return next;
}

function startOfWeekMonday(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function weeksFromStart(start: Date, current: Date) {
  const a = startOfWeekMonday(start).getTime();
  const b = startOfWeekMonday(current).getTime();
  return Math.round((b - a) / (7 * 24 * 60 * 60 * 1000));
}

function withClock(date: Date, clock: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    clock.getHours(),
    clock.getMinutes(),
    0,
    0,
  );
}

function applyBusinessDay(date: Date, rule: ReminderRepeatRule, clock: Date) {
  if (!rule.exceptWeekendsAndHolidays) return date;
  return withClock(toNextBusinessDay(date), clock);
}

function endBoundary(rule: ReminderRepeatRule): Date | null {
  if (rule.preset === "afterCompletion" && rule.ends !== "on") return null;
  if (!rule.endDate) return null;
  const parsed = new Date(`${rule.endDate}T23:59:59`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function listNextReminders(
  start: Date,
  rule: ReminderRepeatRule,
  previewLimit = 5,
): Date[] {
  if (
    Number.isNaN(start.getTime()) ||
    rule.preset === "none" ||
    rule.preset === "afterCompletion"
  ) {
    return [];
  }

  const { interval, unit } = resolvedRepeatInterval(rule);
  const maxCount =
    rule.ends === "after"
      ? Math.max(1, Math.min(rule.afterCount || 1, 24))
      : previewLimit;
  const until = endBoundary(rule);
  const weekdays =
    rule.weekdays.length > 0 ? [...new Set(rule.weekdays)] : [start.getDay()];
  const results: Date[] = [];

  if (usesWeekdays(rule) && unit === "weeks") {
    const firstDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (!weekdays.includes(firstDay.getDay())) {
      firstDay.setDate(firstDay.getDate() + 1);
    }
    const first = withClock(firstDay, start);
    const cursor = new Date(firstDay.getTime());
    const guard = Math.max(800, maxCount * 8);
    for (let i = 0; i < guard && results.length < maxCount; i += 1) {
      const occurrence = applyBusinessDay(
        withClock(cursor, start),
        rule,
        start,
      );
      const inWeekCycle = weeksFromStart(first, cursor) % interval === 0;
      const weekdayOk = weekdays.includes(cursor.getDay());
      const notAfterEnd = !until || occurrence.getTime() <= until.getTime();
      if (inWeekCycle && weekdayOk && notAfterEnd) {
        results.push(occurrence);
      }
      if (until && occurrence.getTime() > until.getTime()) break;
      cursor.setDate(cursor.getDate() + 1);
    }
    return results;
  }

  if (rule.preset === "custom" && unit === "months") {
    let year = start.getFullYear();
    let month = start.getMonth();
    const startDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    ).getTime();
    const guard = Math.max(48, maxCount + 8);
    for (let i = 0; i < guard && results.length < maxCount; i += 1) {
      const raw = monthlyOccurrence(year, month, rule, start);
      const occurrence = applyBusinessDay(withClock(raw, start), rule, start);
      const afterStart = occurrence.getTime() >= startDay;
      const notAfterEnd = !until || occurrence.getTime() <= until.getTime();
      if (afterStart && notAfterEnd) results.push(occurrence);
      if (until && occurrence.getTime() > until.getTime() && afterStart) break;
      month += interval;
      if (month > 11) {
        year += Math.floor(month / 12);
        month %= 12;
      }
    }
    return results;
  }

  if (rule.preset === "custom" && unit === "years") {
    let year = start.getFullYear();
    const startDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    ).getTime();
    const guard = Math.max(48, maxCount + 8);
    for (let i = 0; i < guard && results.length < maxCount; i += 1) {
      const raw = yearlyOccurrence(year, rule, start);
      const occurrence = applyBusinessDay(withClock(raw, start), rule, start);
      const afterStart = occurrence.getTime() >= startDay;
      const notAfterEnd = !until || occurrence.getTime() <= until.getTime();
      if (afterStart && notAfterEnd) results.push(occurrence);
      if (until && occurrence.getTime() > until.getTime() && afterStart) break;
      year += interval;
    }
    return results;
  }

  let cursor = new Date(start.getTime());
  const guard = Math.max(48, maxCount + 8);
  for (let i = 0; i < guard && results.length < maxCount; i += 1) {
    if (until && cursor.getTime() > until.getTime()) break;
    const occurrence = applyBusinessDay(cursor, rule, start);
    if (!until || occurrence.getTime() <= until.getTime()) {
      results.push(occurrence);
    }
    cursor = addCalendar(cursor, interval, unit);
  }
  return results;
}

/**
 * Reminder frequency dates: first reminder through the due date (inclusive),
 * at the same clock time. Once = only the first. No due date = first only
 * (later ticks spawn until the task is completed).
 */
function sameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function listCustomReminderTicks(
  first: Date,
  until: Date | null,
  interval: number,
  unit: ReminderRepeatUnit,
  maxCount: number,
): Date[] {
  const results: Date[] = [];
  let cursor = new Date(first.getTime());
  const guard = Math.max(48, maxCount + 8);
  const step = Math.max(1, interval);
  for (let i = 0; i < guard && results.length < maxCount; i += 1) {
    if (until && cursor.getTime() > until.getTime()) break;
    results.push(new Date(cursor.getTime()));
    cursor = addCalendar(cursor, step, unit);
  }
  return results;
}

function appendFinalUntilDate(
  dates: Date[],
  until: Date | null,
  first: Date,
  maxCount: number,
): Date[] {
  if (!until) return dates;
  const finalAt = withClock(until, first);
  if (finalAt.getTime() < first.getTime()) return dates;
  const last = dates[dates.length - 1];
  if (last && (sameCalendarDay(last, finalAt) || last.getTime() >= finalAt.getTime())) {
    return dates;
  }
  return [...dates, finalAt].slice(0, maxCount);
}

export function listReminderOccurrences(
  first: Date,
  due: Date | null,
  rule: ReminderRepeatRule,
  maxCount = 366,
): Date[] {
  if (Number.isNaN(first.getTime())) return [];

  const dueOk = due && !Number.isNaN(due.getTime()) ? due : null;
  const lastTick = dueOk ? withClock(dueOk, first) : null;

  if (rule.preset === "none" || rule.preset === "afterCompletion") {
    if (lastTick && first.getTime() > lastTick.getTime()) return [];
    return [new Date(first.getTime())];
  }

  if (rule.preset === "custom") {
    const untilMode = reminderUntilChoice(rule);
    const customUntil =
      untilMode === "on" && rule.endDate
        ? new Date(`${rule.endDate}T23:59:59`)
        : untilMode === "due"
          ? dueOk
          : null;
    const untilAt =
      customUntil && !Number.isNaN(customUntil.getTime())
        ? withClock(customUntil, first)
        : null;
    const unit = rule.unit === "years" ? "months" : rule.unit;
    const ticks = listCustomReminderTicks(
      first,
      untilAt,
      Math.max(1, rule.interval || 2),
      unit,
      untilAt ? maxCount : Math.min(24, maxCount),
    );
    if (untilMode === "never" || !untilAt) return ticks;
    return appendFinalUntilDate(ticks, untilAt, first, maxCount);
  }

  if (!dueOk || !lastTick) {
    return [new Date(first.getTime())];
  }

  const bounded: ReminderRepeatRule = {
    ...rule,
    ends: "on",
    endDate: toIsoDate(dueOk),
  };
  const dates = listNextReminders(first, bounded, maxCount);
  const includeFirst =
    first.getTime() <= lastTick.getTime() &&
    (dates.length === 0 || dates[0].getTime() !== first.getTime());
  const series = includeFirst ? [new Date(first.getTime()), ...dates] : dates;
  return series.slice(0, maxCount);
}

export function nextReminderOccurrence(
  current: Date,
  due: Date | null,
  rule: ReminderRepeatRule,
): Date | null {
  const series = listReminderOccurrences(current, due, rule, 8);
  return series.find((date) => date.getTime() > current.getTime()) ?? null;
}

export function formatReminderOccurrence(date: Date) {
  const day = date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
  const time = date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} — ${time}`;
}

export type LegacyRepeatType =
  | "None"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Yearly"
  | "Custom";

export function toLegacyRepeatType(rule: ReminderRepeatRule): LegacyRepeatType {
  switch (rule.preset) {
    case "daily":
      return "Daily";
    case "weekly":
    case "biweekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    case "custom":
      return "Custom";
    default:
      return "None";
  }
}

export function ruleFromLegacyRepeatType(
  type: LegacyRepeatType,
  previous?: ReminderRepeatRule,
): ReminderRepeatRule {
  const base = previous ?? { ...defaultReminderRepeatRule };
  switch (type) {
    case "Daily":
      return { ...base, preset: "daily", weekdays: [] };
    case "Weekly":
      return { ...base, preset: "weekly", unit: "weeks", interval: 1 };
    case "Monthly":
      return { ...base, preset: "monthly", weekdays: [] };
    case "Yearly":
      return { ...base, preset: "yearly", weekdays: [] };
    case "Custom":
      return {
        ...base,
        preset: "custom",
        interval: Math.max(1, base.interval || 2),
        unit: base.unit === "years" ? "days" : base.unit || "days",
        ends:
          base.preset === "custom" &&
          (base.ends === "on" || base.ends === "never" || base.ends === "due")
            ? base.ends
            : "due",
        weekdays: [],
      };
    default:
      return { ...defaultReminderRepeatRule };
  }
}

export function afterCompletionEveryLabel(rule: ReminderRepeatRule) {
  const { interval, unit } = resolvedRepeatInterval({
    ...rule,
    preset: "afterCompletion",
  });
  if (interval === 1) {
    if (unit === "days") return "Every day";
    if (unit === "weeks") return "Every week";
    if (unit === "months") return "Every month";
    return "Every year";
  }
  return `Every ${interval} ${unit}`;
}

export function afterCompletionSummary(rule: ReminderRepeatRule) {
  return `After completion · ${afterCompletionEveryLabel(rule)}`;
}

function unitPhrase(interval: number, unit: ReminderRepeatUnit) {
  const names: Record<ReminderRepeatUnit, [string, string]> = {
    days: ["day", "days"],
    weeks: ["week", "weeks"],
    months: ["month", "months"],
    years: ["year", "years"],
  };
  const [one, many] = names[unit];
  return interval === 1 ? `Every ${one}` : `Every ${interval} ${many}`;
}

function weekdayLong(id: number) {
  return REPEAT_WEEKDAYS.find((day) => day.id === id)?.longLabel ?? "Monday";
}

function monthWeekLabel(week: MonthlyWeekIndex) {
  return MONTH_WEEK_OPTIONS.find((item) => item.id === week)?.label ?? "First";
}

/** Compact line for a saved task/call Repeat rule. */
export function formatTaskRepeatSummary(rule: ReminderRepeatRule) {
  if (rule.preset === "none") return "";
  if (rule.preset === "afterCompletion") return afterCompletionSummary(rule);
  if (rule.preset === "daily") return "Every day";
  if (rule.preset === "weekly") return "Every week";
  if (rule.preset === "biweekly") return "Every 2 weeks";
  if (rule.preset === "monthly") return "Every month";
  if (rule.preset === "yearly") return "Every year";

  const { interval, unit } = resolvedRepeatInterval(rule);
  let summary = unitPhrase(interval, unit);
  if (unit === "months" && rule.monthlyMode === "weekday") {
    summary = `${summary} on ${monthWeekLabel(rule.monthWeek ?? 1).toLowerCase()} ${weekdayLong(rule.weekdays[0] ?? 1)}`;
  } else if (unit === "years") {
    const month =
      YEAR_MONTH_OPTIONS.find((item) => item.id === (rule.yearMonth ?? 0))
        ?.label ?? "January";
    if (rule.monthlyMode === "weekday") {
      summary = `Every year on ${monthWeekLabel(rule.monthWeek ?? 1).toLowerCase()} ${weekdayLong(rule.weekdays[0] ?? 1)} of ${month}`;
    } else {
      summary = `Every year on day ${rule.monthDay ?? 1} of ${month}`;
    }
  }

  if (rule.ends === "due") summary += " until due date";
  if (rule.ends === "on" && rule.endDate) {
    const parsed = new Date(`${rule.endDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      summary += ` until ${parsed.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`;
    }
  }
  if (rule.ends === "after") {
    summary += ` · ${Math.max(1, rule.afterCount || 1)} times`;
  }
  return summary;
}

function parseRuleClock(rule: ReminderRepeatRule): { hours: number; minutes: number } {
  const match = (rule.time || "10:00").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return { hours: 10, minutes: 0 };
  return {
    hours: Math.min(23, Number(match[1])),
    minutes: Math.min(59, Number(match[2])),
  };
}

export function nextAfterCompletionAt(
  completedAt: Date,
  rule: ReminderRepeatRule,
): Date {
  const { interval, unit } = resolvedRepeatInterval({
    ...rule,
    preset: "afterCompletion",
  });
  const next = addCalendar(completedAt, interval, unit);
  const clock = parseRuleClock(rule);
  next.setHours(clock.hours, clock.minutes, 0, 0);
  return applyBusinessDay(next, rule, next);
}

export function canSpawnAfterCompletion(
  rule: ReminderRepeatRule,
  completedOccurrence: number,
  nextAt: Date,
): boolean {
  if (rule.preset !== "afterCompletion") return false;
  if (rule.ends === "after" && completedOccurrence >= Math.max(1, rule.afterCount || 1)) {
    return false;
  }
  const until = endBoundary(rule);
  if (until && nextAt.getTime() > until.getTime()) return false;
  return true;
}

export function formatNextScheduled(date: Date) {
  const day = date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
  });
  const time = date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} at ${time}`;
}
