import type { AvailabilityLimitsValues } from "@/components/booking/AvailabilityLimitsStep";
import {
  addCrmScheduleOverride,
  resolveCrmBookingHosts,
  listCrmHostSchedules,
  removeCrmScheduleOverride,
  saveCrmHostSchedule,
  updateCrmBookingHost,
  type CrmAvailabilitySchedule,
  type CrmAvailabilityWindow,
} from "@/lib/booking/api";
import { isUuid } from "@/lib/activity-timeline/auth";
import { ianaTimezoneFromLabel } from "@/lib/booking/timezones";
import {
  WEEKDAYS,
  type AvailabilityRule,
  type Weekday,
} from "@/lib/booking/types";

const DAY_INDEX: Record<Weekday, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const INDEX_DAY = Object.fromEntries(
  Object.entries(DAY_INDEX).map(([day, index]) => [index, day]),
) as Record<number, Weekday>;

function hhmmToMinute(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part) || 0);
  return Math.min(24 * 60, Math.max(0, hours * 60 + minutes));
}

function minuteToHhmm(minute: number) {
  const safe = Math.max(0, Math.min(24 * 60, minute));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function weeklyToApiRules(rules: AvailabilityRule[]): CrmAvailabilityWindow[] {
  return rules
    .filter((rule) => rule.enabled)
    .map((rule) => {
      const startMinute = hhmmToMinute(rule.start);
      const endMinute = Math.max(startMinute + 15, hhmmToMinute(rule.end));
      return {
        dayOfWeek: DAY_INDEX[rule.day],
        startMinute,
        endMinute: Math.min(24 * 60, endMinute),
      };
    });
}

export function apiRulesToWeekly(rules: CrmAvailabilityWindow[]): AvailabilityRule[] {
  return WEEKDAYS.map((day) => {
    const hit = rules.find((rule) => INDEX_DAY[rule.dayOfWeek] === day);
    if (!hit) {
      return { day, enabled: false, start: "09:00", end: "17:00" };
    }
    return {
      day,
      enabled: true,
      start: minuteToHhmm(hit.startMinute),
      end: minuteToHhmm(hit.endMinute),
    };
  });
}

function eachDate(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return dates;
  let guard = 0;
  while (cursor.getTime() <= last.getTime() && guard < 62) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }
  return dates;
}

function limitsFromSchedule(schedule: CrmAvailabilitySchedule) {
  const tagged = schedule.overrides
    .filter((row) => row.reason.startsWith("limit:"))
    .sort((a, b) => a.date.localeCompare(b.date));
  const groups: AvailabilityLimitsValues["customLimits"] = [];
  for (const row of tagged) {
    const [, slotsPerEvent = "No limit", slotsPerCustomer = "No limit"] =
      row.reason.split(":");
    const previous = groups[groups.length - 1];
    const previousEnd = previous
      ? new Date(`${previous.end}T00:00:00Z`)
      : null;
    const nextDay = previousEnd
      ? new Date(previousEnd.getTime() + 86_400_000).toISOString().slice(0, 10)
      : "";
    if (
      previous &&
      previous.slotsPerEvent === slotsPerEvent &&
      previous.slotsPerCustomer === slotsPerCustomer &&
      nextDay === row.date
    ) {
      previous.end = row.date;
      continue;
    }
    groups.push({
      id: row.id || `limit-${row.date}`,
      start: row.date,
      end: row.date,
      slotsPerEvent,
      slotsPerCustomer,
    });
  }
  return groups;
}

export async function loadConsultationAvailability(input: {
  names: string[];
  userIds?: Record<string, string>;
}): Promise<Partial<AvailabilityLimitsValues> | null> {
  const hosts = await resolveCrmBookingHosts(
    input.names.map((name) => ({
      name,
      userId: input.userIds?.[name],
    })),
    false,
  ).catch(() => []);
  if (!hosts.length) return null;

  const schedules = await Promise.all(
    hosts.map(async (host) => {
      const rows = await listCrmHostSchedules(host!.id).catch(() => []);
      const schedule =
        rows.find((row) => row.isDefault) ?? rows[0] ?? null;
      return { host: host!, schedule };
    }),
  );
  const first = schedules.find((row) => row.schedule?.rules.length)?.schedule;
  const userHours: AvailabilityLimitsValues["userHours"] = {};
  for (const row of schedules) {
    if (!row.schedule) continue;
    userHours[row.host.name] = apiRulesToWeekly(row.schedule.rules);
  }
  const limit = hosts.find((host) => host?.dailyBookingLimit != null)
    ?.dailyBookingLimit;
  const customLimits = schedules.flatMap((row) =>
    row.schedule ? limitsFromSchedule(row.schedule) : [],
  );

  return {
    weekly: first ? apiRulesToWeekly(first.rules) : undefined,
    userHours,
    slotsPerEvent: limit != null ? String(limit) : "No limit",
    customLimits,
    defaultHours: true,
    userSpecificHours: Object.keys(userHours).length > 0,
  };
}

export async function syncConsultationAvailability(input: {
  names: string[];
  userIds?: Record<string, string>;
  values: AvailabilityLimitsValues;
  timezone?: string;
}): Promise<string[]> {
  const hosts = await resolveCrmBookingHosts(
    input.names.map((name) => ({
      name,
      userId: input.userIds?.[name],
    })),
  );
  if (!hosts.length) {
    throw new Error(
      "No bookable host was found for the assigned consultants.",
    );
  }

  const dailyBookingLimit =
    input.values.slotsPerEvent === "No limit"
      ? null
      : Number(input.values.slotsPerEvent);

  for (const host of hosts) {
    const specific = input.values.userHours[host!.name];
    const source =
      input.values.userSpecificHours && specific?.some((rule) => rule.enabled)
        ? specific
        : input.values.weekly;
    const existing = await listCrmHostSchedules(host!.id);
    const current =
      existing.find((row) => row.isDefault) ?? existing[0] ?? null;
    const saved = await saveCrmHostSchedule(host!.id, {
      scheduleId: current?.id,
      name: "Working hours",
      timezone: input.timezone
        ? ianaTimezoneFromLabel(input.timezone)
        : host!.timezone || current?.timezone || "Australia/Sydney",
      isDefault: true,
      rules: weeklyToApiRules(source),
    });
    const scheduleId = isUuid(saved.id) ? saved.id : current?.id || "";
    const fresh = await listCrmHostSchedules(host!.id);
    const schedule =
      fresh.find((row) => row.id === scheduleId) ?? fresh[0] ?? null;
    await replaceLimitOverrides(scheduleId, schedule?.overrides ?? [], input.values);
    await updateCrmBookingHost(host!.id, {
      isConsultant: true,
      dailyBookingLimit: Number.isFinite(dailyBookingLimit)
        ? dailyBookingLimit
        : null,
    });
  }

  return hosts.map((host) => host!.id);
}

async function replaceLimitOverrides(
  scheduleId: string,
  overrides: CrmAvailabilitySchedule["overrides"],
  values: AvailabilityLimitsValues,
) {
  if (!isUuid(scheduleId)) return;
  for (const limit of values.customLimits) {
    if (
      limit.start &&
      limit.end &&
      eachDate(limit.start, limit.end).length < daysBetween(limit.start, limit.end)
    ) {
      throw new Error("Custom date limits can cover at most 62 days.");
    }
  }
  for (const override of overrides) {
    if (!override.reason.startsWith("limit:") || !override.id) continue;
    await removeCrmScheduleOverride(scheduleId, override.id).catch(() => undefined);
  }
  for (const limit of values.customLimits) {
    for (const date of eachDate(limit.start, limit.end)) {
      await addCrmScheduleOverride(scheduleId, {
        date,
        isUnavailable: false,
        startMinute: 9 * 60,
        endMinute: 17 * 60,
        reason: `limit:${limit.slotsPerEvent}:${limit.slotsPerCustomer}`,
      });
    }
  }
}

function daysBetween(start: string, end: string) {
  const from = new Date(`${start}T00:00:00Z`).getTime();
  const to = new Date(`${end}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
  return Math.floor((to - from) / 86_400_000) + 1;
}
