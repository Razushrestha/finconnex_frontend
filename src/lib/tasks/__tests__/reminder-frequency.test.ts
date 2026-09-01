import { describe, expect, it } from "vitest";
import {
  availableReminderCustomUnits,
  availableReminderFrequencies,
  defaultReminderRepeatRule,
  formatTaskRepeatSummary,
  listReminderOccurrences,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import { stopPendingReminders } from "@/lib/tasks/reminder-series";
import { createTaskReminder } from "@/lib/tasks/types";

function rule(preset: ReminderRepeatRule["preset"]): ReminderRepeatRule {
  return { ...defaultReminderRepeatRule, preset };
}

function ymd(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

describe("reminder frequency options by date window", () => {
  it("hides weekly, monthly, and yearly when the gap is 1-2 days", () => {
    const first = new Date(2026, 8, 7, 12, 9, 0);
    const due = new Date(2026, 8, 9, 12, 9, 0);
    expect(availableReminderFrequencies(first, due)).toEqual([
      "None",
      "Daily",
      "Custom",
    ]);
    expect(availableReminderCustomUnits(first, due).map((unit) => unit.id)).toEqual([
      "days",
    ]);
  });

  it("shows weekly once there are at least 7 days", () => {
    const first = new Date(2026, 8, 1, 10, 0, 0);
    const due = new Date(2026, 8, 8, 10, 0, 0);
    expect(availableReminderFrequencies(first, due)).toEqual([
      "None",
      "Daily",
      "Weekly",
      "Custom",
    ]);
  });
});

describe("task repeat summary", () => {
  it("describes a yearly weekday custom rule", () => {
    expect(
      formatTaskRepeatSummary({
        ...defaultReminderRepeatRule,
        preset: "custom",
        unit: "years",
        interval: 1,
        monthlyMode: "weekday",
        monthWeek: 4,
        weekdays: [5],
        yearMonth: 9,
      }),
    ).toBe("Every year on fourth Friday of October");
  });
});

describe("reminder frequency through due date", () => {
  it("daily reminds every day from first reminder through the due date", () => {
    const first = new Date(2026, 8, 1, 10, 0, 0);
    const due = new Date(2026, 8, 8, 11, 47, 0);
    const dates = listReminderOccurrences(first, due, rule("daily"));
    expect(dates.map(ymd)).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
      "2026-09-07",
      "2026-09-08",
    ]);
    expect(dates.every((d) => d.getHours() === 10 && d.getMinutes() === 0)).toBe(
      true,
    );
  });

  it("weekly reminds on the first date and the due date, then stops", () => {
    const first = new Date(2026, 8, 1, 10, 0, 0);
    const due = new Date(2026, 8, 8, 11, 47, 0);
    const dates = listReminderOccurrences(first, due, rule("weekly"));
    expect(dates.map(ymd)).toEqual(["2026-09-01", "2026-09-08"]);
  });

  it("monthly only includes dates on or before the due date", () => {
    const first = new Date(2026, 8, 1, 10, 0, 0);
    const due = new Date(2026, 8, 8, 11, 47, 0);
    const dates = listReminderOccurrences(first, due, rule("monthly"));
    expect(dates.map(ymd)).toEqual(["2026-09-01"]);
  });

  it("once is only the first reminder", () => {
    const first = new Date(2026, 8, 1, 10, 0, 0);
    const due = new Date(2026, 8, 8, 11, 47, 0);
    const dates = listReminderOccurrences(first, due, rule("none"));
    expect(dates.map(ymd)).toEqual(["2026-09-01"]);
  });

  it("custom every 2 days includes a final reminder on the due date", () => {
    const first = new Date(2026, 8, 1, 10, 0, 0);
    const due = new Date(2026, 8, 8, 11, 47, 0);
    const dates = listReminderOccurrences(first, due, {
      ...rule("custom"),
      interval: 2,
      unit: "days",
      ends: "due",
    });
    expect(dates.map(ymd)).toEqual([
      "2026-09-01",
      "2026-09-03",
      "2026-09-05",
      "2026-09-07",
      "2026-09-08",
    ]);
  });

  it("custom every 3 days lands on the due date", () => {
    const first = new Date(2026, 8, 5, 10, 0, 0);
    const due = new Date(2026, 8, 20, 11, 47, 0);
    const dates = listReminderOccurrences(first, due, {
      ...rule("custom"),
      interval: 3,
      unit: "days",
      ends: "due",
    });
    expect(dates.map(ymd)).toEqual([
      "2026-09-05",
      "2026-09-08",
      "2026-09-11",
      "2026-09-14",
      "2026-09-17",
      "2026-09-20",
    ]);
  });

  it("custom every 2 weeks lands on the due date", () => {
    const first = new Date(2026, 8, 2, 10, 0, 0);
    const due = new Date(2026, 8, 30, 11, 47, 0);
    const dates = listReminderOccurrences(first, due, {
      ...rule("custom"),
      interval: 2,
      unit: "weeks",
      ends: "due",
    });
    expect(dates.map(ymd)).toEqual([
      "2026-09-02",
      "2026-09-16",
      "2026-09-30",
    ]);
  });

  it("stops leftover pending reminders when the task is completed", () => {
    const reminders = [
      createTaskReminder({ date: "2026-09-01", time: "10:00", status: "Pending" }),
      createTaskReminder({ date: "2026-09-04", time: "10:00", status: "Completed" }),
      createTaskReminder({ date: "2026-09-08", time: "10:00", status: "Pending" }),
    ];
    const next = stopPendingReminders(reminders);
    expect(next?.map((item) => item.status)).toEqual([
      "Stopped",
      "Completed",
      "Stopped",
    ]);
  });
});
