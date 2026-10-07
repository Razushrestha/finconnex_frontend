import { describe, expect, it } from "vitest";

import {
  guestMailTokenFromBookings,
  mailTokenFromCreated,
} from "@/lib/documents/requests/invite-mailbox";

describe("guestMailTokenFromBookings", () => {
  it("uses the cancel token for the matching guest", () => {
    const token = guestMailTokenFromBookings(
      {
        data: [
          {
            id: "booking-1",
            inviteeEmail: "other@example.com",
            cancelToken: "other-token",
          },
          {
            id: "booking-2",
            guest: { email: "razu@example.com" },
            cancelToken: "guest-token-1",
          },
        ],
      },
      "Razu@example.com",
    );
    expect(token).toBe("guest-token-1");
  });

  it("reads the cancel token from a public booking reply that does not repeat the email", () => {
    expect(
      mailTokenFromCreated({
        id: "33333333-3333-4333-8333-333333333333",
        cancelToken: "cancel-token-123",
        startAt: "2026-10-08T04:30:00.000Z",
      }),
    ).toBe("cancel-token-123");
  });

  it("reads a manage link when the token is not a separate field", () => {
    expect(
      mailTokenFromCreated({
        manageUrl: "https://finconnex.payperless.app/book/intro/manage/guest-token-1",
      }),
    ).toBe("guest-token-1");
  });

  it("ignores a booking that has no mail token", () => {
    expect(
      guestMailTokenFromBookings(
        [{ id: "booking-1", guestEmail: "razu@example.com" }],
        "razu@example.com",
      ),
    ).toBeNull();
  });
});
