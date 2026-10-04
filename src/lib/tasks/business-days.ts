/** Weekend + holiday skip for task / call repeat. Dates come from Settings → Holidays. */

import {
  readClosedWeekdays,
  readHolidayDates,
} from "@/lib/settings/office-calendar";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toIsoDay(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function holidaySet() {
  try {
    return new Set(readHolidayDates());
  } catch {
    return new Set<string>();
  }
}

function closedWeekdays() {
  try {
    return readClosedWeekdays();
  } catch {
    return new Set([0, 6]);
  }
}

export function isWeekend(date: Date) {
  return closedWeekdays().has(date.getDay());
}

export function isPublicHoliday(date: Date) {
  return holidaySet().has(toIsoDay(date));
}

export function isNonBusinessDay(date: Date) {
  return isWeekend(date) || isPublicHoliday(date);
}

/** Move a closed day to the next open day that is not a saved holiday. */
export function toNextBusinessDay(date: Date) {
  const next = new Date(date.getTime());
  for (let i = 0; i < 21 && isNonBusinessDay(next); i += 1) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}
