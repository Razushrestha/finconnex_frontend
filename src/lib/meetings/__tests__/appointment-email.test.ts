import { describe, expect, it } from "vitest";

import { appointmentConfirmedEmail } from "@/lib/meetings/appointment-email";

const base = {
  guestName: "John Smith",
  hostName: "Mohit Chapagain",
  title: "test me",
  dateIso: "2025-10-15",
  startHHmm: "10:00",
  durationMinutes: 60,
  timeZoneLabel: "GMT+10:00 Australia/Sydney (AEST)",
};

describe("appointmentConfirmedEmail", () => {
  it("lists date, time, host, and meeting type like the confirmation design", () => {
    const { subject, html } = appointmentConfirmedEmail({
      ...base,
      meetingType: "Google Meet",
    });
    expect(subject).toBe("Your appointment is confirmed");
    expect(html).toContain("Hi John,");
    expect(html).toContain("Wednesday 15 October 2025");
    expect(html).toContain("10:00 AM – 11:00 AM (1 hour)");
    expect(html).toContain("Mohit Chapagain");
    expect(html).toContain("Online Meeting (Google Meet)");
    expect(html).toContain("A meeting link will be sent separately to your email.");
    expect(html).toContain("Add to Calendar");
    expect(html).toContain(">Reschedule</a>");
    expect(html).toContain(">Cancel</a>");
    expect(html).not.toContain("Reschedule or Cancel");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("puts the real join link in the email when there is one", () => {
    const { html, text } = appointmentConfirmedEmail({
      ...base,
      meetingType: "Google Meet",
      joinUrl: "https://meet.google.com/abc-defg-hij",
    });
    expect(html).toContain('href="https://meet.google.com/abc-defg-hij"');
    expect(html).not.toContain("will be sent separately");
    expect(text).toContain("Join meeting: https://meet.google.com/abc-defg-hij");
  });

  it("escapes names so they cannot inject markup", () => {
    const { html } = appointmentConfirmedEmail({
      ...base,
      guestName: "<b>Eve</b>",
      hostName: "A & B",
    });
    expect(html).toContain("&lt;b&gt;Eve&lt;/b&gt;");
    expect(html).toContain("A &amp; B");
  });
});
