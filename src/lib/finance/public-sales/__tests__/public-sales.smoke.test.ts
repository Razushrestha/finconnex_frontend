import { describe, expect, it } from "vitest";
import {
  smokePublicSalesMock,
  smokePublicSalesWiring,
} from "@/lib/finance/public-sales/smoke";

describe("Public sales API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokePublicSalesWiring();
  });

  it("mocks public.sales routes", async () => {
    await smokePublicSalesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
