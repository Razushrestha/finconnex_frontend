/** Weekend + holiday skip for task / call repeat. */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toIsoDay(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Common AU public holidays used when Settings → Holidays has no calendar yet. */
const PUBLIC_HOLIDAYS = new Set([
  "2026-01-01",
  "2026-01-26",
  "2026-04-03",
  "2026-04-06",
  "2026-04-25",
  "2026-06-08",
  "2026-12-25",
  "2026-12-26",
  "2026-12-28",
  "2027-01-01",
  "2027-01-26",
  "2027-03-26",
  "2027-03-29",
  "2027-04-25",
  "2027-06-14",
  "2027-12-25",
  "2027-12-26",
  "2027-12-27",
]);

export function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isPublicHoliday(date: Date) {
  return PUBLIC_HOLIDAYS.has(toIsoDay(date));
}

export function isNonBusinessDay(date: Date) {
  return isWeekend(date) || isPublicHoliday(date);
}

/** Move Saturday / Sunday / holiday to the next weekday that is not a holiday. */
export function toNextBusinessDay(date: Date) {
  const next = new Date(date.getTime());
  for (let i = 0; i < 14 && isNonBusinessDay(next); i += 1) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}
