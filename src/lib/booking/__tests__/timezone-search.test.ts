import { describe, expect, it } from "vitest";
import { filterZones } from "@/components/booking/TimeZonePicker";
import { allTimezoneOptions } from "@/lib/booking/all-timezones";

const options = allTimezoneOptions([], new Date("2026-10-07T00:00:00Z"));
const values = (q: string) => filterZones(options, q).map((o) => o.value);

describe("time zone search", () => {
  it("finds a city by part of its name, spaces or underscores alike", () => {
    expect(values("kath")).toEqual(["Asia/Kathmandu"]);
    expect(values("new york")).toContain("America/New_York");
    expect(values("SYDNEY")).toContain("Australia/Sydney");
  });

  it("finds zones by UTC offset", () => {
    expect(values("+5:45")).toEqual(["Asia/Kathmandu"]);
    expect(values("utc+11")).toContain("Australia/Sydney");
    expect(values("+5:30")).toContain("Asia/Kolkata");
    // No sign: both directions.
    const five = values("5");
    expect(five).toEqual(expect.arrayContaining(["Asia/Karachi", "America/Lima"]));
  });

  it("lists everything for an empty search and nothing for nonsense", () => {
    expect(values("").length).toBe(options.length);
    expect(values("zzzz")).toEqual([]);
  });
});
