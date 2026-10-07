import { describe, expect, it } from "vitest";

import {
  appointmentReference,
  appointmentSlotTimes,
  formatAppointmentStamp,
  formatDurationLabel,
  formatSlotClock,
  guestAppointmentNotes,
  guestClockRange,
  assignGuestClocks,
  latestGuestClocks,
  matchGuestClock,
  reopenGuestRecord,
  matchAppointmentMeetingId,
  slotPeriod,
} from "@/lib/meetings/appointment-manage";

describe("appointment manage helpers", () => {
  it("formats the reschedule card the way the form shows it", () => {
    expect(formatDurationLabel(90)).toBe("1 hr 30 mins");
    expect(formatSlotClock("11:30")).toBe("11:30 am");
    expect(formatSlotClock("13:15")).toBe("01:15 pm");
    expect(formatAppointmentStamp("2026-10-09", "10:00")).toBe("09-Oct-2026 | 10:00 am");
    expect(slotPeriod("11:30")).toBe("Morning");
    expect(slotPeriod("12:15")).toBe("Afternoon");
    expect(slotPeriod("16:00")).toBe("Evening");
    expect(appointmentSlotTimes()).toContain("11:30");
    expect(appointmentReference("meeting-1")).toMatch(/^AP-\d{5}$/);
  });

  it("finds the CRM meeting by title when the email link did not store an id", () => {
    const id = "eec04390-1260-4580-be45-0c013451923a";
    expect(
      matchAppointmentMeetingId(
        { title: "10/7/2026 Test" },
        [
          { id, title: "10/7/2026 Test" },
          { id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", title: "Other" },
        ],
      ),
    ).toBe(id);
    expect(
      matchAppointmentMeetingId(
        { title: "10/7/2026 Test" },
        [
          { id, title: "10/7/2026 Test" },
          { id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", title: "10/7/2026 Test" },
        ],
      ),
    ).toBeUndefined();
  });

  it("shows the client's chosen clock on the dashboard, not a converted one", () => {
    expect(guestClockRange("2026-10-09", "11:30", 90)).toEqual({
      start: "2026-10-09T11:30",
      end: "2026-10-09T13:00",
    });
    const [latest] = latestGuestClocks([
      {
        meetingId: "eec04390-1260-4580-be45-0c013451923a",
        title: "10/7/2026 Test",
        dateIso: "2026-10-19",
        startHHmm: "15:30",
        durationMinutes: 90,
        updatedAt: "2026-10-07T05:18:18.947Z",
        status: "scheduled",
      },
      {
        meetingId: "eec04390-1260-4580-be45-0c013451923a",
        title: "10/7/2026 Test",
        dateIso: "2026-10-09",
        startHHmm: "11:30",
        durationMinutes: 90,
        updatedAt: "2026-10-07T05:24:44.367Z",
        status: "scheduled",
      },
    ]);
    expect(latest.dateIso).toBe("2026-10-09");
    expect(latest.startHHmm).toBe("11:30");
  });

  it("keeps the client's cancel remarks as the dashboard notes", () => {
    const [latest] = latestGuestClocks([
      {
        meetingId: "eec04390-1260-4580-be45-0c013451923a",
        title: "10/7/2026 Test",
        dateIso: "2026-10-08",
        startHHmm: "11:30",
        durationMinutes: 90,
        updatedAt: "2026-10-07T05:31:35.207Z",
        status: "cancelled",
        remarks: "right now i am busy",
      },
      {
        meetingId: "eec04390-1260-4580-be45-0c013451923a",
        title: "10/7/2026 Test",
        dateIso: "2026-10-14",
        startHHmm: "14:35",
        durationMinutes: 90,
        updatedAt: "2026-10-07T05:46:23.776Z",
        status: "cancelled",
        remarks: "i am busy now",
      },
    ]);
    expect(latest.remarks).toBe("i am busy now");
    expect(guestAppointmentNotes(undefined, latest.remarks)).toBe("i am busy now");
    expect(guestAppointmentNotes("Staff note", latest.remarks)).toBe(
      "Staff note\ni am busy now",
    );
  });

  it("matches a cancelled booking by its meeting id when the titles are the same", () => {
    const clocks = [
      {
        meetingId: "32a59206-3074-4b56-b608-52cde0744def",
        title: "10/7/2026 Test",
        guestName: "Ram Bahadur chhetri",
        dateIso: "2026-10-14",
        startHHmm: "12:02",
        durationMinutes: 90,
        updatedAt: "2026-10-07T05:43:36.761Z",
        status: "scheduled",
      },
      {
        meetingId: "eec04390-1260-4580-be45-0c013451923a",
        title: "10/7/2026 Test",
        guestName: "Raju shrestha",
        dateIso: "2026-10-16",
        startHHmm: "13:00",
        durationMinutes: 90,
        updatedAt: "2026-10-07T06:05:44.392Z",
        status: "cancelled",
        remarks: "text me back",
      },
    ];
    expect(
      matchGuestClock(clocks, {
        id: "booking-1",
        meetingId: "eec04390-1260-4580-be45-0c013451923a",
        title: "10/7/2026 Test",
        guestName: "Raju shrestha",
      })?.status,
    ).toBe("cancelled");
    expect(
      matchGuestClock(clocks, {
        id: "booking-2",
        title: "10/7/2026 Test",
        guestName: "Ram Bahadur chhetri",
      })?.startHHmm,
    ).toBe("12:02");
  });

  it("attaches the latest cancellation for that host even when the booking id differs", () => {
    const clocks = [
      {
        meetingId: "eec04390-1260-4580-be45-0c013451923a",
        title: "10/7/2026 Test",
        guestName: "Raju shrestha",
        hostName: "nepatronix web",
        dateIso: "2026-10-16",
        startHHmm: "13:00",
        durationMinutes: 90,
        updatedAt: "2026-10-07T06:05:44.392Z",
        status: "cancelled",
      },
      {
        meetingId: "ac74f878-14e3-4061-ac0e-972a60d4af08",
        title: "10/7/2026 Test",
        guestName: "Raju shrestha",
        hostName: "Mohit Chapagain",
        dateIso: "2026-10-08",
        startHHmm: "12:00",
        durationMinutes: 90,
        updatedAt: "2026-10-07T06:11:05.387Z",
        status: "cancelled",
        remarks: "i am busy and busy",
      },
    ];
    const { assigned, unused } = assignGuestClocks(
      [
        {
          id: "booking-mohit",
          title: "10/7/2026 Test",
          guestName: "Raju shrestha",
          hostName: "Mohit Chapagain",
        },
      ],
      clocks,
    );
    expect(assigned[0]?.meetingId).toBe("ac74f878-14e3-4061-ac0e-972a60d4af08");
    expect(assigned[0]?.status).toBe("cancelled");
    expect(
      matchGuestClock(
        [
          {
            meetingId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            title: "10/7/2026 Test",
            guestName: "Raju shrestha",
            hostName: "nepatronix web",
            dateIso: "2026-10-13",
            startHHmm: "12:00",
            durationMinutes: 90,
            updatedAt: "2026-10-07T06:31:24.555Z",
            status: "cancelled",
            remarks: "sorry this time",
          },
        ],
        {
          id: "booking-mohit",
          title: "10/7/2026 Test",
          guestName: "Raju shrestha",
          hostName: "Mohit Chapagain",
          start: "2026-10-13T12:00",
        },
      )?.status,
    ).toBe("cancelled");
    expect(unused.map((item) => item.meetingId)).toEqual([
      "eec04390-1260-4580-be45-0c013451923a",
    ]);
    const stolen = assignGuestClocks(
      [
        {
          id: "other-raju",
          title: "10/7/2026 Test",
          guestName: "Raju shrestha",
          hostName: "nepatronix web",
          start: "2026-10-16T13:00",
        },
        {
          id: "booking-time",
          title: "10/7/2026 Test",
          guestName: "Raju shrestha",
          hostName: "Mohit Chapagain",
          start: "2026-10-13T12:00",
        },
      ],
      [
        {
          meetingId: "ac74f878-14e3-4061-ac0e-972a60d4af08",
          title: "10/7/2026 Test",
          guestName: "Raju shrestha",
          hostName: "nepatronix web",
          dateIso: "2026-10-13",
          startHHmm: "12:00",
          durationMinutes: 90,
          updatedAt: "2026-10-07T06:31:24.555Z",
          status: "cancelled",
        },
      ],
    );
    expect(stolen.assigned[1]?.status).toBe("cancelled");
    expect(stolen.assigned[0]).toBeUndefined();
  });

  it("turns a cancelled appointment back into a booked time", () => {
    const next = reopenGuestRecord(
      {
        token: "dbW-eQ39Nes5bJfV9FPYOBdk",
        meetingId: "ac74f878-14e3-4061-ac0e-972a60d4af08",
        title: "10/7/2026 Test",
        guestName: "Raju shrestha",
        hostName: "Mohit Chapagain",
        dateIso: "2026-10-08",
        startHHmm: "12:00",
        durationMinutes: 90,
        timeZone: "Australia/Sydney",
        reference: "AP-21489",
        status: "cancelled",
        remarks: "i am busy and busy",
        updatedAt: "2026-10-07T06:11:05.387Z",
      },
      { dateIso: "2026-10-20", startHHmm: "15:00", durationMinutes: 90, updatedAt: "2026-10-07T06:20:00.000Z" },
    );
    expect(next.status).toBe("scheduled");
    expect(next.dateIso).toBe("2026-10-20");
    expect(next.startHHmm).toBe("15:00");
    expect(next.remarks).toBeUndefined();
  });
});
