import { describe, expect, it } from "vitest";

import { bookingDisplayZoneFor } from "@/lib/booking/use-crm-booking";

const sydneyHost = {
  name: "Aalok Sapkota",
  crmUserId: "38779d25-ea04-477a-97c3-ccbb1456b76a",
  timezone: "Australia/Sydney",
};

describe("which zone the booking screens show times in", () => {
  it("uses the signed-in user's host profile", () => {
    expect(
      bookingDisplayZoneFor([sydneyHost], { id: sydneyHost.crmUserId }, "").zone,
    ).toBe("Australia/Sydney");
  });

  it("finds the host by name when the ids do not line up", () => {
    expect(
      bookingDisplayZoneFor([sydneyHost], { id: "other", name: "Aalok Sapkota" }, "").zone,
    ).toBe("Australia/Sydney");
  });

  it("falls back to My preferences, then the zone all hosts share", () => {
    expect(bookingDisplayZoneFor([sydneyHost], { id: "x" }, "Asia/Kathmandu").zone).toBe(
      "Asia/Kathmandu",
    );
    expect(bookingDisplayZoneFor([sydneyHost], { id: "x" }, "").zone).toBe(
      "Australia/Sydney",
    );
  });

  it("leaves the browser's zone when hosts disagree and nothing else is set", () => {
    const perth = { name: "B", timezone: "Australia/Perth" };
    expect(bookingDisplayZoneFor([sydneyHost, perth], { id: "x" }, "").zone).toBeNull();
  });
});
