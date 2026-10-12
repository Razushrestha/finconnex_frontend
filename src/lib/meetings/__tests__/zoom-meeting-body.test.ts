import { describe, expect, it } from "vitest";

import { toCreateMeetingBody } from "@/lib/meetings/api";

const base = {
  title: "Product demo",
  type: "Video Call" as const,
  status: "Scheduled" as const,
  startDateTime: "2026-10-15T04:15:00.000Z",
  endDateTime: "2026-10-15T04:45:00.000Z",
  organizer: "Host",
  location: "Zoom",
};

describe("toCreateMeetingBody with a Zoom room", () => {
  it("asks the CRM to create the Zoom room and sends no link of its own", () => {
    const body = toCreateMeetingBody({
      ...base,
      meetingLink: "https://zoom.us/j/stale",
      conferenceProvider: "ZOOM",
    });
    expect(body.conferenceProvider).toBe("ZOOM");
    expect(body.meetingLink).toBeUndefined();
  });

  it("keeps a pasted link when no room is requested", () => {
    const body = toCreateMeetingBody({
      ...base,
      meetingLink: "https://zoom.us/j/123",
    });
    expect(body.conferenceProvider).toBeUndefined();
    expect(body.meetingLink).toBe("https://zoom.us/j/123");
  });
});
