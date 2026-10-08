import {
  loadSettingsValues,
  saveSettingsValues,
  type SettingsValues,
} from "@/lib/settings/settings-store";

const HOURS_KEY = "organization/business-hours";
const HOLIDAYS_KEY = "organization/holidays";
/** Mirrored too: meeting and booking forms read the office address from it. */
const COMPANY_PROFILE_KEY = "organization/company-profile";

const WEEKDAY_NAMES: Array<[string, number]> = [
  ["sunday", 0],
  ["monday", 1],
  ["tuesday", 2],
  ["wednesday", 3],
  ["thursday", 4],
  ["friday", 5],
  ["saturday", 6],
];

/** Dates from a holidays textarea. Names after the date are ignored. */
export function parseHolidayDates(raw: string): string[] {
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d{4}-\d{2}-\d{2})\b/);
    if (match) seen.add(match[1]!);
  }
  return [...seen].sort();
}

/** Weekdays the office is closed. Empty or "Monday – Friday" means Saturday and Sunday. */
export function closedWeekdaysFromBusinessDays(raw: string): Set<number> {
  const text = raw.trim().toLowerCase().replace(/[–—]/g, "-");
  if (!text || text.includes("weekday")) return new Set([0, 6]);
  if (/monday\s*-\s*friday/.test(text) && !text.includes("saturday") && !text.includes("sunday")) {
    return new Set([0, 6]);
  }
  const open = new Set<number>();
  for (const [name, day] of WEEKDAY_NAMES) {
    if (text.includes(name)) open.add(day);
  }
  if (!open.size) return new Set([0, 6]);
  return new Set(WEEKDAY_NAMES.map(([, day]) => day).filter((day) => !open.has(day)));
}

export function readHolidayDates(): string[] {
  const page = loadSettingsValues(HOLIDAYS_KEY);
  if (page.observe === false) return [];
  return parseHolidayDates(String(page.dates ?? ""));
}

export function readClosedWeekdays(): Set<number> {
  const page = loadSettingsValues(HOURS_KEY);
  return closedWeekdaysFromBusinessDays(String(page.businessDays ?? ""));
}

/** Copy CRM catalog pages into the local settings store without an audit row. */
export function mirrorOfficeCalendar(
  catalog: Record<string, SettingsValues> | null | undefined,
) {
  if (!catalog) return;
  for (const key of [HOURS_KEY, HOLIDAYS_KEY, COMPANY_PROFILE_KEY]) {
    const page = catalog[key];
    if (!page || typeof page !== "object") continue;
    const current = loadSettingsValues(key);
    if (JSON.stringify(current) === JSON.stringify(page)) continue;
    saveSettingsValues(key, page, {
      path: `/settings/${key}`,
      title: key,
      audit: false,
    });
  }
}
