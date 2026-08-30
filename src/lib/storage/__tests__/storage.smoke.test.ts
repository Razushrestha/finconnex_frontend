import { describe, expect, it } from "vitest";
import { smokeStorageMock, smokeStorageWiring } from "@/lib/storage/smoke";

describe("Storage API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeStorageWiring();
  });

  it("mocks POST /v1/storage/upload", async () => {
    await smokeStorageMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
