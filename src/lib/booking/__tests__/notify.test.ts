import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATIONS,
  enabledNotifyChannels,
  interpolateNotify,
  mergeNotificationPrefs,
  notificationRowFor,
} from "@/lib/booking/notify-prefs";

describe("booking notification prefs", () => {
  it("keeps purple confirmed channels as email, in-app, and SMS by default", () => {
    const row = notificationRowFor(undefined, "confirmed");
    expect(enabledNotifyChannels(row)).toEqual(["Email", "In-app", "SMS"]);
  });

  it("does not send disabled follow-up channels", () => {
    const row = notificationRowFor(undefined, "followup");
    expect(enabledNotifyChannels(row)).toEqual([]);
  });

  it("honours toggled-off email on a saved consultation", () => {
    const prefs = mergeNotificationPrefs(
      DEFAULT_NOTIFICATIONS.map((row) =>
        row.id === "confirmed"
          ? { ...row, channels: { ...row.channels, Email: false, "In-app": true, SMS: false } }
          : row,
      ),
    );
    expect(enabledNotifyChannels(notificationRowFor(prefs, "confirmed"))).toEqual([
      "In-app",
    ]);
  });

  it("fills appointment tokens in email copy", () => {
    const text = interpolateNotify(
      "Hi {{contact.first_name}}, {{appointment.title}} at {{datetime}}",
      {
        name: "Ada Lovelace",
        firstName: "Ada",
        email: "ada@example.com",
        phone: "+61400000000",
        datetime: "Fri 18 Sep · 10:00 - 10:30",
        location: "Zoom",
        title: "Discovery",
        timezone: "Australia/Sydney",
        owner: "Sam",
        ownerEmail: "sam@finconnex.com",
      },
    );
    expect(text).toBe("Hi Ada, Discovery at Fri 18 Sep · 10:00 - 10:30");
  });
});
