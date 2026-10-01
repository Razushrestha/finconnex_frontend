import { describe, expect, it } from "vitest";
import {
  smokeBookingMock,
  smokeBookingWiring,
} from "@/lib/booking/booking-smoke";
import { crmEventTypeIdOf, eventTypesFromCrmPayload, mergeCrmEventTypePages } from "@/lib/booking/api";
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
    expect(merged[0]?.id).toBe("et-1");
    expect(merged[0]?.crmEventTypeId).toBe("et-1");
  });

  it("keeps local booking-form questions when the CRM event type has none", () => {
    const local: BookingPage = {
      id: "et-1",
      title: "Ram test",
      slug: "ram-test",
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
      questions: [
        { id: "name", label: "Name", required: true },
        { id: "field-gender", label: "gender", required: false, fieldType: "radio" },
        { id: "field-date", label: "enter the date", required: true, fieldType: "date" },
        {
          id: "field-address",
          label: "enter your address",
          required: false,
          fieldType: "address",
        },
      ],
      consultants: ["Mohit Chapagain", "nepatronix web", "spare nepatronix"],
      termsEnabled: true,
      termsHtml: "I agree",
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
      title: "Ram test",
      questions: [],
      consultants: ["Mohit Chapagain"],
      termsEnabled: undefined,
      termsHtml: undefined,
    };
    const merged = mergeCrmEventTypePages([local], [remote]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.questions.map((row) => row.label)).toEqual([
      "Name",
      "gender",
      "enter the date",
      "enter your address",
    ]);
    expect(merged[0]?.consultants).toEqual([
      "Mohit Chapagain",
      "nepatronix web",
      "spare nepatronix",
    ]);
    expect(merged[0]?.termsEnabled).toBe(true);
    expect(merged[0]?.termsHtml).toBe("I agree");
  });

  it("keeps every remote consultation when listing the workspace API", () => {
    const extra: BookingPage = {
      id: "et-2",
      title: "Follow up",
      slug: "follow-up",
      owner: "Ada",
      eventType: "Consultation",
      durationMinutes: 45,
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
      status: "Draft",
      views: 0,
      bookingsCount: 0,
      cancelRate: 0,
      createdAt: "",
      crmEventTypeId: "et-2",
    };
    const local: BookingPage = {
      id: "local-1",
      title: "Local",
      slug: "discovery",
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
    const merged = mergeCrmEventTypePages([local], [remote, extra]);
    expect(merged.map((row) => row.crmEventTypeId).sort()).toEqual(["et-1", "et-2"]);
    expect(merged).toHaveLength(2);
  });

  it("parses workspace event-type lists without treating hosts as rows", () => {
    const rows = eventTypesFromCrmPayload({
      items: [
        {
          id: "et-1",
          name: "Intro",
          slug: "intro",
          durationMinutes: 30,
          isActive: true,
          hosts: [
            { host: { id: "h-1", name: "Ada" } },
            { host: { id: "h-2", name: "Lin" } },
          ],
        },
        {
          id: "et-2",
          name: "Review",
          slug: "review",
          durationMinutes: 45,
          isActive: false,
        },
      ],
      metadata: { totalItems: 2 },
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.name)).toEqual(["Intro", "Review"]);
    expect(rows[0]?.hostNames).toEqual(["Ada", "Lin"]);
    expect(rows[1]?.active).toBe(false);
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
