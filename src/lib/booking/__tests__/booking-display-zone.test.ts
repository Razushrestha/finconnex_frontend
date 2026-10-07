import { afterEach, describe, expect, it } from "vitest";
import {
  bookingNow,
  instantFromBookingWallClock,
  parseAppointmentStart,
  setBookingDisplayZone,
} from "@/lib/booking/dashboard";

// The booking from the report: 22:00 UTC on 7 Oct is 3:45 AM on 8 Oct in
// Kathmandu (where the guest booked) and 9:00 AM on 8 Oct in Sydney (where
// the host works).
const BOOKED = "2026-10-07T22:00:00.000Z";

describe("admin booking screens read times on the host's zone", () => {
  afterEach(() => setBookingDisplayZone(null));

  it("shows a booking at the host's local time, whatever the browser's zone", () => {
    setBookingDisplayZone("Australia/Sydney");
    const shown = parseAppointmentStart(BOOKED);
    expect([shown.getDate(), shown.getHours(), shown.getMinutes()]).toEqual([8, 9, 0]);

    setBookingDisplayZone("Asia/Kathmandu");
    const guestSide = parseAppointmentStart(BOOKED);
    expect([guestSide.getDate(), guestSide.getHours(), guestSide.getMinutes()]).toEqual([8, 3, 45]);
  });

  it("turns a time typed on the host's clock back into the real instant", () => {
    setBookingDisplayZone("Australia/Sydney");
    const typed = new Date(2026, 9, 8, 9, 0, 0); // 8 Oct 9:00 AM, Sydney wall clock
    expect(instantFromBookingWallClock(typed).toISOString()).toBe(BOOKED);
    // Round trip through display and back.
    expect(instantFromBookingWallClock(parseAppointmentStart(BOOKED)).toISOString()).toBe(BOOKED);
  });

  it("handles a daylight-saving change (Sydney moves to UTC+11 on 4 Oct)", () => {
    setBookingDisplayZone("Australia/Sydney");
    // 3 Oct 9:00 AM Sydney is still UTC+10.
    expect(instantFromBookingWallClock(new Date(2026, 9, 3, 9, 0)).toISOString()).toBe(
      "2026-10-02T23:00:00.000Z",
    );
  });

  it("falls back to the browser's clock with no host zone, or a bad one", () => {
    setBookingDisplayZone("Not/AZone");
    expect(parseAppointmentStart(BOOKED).getTime()).toBe(Date.parse(BOOKED));
    setBookingDisplayZone(null);
    expect(instantFromBookingWallClock(new Date(2026, 9, 8, 9, 0)).getTime()).toBe(
      new Date(2026, 9, 8, 9, 0).getTime(),
    );
    expect(Math.abs(bookingNow().getTime() - Date.now())).toBeLessThan(1000);
  });
});
