import { describe, expect, it } from "vitest";
import { smokeMessagesMock, smokeMessagesWiring } from "@/lib/messages/smoke";

describe("Messages API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeMessagesWiring();
  });

  it("mocks workspace-scoped message routes", async () => {
    await smokeMessagesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
