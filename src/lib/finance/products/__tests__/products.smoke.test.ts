import { describe, expect, it } from "vitest";
import {
  smokeProductsMock,
  smokeProductsWiring,
} from "@/lib/finance/products/smoke";

describe("Products API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeProductsWiring();
  });

  it("mocks products routes", async () => {
    await smokeProductsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
