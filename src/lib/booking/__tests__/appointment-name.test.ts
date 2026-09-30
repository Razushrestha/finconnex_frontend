import { describe, expect, it } from "vitest";
import {
  appointmentInitials,
  appointmentPersonName,
  appointmentMatchesKpi,
  bookingKpiStats,
  meetingToAppointment,
} from "@/lib/booking/dashboard";
import type { Meeting } from "@/lib/meetings/types";

describe("appointment display name", () => {
  it("uses the booking title when the guest is a dash", () => {
    expect(appointmentPersonName("—", "Test2")).toBe("Test2");
    expect(appointmentInitials("Test2")).toBe("T");
    expect(appointmentInitials("Ada Lovelace")).toBe("AL");
  });

  it("maps a CRM meeting titled Test2 onto the appointment name", () => {
    const meeting: Meeting = {
      id: "m1",
      title: "Test2",
      relatedTo: "Contact: —",
      type: "Video Call",
      startDateTime: "2026-09-19T06:00",
      endDateTime: "2026-09-19T06:30",
      attendees: [],
      organizer: "—",
      status: "In Progress",
    };
    const row = meetingToAppointment(meeting);
    expect(row?.guestName).toBe("Test2");
    expect(appointmentInitials(row?.guestName ?? "")).toBe("T");
  });

  it("counts a listed confirmed appointment on the KPI cards", () => {
    const now = new Date(2026, 8, 30, 12, 0, 0);
    const row = {
      id: "m1",
      guestName: "Test2",
      topic: "Contact",
      relatedKind: "Contact" as const,
      relatedId: "—",
      consultantId: "",
      start: "2026-09-19T06:00",
      type: "Consultation" as const,
      status: "Confirmed" as const,
      channel: "Video Call" as const,
      avatarClass: "",
    };
    expect(appointmentMatchesKpi(row, "upcoming", now)).toBe(true);
    expect(appointmentMatchesKpi(row, "confirmed", now)).toBe(true);
    expect(appointmentMatchesKpi(row, "month", now)).toBe(true);
    const stats = bookingKpiStats([row], now);
    expect(stats.upcoming.current).toBe(1);
    expect(stats.confirmed.current).toBe(1);
    expect(stats.month.current).toBe(1);
  });
});
