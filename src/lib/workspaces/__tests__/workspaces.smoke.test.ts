import { describe, expect, it } from "vitest";
import {
  smokeWorkspacesMock,
  smokeWorkspacesWiring,
} from "@/lib/workspaces/smoke";

describe("Workspaces API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeWorkspacesWiring();
  });

  it("mocks mine/create/get/patch/delete", async () => {
    await smokeWorkspacesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
