import { describe, expect, it } from "vitest";
import { smokeSettingsMock, smokeSettingsWiring } from "@/lib/settings/smoke";
import { assertFullSchemaCoverage } from "@/lib/settings/settings-schemas";
import { allSettingsPaths } from "@/lib/settings/settings-config";

describe("Settings API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeSettingsWiring();
  });

  it("mocks GET/PATCH settings, pages catalog, security, capabilities, smtp-test", async () => {
    await smokeSettingsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });

  it("has a schema for every settings hub page", () => {
    expect(assertFullSchemaCoverage()).toEqual([]);
    expect(allSettingsPaths().length).toBeGreaterThan(40);
  });
});
