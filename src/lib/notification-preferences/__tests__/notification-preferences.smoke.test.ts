import { describe, expect, it } from "vitest";
import {
  smokeNotificationPreferencesMock,
  smokeNotificationPreferencesWiring,
} from "@/lib/notification-preferences/smoke";

describe("Notification preferences API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeNotificationPreferencesWiring();
  });

  it("mocks workspace-scoped preference routes", async () => {
    await smokeNotificationPreferencesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
