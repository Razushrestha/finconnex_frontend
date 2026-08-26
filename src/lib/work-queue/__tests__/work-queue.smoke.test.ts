import { describe, expect, it } from "vitest";
import {
  smokeWorkQueueMock,
  smokeWorkQueueWiring,
} from "@/lib/work-queue/smoke";

describe("Work Queue API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeWorkQueueWiring();
  });

  it("mocks GET /v1/workspaces/:id/work-queue", async () => {
    await smokeWorkQueueMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
