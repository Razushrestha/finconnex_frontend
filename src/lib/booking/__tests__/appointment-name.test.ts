import { describe, expect, it } from "vitest";
import {
  appointmentInitials,
  appointmentPersonName,
  appointmentChannelFromLocation,
  appointmentMatchesKpi,
  appointmentRelatedLabel,
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

  it("keeps the assigned consultant on a booked meeting", () => {
    const meeting: Meeting = {
      id: "m2",
      title: "Meeting",
      relatedTo: "Contact: Ada",
      type: "Video Call",
      startDateTime: "2026-09-30T09:00",
      endDateTime: "2026-09-30T09:30",
      attendees: [
        {
          id: "u-mohit",
          name: "Mohit Chapagain",
          email: "mohit.chapagain@finconnex.com.au",
          role: "Host",
        },
      ],
      organizer: "",
      organizerId: "u-mohit",
      status: "Scheduled",
    };
    const row = meetingToAppointment(meeting, [
      {
        id: "u-mohit",
        name: "Mohit Chapagain",
        email: "mohit.chapagain@finconnex.com.au",
      },
    ]);
    expect(row?.consultantId).toBe("u-mohit");
    expect(row?.consultantName).toBe("Mohit Chapagain");
  });

  it("uses bookingHost and organizerId from the CRM meeting payload", () => {
    const meeting: Meeting = {
      id: "m3",
      title: "Meeting",
      relatedTo: "Contact: Ada",
      type: "Video Call",
      startDateTime: "2026-10-06T09:00",
      endDateTime: "2026-10-06T09:30",
      attendees: [],
      organizer: "",
      organizerId: "user-mohit",
      bookingHostName: "Mohit Chapagain",
      bookingHostUserId: "user-mohit",
      status: "Scheduled",
    };
    const row = meetingToAppointment(meeting, []);
    expect(row?.consultantId).toBe("user-mohit");
    expect(row?.consultantName).toBe("Mohit Chapagain");
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
    expect(appointmentMatchesKpi(row, "upcoming", now)).toBe(false);
    expect(appointmentMatchesKpi(row, "confirmed", now)).toBe(true);
    expect(appointmentMatchesKpi(row, "month", now)).toBe(true);
    const stats = bookingKpiStats([row], now);
    expect(stats.upcoming.current).toBe(0);
    expect(stats.confirmed.current).toBe(1);
    expect(stats.month.current).toBe(1);
  });

  it("counts only today-or-later appointments as upcoming", () => {
    const now = new Date(2026, 8, 30, 12, 0, 0);
    const future = {
      id: "m2",
      guestName: "Test2",
      topic: "Contact",
      relatedKind: "Contact" as const,
      relatedId: "—",
      consultantId: "",
      start: "2026-10-02T06:00",
      type: "Consultation" as const,
      status: "Scheduled" as const,
      channel: "Video Call" as const,
      avatarClass: "",
    };
    expect(appointmentMatchesKpi(future, "upcoming", now)).toBe(true);
    expect(bookingKpiStats([future], now).upcoming.current).toBe(1);
  });

  it("maps phone and in-person locations off Video Call", () => {
    expect(appointmentChannelFromLocation("PHONE")).toBe("Phone Call");
    expect(appointmentChannelFromLocation("IN_PERSON")).toBe("In Person");
    expect(appointmentChannelFromLocation("ZOOM", "Google Meet")).toBe("Video Call");
    expect(appointmentChannelFromLocation()).toBe("Video Call");
  });

  it("shows the resolved related name instead of a record id", () => {
    expect(
      appointmentRelatedLabel({
        relatedKind: "Lead",
        relatedId: "167f444e-33ea-42bc-bde7-028803e0be53",
        relatedName: "Ada Lovelace",
        guestName: "Ada Lovelace",
      }),
    ).toBe("Lead · Ada Lovelace");
    expect(
      appointmentRelatedLabel({
        relatedKind: "Lead",
        relatedId: "167f444e-33ea-42bc-bde7-028803e0be53",
      }),
    ).toBe("Lead");
  });
});
