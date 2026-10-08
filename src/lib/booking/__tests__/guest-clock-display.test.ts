import { afterEach, describe, expect, it } from "vitest";

import {
  guestClockDisplayRange,
  setBookingDisplayZone,
} from "@/lib/booking/dashboard";

afterEach(() => setBookingDisplayZone(null));

const kathmanduGuest = {
  title: "Test 2 Rounding",
  dateIso: "2026-10-08",
  startHHmm: "03:45",
  durationMinutes: 30,
  timeZone: "Asia/Kathmandu",
  updatedAt: "2026-10-08T00:00:00.000Z",
  status: "scheduled",
};

describe("guest clocks on the booking dashboard", () => {
  it("shows a Kathmandu guest's 3:45 am on a Sydney host's clock as 9:00 am", () => {
    setBookingDisplayZone("Australia/Sydney");
    expect(guestClockDisplayRange(kathmanduGuest)).toEqual({
      start: "2026-10-08T09:00",
      end: "2026-10-08T09:30",
    });
  });

  it("keeps a clock with no zone on its own digits", () => {
    setBookingDisplayZone("Australia/Sydney");
    const { timeZone: _zone, ...noZone } = kathmanduGuest;
    void _zone;
    expect(guestClockDisplayRange(noZone).start).toBe("2026-10-08T03:45");
  });
});

describe("CRM meetings on the booking dashboard", () => {
  it("reads a meeting's instant on the host's clock, not this browser's", async () => {
    const { meetingToAppointment } = await import("@/lib/booking/dashboard");
    setBookingDisplayZone("Australia/Sydney");
    const row = meetingToAppointment({
      id: "m1",
      title: "Hello",
      attendees: [],
      // 9:00 am in Sydney; display text formatted on a Kathmandu browser.
      startAt: "2026-10-08T22:00:00.000Z",
      endAt: "2026-10-08T22:30:00.000Z",
      startDateTime: "09/10/2026, 3:45 am",
      endDateTime: "09/10/2026, 4:15 am",
    } as unknown as Parameters<typeof meetingToAppointment>[0]);
    expect(row.start).toBe("2026-10-09T09:00");
    expect(row.end).toBe("2026-10-09T09:30");
  });
});
