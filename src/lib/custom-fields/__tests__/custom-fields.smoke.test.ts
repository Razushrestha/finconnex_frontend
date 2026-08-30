import { describe, expect, it } from "vitest";
import {
  smokeCustomFieldsMock,
  smokeCustomFieldsWiring,
} from "@/lib/custom-fields/smoke";

describe("Custom Fields API smoke (CI)", () => {
  it("wires client, catalog, and settings UI", () => {
    smokeCustomFieldsWiring();
  });

  it("mocks all 16 Swagger routes", async () => {
    await smokeCustomFieldsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
