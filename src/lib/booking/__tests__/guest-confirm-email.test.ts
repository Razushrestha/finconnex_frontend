import { describe, expect, it } from "vitest";
import { allocateConferencingLink } from "@/lib/booking/meeting-link";
import { bookingConfirmEmailHtml } from "@/lib/booking/guest-confirm-email";
import { WEEKDAYS, type BookingPage } from "@/lib/booking/types";

const page = (via: Partial<BookingPage>): BookingPage => ({
  id: "p1",
  title: "Test2",
  slug: "test2",
  owner: "nepatronixx web",
  eventType: "Consultation",
  durationMinutes: 30,
  bufferMinutes: 0,
  timezone: "Asia/Kathmandu",
  description: "",
  availability: WEEKDAYS.map((day) => ({
    day,
    enabled: true,
    start: "09:00",
    end: "17:00",
  })),
  questions: [],
  confirmationTemplate: "",
  reminderTemplate: "",
  status: "Live",
  views: 0,
  bookingsCount: 0,
  cancelRate: 0,
  createdAt: "",
  meetingVia: "video",
  ...via,
});

describe("booking conferencing + guest email", () => {
  it("allocates a Zoom join URL when the consultation is Zoom", () => {
    const url = allocateConferencingLink(page({ meetingViaDetail: "Zoom" }), "zoom-room");
    expect(url).toBe("https://meet.jit.si/FinConnex-zoom-room");
  });

  it("allocates a joinable video room for Google Meet consultations", () => {
    const url = allocateConferencingLink(
      page({ meetingViaDetail: "Google Meet" }),
      "meet-room",
    );
    expect(url).toBe("https://meet.jit.si/FinConnex-meet-room");
  });

  it("keeps an existing https meeting link", () => {
    expect(
      allocateConferencingLink(
        page({ videoLink: "https://zoom.us/j/12345678901", meetingViaDetail: "Zoom" }),
      ),
    ).toBe("https://zoom.us/j/12345678901");
  });

  it("keeps a host-pasted Google Meet room", () => {
    expect(
      allocateConferencingLink(
        page({
          videoLink: "https://meet.google.com/abc-defg-hij",
          meetingViaDetail: "Google Meet",
        }),
      ),
    ).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("builds the guest confirmation email with host, number, join link, and manage links", () => {
    const copy = bookingConfirmEmailHtml({
      guestName: "Razu Shrestha",
      hostName: "nepatronixx web",
      title: "Test2",
      dateLabel: "21 Sep 2026",
      timeLabel: "09:00 AM",
      timezoneLabel: "Asia/Kathmandu GMT +05:45",
      reference: "NE-00001",
      joinUrl: "https://meet.google.com/abc-defg-hij",
      slug: "test2",
      manageToken: "tok-1",
      origin: "http://localhost:3000",
    });
    expect(copy.subject).toContain("Test2");
    expect(copy.html).toContain("Hi there, Razu Shrestha !");
    expect(copy.html).toContain("nepatronixx web");
    expect(copy.html).toContain("NE-00001");
    expect(copy.html).toContain("https://meet.google.com/abc-defg-hij");
    expect(copy.html).toContain("/book/test2?reschedule=tok-1");
    expect(copy.html).toContain("/book/test2/manage/tok-1");
    expect(copy.text).toContain("Join meeting:");
  });
});
