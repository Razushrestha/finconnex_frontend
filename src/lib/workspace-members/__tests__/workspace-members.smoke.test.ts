import { describe, expect, it } from "vitest";
import {
  smokeWorkspaceMembersMock,
  smokeWorkspaceMembersWiring,
} from "@/lib/workspace-members/smoke";

describe("Workspace members API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeWorkspaceMembersWiring();
  });

  it("mocks workspace member list/invite/update/invite-lifecycle", async () => {
    await smokeWorkspaceMembersMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
