import { describe, expect, it } from "vitest";
import {
  smokeCalendarMock,
  smokeCalendarWiring,
} from "@/lib/calendar/smoke";

describe("Calendar CRM API", () => {
  it("wires Swagger calendar GETs into the calendar page and dashboard", () => {
    smokeCalendarWiring();
  });

  it("mock client hits workspace-scoped calendar paths and unwraps data", async () => {
    await smokeCalendarMock();
  });
});
