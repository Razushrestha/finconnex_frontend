import { describe, expect, it } from "vitest";

import { normalizeNotification, notificationDestination } from "@/lib/notifications/api";

const row = {
  id: "fa26723e-fdaa-4e7c-bb5c-dccf8d4dca6b",
  type: "MEETING_REMINDER",
  title: "Test",
  status: "READ",
  createdAt: "2026-10-04T06:02:29.000Z",
};

describe("normalizeNotification", () => {
  it("never shows the row id as the notification's reference", () => {
    expect(normalizeNotification({ ...row, message: "x" }, 0).notificationId).toBe("");
  });

  it("links the lead the notification carries, to its detail page", () => {
    const n = normalizeNotification({ ...row, message: "x", leadId: "lead-9" }, 0);
    expect(n.relatedKind).toBe("Lead");
    expect(n.relatedId).toBe("lead-9");
    expect(n.relatedHref).toBe("/sales/leads/detail/lead-9");
    expect(n.relatedTo).toBe("Lead");
  });

  it("shows readable text for older booking notifications that stored a key", () => {
    const n = normalizeNotification({ ...row, message: "booking.notification.booked" }, 0);
    expect(n.message).toBe("A new booking was made on your calendar.");
  });

  it("keeps a real message as it is", () => {
    const text = "Binayak booked Test for Tue, Oct 6, 2026, 9:00 AM (Australia/Sydney).";
    expect(normalizeNotification({ ...row, message: text }, 0).message).toBe(text);
  });

  it("sends a record-less meeting reminder to meetings, not back to itself", () => {
    const n = normalizeNotification({ ...row, message: "x" }, 0);
    expect(notificationDestination(n)).toEqual({
      href: "/activities/meetings",
      label: "Go to meetings",
    });
  });

  it("opens the linked record when there is one", () => {
    const n = normalizeNotification({ ...row, message: "x", leadId: "lead-9" }, 0);
    expect(notificationDestination(n)).toEqual({
      href: "/sales/leads/detail/lead-9",
      label: "View related record",
    });
  });

  it("offers no action for a system alert with nothing to open", () => {
    const n = normalizeNotification({ ...row, type: "SYSTEM", message: "x" }, 0);
    expect(notificationDestination(n)).toBeNull();
  });
});
