import { describe, expect, it } from "vitest";
import {
  smokeQuotesMock,
  smokeQuotesWiring,
} from "@/lib/finance/quotations/smoke";

describe("Quotes API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeQuotesWiring();
  });

  it("mocks all 11 Swagger routes", async () => {
    await smokeQuotesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
