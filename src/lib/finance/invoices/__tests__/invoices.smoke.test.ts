import { describe, expect, it } from "vitest";
import {
  smokeInvoicesMock,
  smokeInvoicesWiring,
} from "@/lib/finance/invoices/smoke";

describe("Invoices API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeInvoicesWiring();
  });

  it("mocks all 12 Swagger routes", async () => {
    await smokeInvoicesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
