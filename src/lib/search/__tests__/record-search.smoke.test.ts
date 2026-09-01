import { describe, expect, it } from "vitest";
import {
  smokeRecordSearchMock,
  smokeRecordSearchWiring,
} from "@/lib/search/smoke";

describe("Record search API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeRecordSearchWiring();
  });

  it("mocks GET /v1/workspaces/:id/search/records", async () => {
    await smokeRecordSearchMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
