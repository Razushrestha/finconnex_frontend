import { describe, expect, it } from "vitest";
import {
  smokeMeetingsMock,
  smokeMeetingsWiring,
} from "@/lib/meetings/smoke";

describe("Meetings API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeMeetingsWiring();
  });

  it("mocks workspace-scoped meeting routes", async () => {
    await smokeMeetingsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
