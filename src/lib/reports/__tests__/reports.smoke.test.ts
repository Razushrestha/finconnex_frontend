import { describe, expect, it } from "vitest";
import {
  smokeReportsMock,
  smokeReportsWiring,
} from "@/lib/reports/smoke";

describe("Reports API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeReportsWiring();
  });

  it("mocks all 8 Swagger routes", async () => {
    await smokeReportsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
