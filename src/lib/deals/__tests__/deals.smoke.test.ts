import { describe, expect, it } from "vitest";
import { smokeDealsMock, smokeDealsWiring } from "@/lib/deals/smoke";

describe("Deals API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeDealsWiring();
  });

  it("mocks all 15 Swagger routes", async () => {
    await smokeDealsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
