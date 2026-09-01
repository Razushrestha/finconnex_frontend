import { describe, expect, it } from "vitest";
import {
  smokeRemindersMock,
  smokeRemindersWiring,
} from "@/lib/reminders/smoke";

describe("Reminders API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeRemindersWiring();
  });

  it("mocks workspace-scoped reminder routes", async () => {
    await smokeRemindersMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
