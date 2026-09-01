import { describe, expect, it } from "vitest";
import { smokeTasksMock, smokeTasksWiring } from "@/lib/tasks/smoke";

describe("Tasks API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeTasksWiring();
  });

  it("mocks workspace-scoped task routes", async () => {
    await smokeTasksMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
