import { describe, expect, it } from "vitest";
import {
  smokeRecycleBinMock,
  smokeRecycleBinWiring,
} from "@/lib/recycle-bin/smoke";

describe("Recycle bin API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeRecycleBinWiring();
  });

  it("mocks recycle-bin routes", async () => {
    await smokeRecycleBinMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
