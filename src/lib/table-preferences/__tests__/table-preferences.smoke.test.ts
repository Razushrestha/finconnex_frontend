import { describe, expect, it } from "vitest";
import {
  smokeTablePreferencesMock,
  smokeTablePreferencesWiring,
} from "@/lib/table-preferences/smoke";

describe("Table preferences API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeTablePreferencesWiring();
  });

  it("mocks workspace table preference routes", async () => {
    await smokeTablePreferencesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
