import { describe, expect, it } from "vitest";
import {
  smokeBookingMock,
  smokeBookingWiring,
} from "@/lib/booking/booking-smoke";
import { crmEventTypeIdOf, mergeCrmEventTypePages } from "@/lib/booking/api";
import { WEEKDAYS, type BookingPage } from "@/lib/booking/types";

describe("native booking API smoke (CI)", () => {
  it("wires client, catalog, and BFF", () => {
    smokeBookingWiring();
  });

  it("mocks workspace-scoped booking routes", async () => {
    await smokeBookingMock();
  });

  it("lists every screenshot Swagger booking path in the catalog", async () => {
    smokeBookingWiring();
  });

  it("merges CRM event types onto local consultation pages", () => {
    const local: BookingPage = {
      id: "local-1",
      title: "Local",
      slug: "local",
      owner: "Ada",
      eventType: "Consultation",
      durationMinutes: 30,
      bufferMinutes: 0,
      timezone: "Australia/Sydney",
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
      crmEventTypeId: "et-1",
    };
    const remote: BookingPage = {
      ...local,
      id: "et-1",
      title: "Discovery",
      slug: "discovery",
      crmEventTypeId: "et-1",
    };
    const merged = mergeCrmEventTypePages([local], [remote]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("Discovery");
    expect(merged[0]?.id).toBe("local-1");
    expect(merged[0]?.crmEventTypeId).toBe("et-1");
  });

  it("only treats UUID event types as CRM slot sources", () => {
    expect(
      crmEventTypeIdOf({ id: "bp-1789750731210", crmEventTypeId: "" }),
    ).toBe("");
    expect(
      crmEventTypeIdOf({
        id: "bp-1789750731210",
        crmEventTypeId: "167f444e-33ea-42bc-bde7-028803e0be53",
      }),
    ).toBe("167f444e-33ea-42bc-bde7-028803e0be53");
  });
});
