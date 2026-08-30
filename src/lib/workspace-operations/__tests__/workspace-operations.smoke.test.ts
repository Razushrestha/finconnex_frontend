import { describe, expect, it } from "vitest";
import {
  smokeWorkspaceOperationsMock,
  smokeWorkspaceOperationsWiring,
} from "@/lib/workspace-operations/smoke";

describe("Workspace operations API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeWorkspaceOperationsWiring();
  });

  it("mocks profile, members-admin, preferences, leave, activate", async () => {
    await smokeWorkspaceOperationsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
