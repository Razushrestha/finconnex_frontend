import { describe, expect, it } from "vitest";
import { smokeSettingsMock, smokeSettingsWiring } from "@/lib/settings/smoke";

describe("Settings API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeSettingsWiring();
  });

  it("mocks GET/PATCH settings, security, capabilities, smtp-test", async () => {
    await smokeSettingsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
