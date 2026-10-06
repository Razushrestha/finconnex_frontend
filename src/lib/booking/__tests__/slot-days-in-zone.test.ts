import { describe, expect, it } from "vitest";
import { slotDaysInZone, timeInZone } from "@/lib/booking/public-crm";

describe("slots re-read in the guest's time zone", () => {
  // 5:15 PM Sydney on 7 Oct (UTC+11) is 06:15 UTC.
  const days = new Map([
    ["2026-10-07", [{ startAt: "2026-10-07T06:15:00.000Z" }, { startAt: "2026-10-06T22:00:00.000Z" }]],
  ]);

  it("shifts the clock by the zone difference, with no request", () => {
    expect(timeInZone("2026-10-07T06:15:00.000Z", "Australia/Sydney")).toBe("17:15");
    expect(timeInZone("2026-10-07T06:15:00.000Z", "Asia/Kathmandu")).toBe("12:00");
  });

  it("moves a slot to the guest's calendar day", () => {
    // 22:00 UTC on 6 Oct is 9:00 AM on 7 Oct in Sydney but 3:45 AM on 7 Oct in
    // Kathmandu, and still 6 Oct in New York.
    const sydney = slotDaysInZone(days, "Australia/Sydney");
    expect([...sydney!.keys()]).toEqual(["2026-10-07"]);
    const ny = slotDaysInZone(days, "America/New_York");
    expect([...ny!.keys()].sort()).toEqual(["2026-10-06", "2026-10-07"]);
    expect(ny!.get("2026-10-06")!.map((s) => s.startAt)).toEqual(["2026-10-06T22:00:00.000Z"]);
  });

  it("orders each day's slots by time and drops repeats", () => {
    const repeated = new Map([
      ["a", [{ startAt: "2026-10-07T06:15:00.000Z" }]],
      ["b", [{ startAt: "2026-10-07T06:15:00.000Z" }, { startAt: "2026-10-07T05:00:00.000Z" }]],
    ]);
    const out = slotDaysInZone(repeated, "UTC")!;
    expect(out.get("2026-10-07")!.map((s) => s.startAt)).toEqual([
      "2026-10-07T05:00:00.000Z",
      "2026-10-07T06:15:00.000Z",
    ]);
  });
});
