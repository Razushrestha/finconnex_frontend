import { describe, expect, it } from "vitest";
import {
  allTimezoneOptions,
  formatUtcOffset,
  timezoneOptionLabel,
  utcOffsetMinutes,
} from "@/lib/booking/all-timezones";

const OCT = new Date("2026-10-06T00:00:00Z");
const JUN = new Date("2026-06-15T00:00:00Z");

describe("all booking time zones", () => {
  it("lists every IANA zone plus UTC, ordered from UTC-12 to UTC+14", () => {
    const options = allTimezoneOptions([], OCT);
    expect(options.length).toBeGreaterThan(300);
    expect(options.some((o) => o.value === "UTC")).toBe(true);
    const offsets = options.map((o) => o.offsetMinutes);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    expect(offsets[0]).toBe(-12 * 60);
    expect(offsets[offsets.length - 1]).toBe(14 * 60);
    expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
  });

  it("labels with the current UTC offset, including half and quarter hours", () => {
    expect(timezoneOptionLabel("Asia/Kathmandu", OCT)).toBe("UTC+05:45 · Asia/Kathmandu");
    expect(timezoneOptionLabel("America/St_Johns", OCT)).toBe("UTC-02:30 · America/St Johns");
    expect(timezoneOptionLabel("UTC", OCT)).toBe("UTC+00:00 · UTC");
    // IANA's fixed offsets read backwards; the label says what they are.
    expect(timezoneOptionLabel("Etc/GMT+12", OCT)).toBe("UTC-12:00 · fixed offset");
    expect(timezoneOptionLabel("Etc/GMT-14", OCT)).toBe("UTC+14:00 · fixed offset");
  });

  it("follows daylight saving", () => {
    expect(utcOffsetMinutes("Australia/Sydney", OCT)).toBe(11 * 60);
    expect(utcOffsetMinutes("Australia/Sydney", JUN)).toBe(10 * 60);
    expect(formatUtcOffset(-210)).toBe("UTC-03:30");
  });

  it("shows renamed zones once, under their current name, and drops invalid ones", () => {
    const options = allTimezoneOptions(["Asia/Katmandu", "Not/A_Zone", "Asia/Calcutta"], OCT);
    expect(options.filter((o) => o.value === "Asia/Kathmandu")).toHaveLength(1);
    expect(options.filter((o) => o.value === "Asia/Kolkata")).toHaveLength(1);
    expect(options.some((o) => o.value === "Asia/Katmandu" || o.value === "Asia/Calcutta")).toBe(false);
    expect(options.some((o) => o.value === "Not/A_Zone")).toBe(false);
  });
});
