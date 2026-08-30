import { describe, expect, it } from "vitest";
import {
  smokeNotificationsMock,
  smokeNotificationsWiring,
} from "@/lib/notifications/smoke";

describe("Notifications API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeNotificationsWiring();
  });

  it("mocks workspace-scoped notification routes", async () => {
    await smokeNotificationsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
