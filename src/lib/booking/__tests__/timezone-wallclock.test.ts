import { describe, expect, it } from "vitest";
import {
  clampBookableDate,
  dateInTimezone,
  isPastBookingDate,
} from "@/lib/booking/timezones";

describe("dateInTimezone", () => {
  it("treats 9:00 AM as Australia/Sydney wall clock, not the browser zone", () => {
    const start = dateInTimezone(
      "2026-10-03",
      "09:00",
      "GMT+10:00 Australia/Sydney (AEST)",
    );
    expect(start.toISOString()).toBe("2026-10-02T23:00:00.000Z");
  });
});

describe("bookable dates", () => {
  const now = new Date("2026-09-30T12:00:00+10:00");

  it("rejects calendar days before today in the booking timezone", () => {
    expect(
      isPastBookingDate("2026-09-03", "Australia/Sydney", now),
    ).toBe(true);
    expect(
      isPastBookingDate("2026-09-30", "Australia/Sydney", now),
    ).toBe(false);
    expect(
      isPastBookingDate("2026-10-01", "Australia/Sydney", now),
    ).toBe(false);
  });

  it("clamps a backdated picker value to today", () => {
    expect(
      clampBookableDate("2026-09-03", "Australia/Sydney", now),
    ).toBe("2026-09-30");
  });
});
