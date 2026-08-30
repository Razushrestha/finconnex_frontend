import { describe, expect, it } from "vitest";
import {
  smokeEstimatesMock,
  smokeEstimatesWiring,
} from "@/lib/finance/estimates/smoke";

describe("Estimates API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeEstimatesWiring();
  });

  it("mocks all 11 Swagger routes", async () => {
    await smokeEstimatesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
