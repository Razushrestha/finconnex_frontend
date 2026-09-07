import { describe, expect, it } from "vitest";
import {
  buildMeetingInviteMessage,
  isSendableInviteEmail,
} from "@/lib/meetings/invite-related";

describe("meeting invite emails", () => {
  it("rejects placeholder and incomplete addresses", () => {
    expect(isSendableInviteEmail("razu@client.com")).toBe(true);
    expect(isSendableInviteEmail("razu.shrestha@added.finconnex.local")).toBe(
      false,
    );
    expect(isSendableInviteEmail("mohit.chapagain@finconnex.com")).toBe(true);
    expect(isSendableInviteEmail("not-an-email")).toBe(false);
  });

  it("includes time, location, and related record in the invite body", () => {
    const body = buildMeetingInviteMessage({
      title: "Mortgage Consultation",
      startLabel: "1:30 PM",
      endLabel: "3:00 PM",
      location: "Video call",
      meetingLink: "https://meet.example/abc",
      relatedLabel: "Contact: Razu Shrestha",
    });
    expect(body).toContain("Mortgage Consultation");
    expect(body).toContain("1:30 PM");
    expect(body).toContain("Contact: Razu Shrestha");
    expect(body).toContain("https://meet.example/abc");
  });
});
