import { describe, expect, it } from "vitest";
import { smokeEmailsMock, smokeEmailsWiring } from "@/lib/emails/smoke";

describe("CRM Emails API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeEmailsWiring();
  });

  it("mocks workspace email routes", async () => {
    await smokeEmailsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
