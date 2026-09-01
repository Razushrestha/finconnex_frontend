import { describe, expect, it } from "vitest";
import {
  smokeWorkspaceInvitationsMock,
  smokeWorkspaceInvitationsWiring,
} from "@/lib/workspace-invitations/smoke";

describe("Workspace invitations API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeWorkspaceInvitationsWiring();
  });

  it("mocks invitation accept", async () => {
    await smokeWorkspaceInvitationsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
