import { describe, expect, it } from "vitest";
import {
  smokeCalendlyMock,
  smokeCalendlyWiring,
} from "@/lib/booking/calendly-smoke";

describe("Calendly booking API smoke (CI)", () => {
  it("wires client, catalog, and BFF", () => {
    smokeCalendlyWiring();
  });

  it("mocks workspace-scoped Calendly routes", async () => {
    await smokeCalendlyMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
