import { describe, expect, it } from "vitest";
import {
  eventTypeLocationPayload,
  selectableOnlinePlatforms,
} from "@/lib/booking/meeting-platforms";
import {
  crmEventTypeToBookingPage,
  toCreateEventTypeBody,
} from "@/lib/booking/api";

describe("online meeting platforms", () => {
  it("always offers Zoom and Google Meet", () => {
    const list = selectableOnlinePlatforms();
    expect(list).toEqual(expect.arrayContaining(["Google Meet", "Zoom"]));
  });

  it("maps platforms to booking locationType enums", () => {
    expect(
      eventTypeLocationPayload({
        meetingPlace: "online",
        platform: "Google Meet",
      }),
    ).toEqual({ locationType: "GOOGLE_MEET", location: "Google Meet" });
    expect(
      eventTypeLocationPayload({ meetingPlace: "online", platform: "Zoom" }),
    ).toEqual({ locationType: "ZOOM", location: "Zoom" });
    expect(
      toCreateEventTypeBody({
        name: "Intro",
        meetingPlace: "online",
        platform: "Zoom",
      }).locationType,
    ).toBe("ZOOM");
  });

  it("hydrates consultation pages from CRM locationType", () => {
    const page = crmEventTypeToBookingPage({
      id: "et-1",
      name: "Intro",
      slug: "intro",
      durationMinutes: 30,
      timezone: "Australia/Sydney",
      description: "",
      active: true,
      hostId: "",
      locationType: "GOOGLE_MEET",
      location: "Google Meet",
    });
    expect(page.meetingVia).toBe("video");
    expect(page.meetingViaDetail).toBe("Google Meet");
  });
});
