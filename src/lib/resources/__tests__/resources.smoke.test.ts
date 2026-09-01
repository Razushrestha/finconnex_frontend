import { describe, expect, it } from "vitest";
import {
  smokeResourcesMock,
  smokeResourcesWiring,
} from "@/lib/resources/smoke";

describe("Resources API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeResourcesWiring();
  });

  it("mocks all 5 Swagger routes", async () => {
    await smokeResourcesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
