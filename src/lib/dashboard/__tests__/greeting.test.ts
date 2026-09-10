import { describe, expect, it } from "vitest";
import {
  buildDashboardHero,
  firstNameFromUser,
  greetingPeriod,
  greetingPhrase,
  heroStatus,
  localHourInTimeZone,
  resolveUserTimeZone,
} from "@/lib/dashboard/greeting";

const quiet = {
  overdueTasks: 0,
  appointmentsToday: 0,
  urgentOpportunities: 0,
};

describe("greeting engine", () => {
  it("maps local hours to the CRM greeting windows", () => {
    expect(greetingPeriod(4.9)).toBe("late");
    expect(greetingPeriod(5)).toBe("morning");
    expect(greetingPeriod(11)).toBe("morning");
    expect(greetingPeriod(12)).toBe("afternoon");
    expect(greetingPeriod(16)).toBe("afternoon");
    expect(greetingPeriod(17)).toBe("evening");
    expect(greetingPeriod(20)).toBe("evening");
    expect(greetingPeriod(21)).toBe("late");
    expect(greetingPeriod(2)).toBe("late");
    expect(greetingPhrase("late")).toBe("Welcome back");
  });

  it("uses each user's timezone, not a shared server clock", () => {
    const utc = new Date("2026-09-06T20:30:00.000Z");
    expect(localHourInTimeZone(utc, "Australia/Sydney")).toBe(6);
    expect(localHourInTimeZone(utc, "Australia/Perth")).toBe(4);

    const sydney = buildDashboardHero({
      now: utc,
      firstName: "Admin",
      timeZone: "Australia/Sydney",
      signals: quiet,
    });
    const perth = buildDashboardHero({
      now: utc,
      firstName: "Priya",
      timeZone: "Australia/Perth",
      signals: quiet,
    });

    expect(sydney.greeting).toBe("Good morning, Admin 👋");
    expect(perth.greeting).toBe("Welcome back, Priya 👋");
    expect(resolveUserTimeZone("Australia/Perth", "UTC")).toBe("Australia/Perth");
    expect(resolveUserTimeZone("not-a-zone", "Australia/Sydney")).toBe(
      "Australia/Sydney",
    );
  });

  it("greets with first name and a late-night welcome at 2:44 AM", () => {
    const hero = buildDashboardHero({
      now: new Date("2026-09-06T16:44:00.000Z"),
      firstName: "Admin",
      timeZone: "Australia/Sydney",
      signals: quiet,
    });
    expect(hero.period).toBe("late");
    expect(hero.greeting).toBe("Welcome back, Admin 👋");
    expect(hero.status).toContain("You're all caught up");
    expect(hero.status).toContain("latest CRM overview");
    expect(firstNameFromUser({ displayName: "John Smith" })).toBe("John");
  });

  it("prefers CRM data for the status line", () => {
    expect(
      heroStatus("morning", {
        overdueTasks: 8,
        appointmentsToday: 0,
        urgentOpportunities: 0,
      }),
    ).toBe("You have 8 overdue tasks that need attention today.");

    expect(
      heroStatus("morning", {
        overdueTasks: 0,
        appointmentsToday: 6,
        urgentOpportunities: 0,
      }),
    ).toBe("You have 6 appointments scheduled today.");

    expect(
      heroStatus("morning", {
        overdueTasks: 0,
        appointmentsToday: 0,
        urgentOpportunities: 3,
      }),
    ).toBe("3 urgent opportunities need attention.");

    expect(
      heroStatus("morning", {
        overdueTasks: 12,
        appointmentsToday: 4,
        urgentOpportunities: 3,
      }),
    ).toBe(
      "You have 12 overdue tasks, 4 appointments and 3 urgent opportunities today.",
    );

    expect(
      heroStatus("afternoon", {
        ...quiet,
        settlementValue: 1_120_000,
        settlementTarget: 1_000_000,
      }),
    ).toBe("Your team is 12% ahead of target this month.");
  });
});
