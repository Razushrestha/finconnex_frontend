import { describe, expect, it } from "vitest";
import { crmErrorMessage, crmValidationIssues } from "@/lib/crm/request";

describe("crmErrorMessage", () => {
  it("names class-validator extra properties instead of a generic 400", () => {
    const json = {
      statusCode: 400,
      error: "Bad Request",
      message: ["property startAt should not exist", "hostId must be a UUID"],
    };
    expect(crmErrorMessage(json, "fallback")).toContain("startAt");
    expect(crmErrorMessage(json, "fallback")).toContain("hostId");
    expect(crmErrorMessage(json, "fallback")).not.toMatch(/One of the fields/i);
  });

  it("reads field keys from an error object", () => {
    const json = {
      statusCode: 400,
      message: "Bad Request",
      error: { timezone: ["must be a valid timezone"] },
    };
    const text = crmErrorMessage(json, "fallback");
    expect(text).toMatch(/timezone/i);
    expect(text).toMatch(/valid timezone/i);
  });

  it("keeps known i18n keys as friendly copy", () => {
    const json = {
      statusCode: 400,
      message: "meeting.error.invalidRange",
    };
    expect(crmErrorMessage(json, "fallback")).toBe(
      "Meeting end time must be after the start time.",
    );
  });
});

describe("crmValidationIssues", () => {
  it("extracts property names", () => {
    const issues = crmValidationIssues({
      message: ["property organizerName should not exist"],
    });
    expect(issues).toEqual([
      { field: "organizerName", message: "is not allowed" },
    ]);
  });
});
