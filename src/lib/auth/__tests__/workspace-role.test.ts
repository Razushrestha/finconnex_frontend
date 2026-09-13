import { describe, expect, it } from "vitest";

import { isPlatformAdminRole, platformRoleLabel } from "@/lib/auth/platform";
import {
  asWorkspaceRole,
  canManageMembers,
  canWriteRecords,
  isWorkspaceOwner,
  workspaceRoleLabel,
} from "@/lib/auth/workspace-role";

describe("workspace role", () => {
  it("keeps workspace roles out of the platform-admin check", () => {
    // The whole bug: OWNER is a workspace role and USER is a global one.
    // Neither may be mistaken for platform staff.
    expect(isPlatformAdminRole("OWNER")).toBe(false);
    expect(isPlatformAdminRole("USER")).toBe(false);
    expect(isPlatformAdminRole("ADMIN")).toBe(true);
  });

  it("labels a signed-up workspace creator Owner, not User", () => {
    // globalRole stays USER for every self-signup; the workspace role is
    // what the navbar should be showing.
    // platformRoleLabel passes a non-staff role straight through, which is
    // exactly the raw "USER" the navbar used to render for an owner.
    expect(platformRoleLabel("USER")).toBe("USER");
    expect(workspaceRoleLabel("OWNER")).toBe("Owner");
    expect(workspaceRoleLabel("TEAM_LEAD")).toBe("Team lead");
  });

  it("accepts only real WorkspaceRole values", () => {
    expect(asWorkspaceRole("owner")).toBe("OWNER");
    expect(asWorkspaceRole("  Member ")).toBe("MEMBER");
    // A global role must never survive as a workspace role.
    expect(asWorkspaceRole("USER")).toBeNull();
    expect(asWorkspaceRole("DEVELOPER")).toBeNull();
    expect(asWorkspaceRole(null)).toBeNull();
    expect(asWorkspaceRole("")).toBeNull();
  });

  it("lets an owner invite members, mirroring OwnerAdminOnly on the API", () => {
    expect(isWorkspaceOwner("OWNER")).toBe(true);
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canManageMembers("ADMIN")).toBe(true);
    expect(canManageMembers("MANAGER")).toBe(false);
    expect(canManageMembers("MEMBER")).toBe(false);
    expect(canManageMembers(null)).toBe(false);
  });

  it("mirrors @WriteProtected() — everyone but VIEWER and GUEST writes", () => {
    for (const role of ["OWNER", "ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER"]) {
      expect(canWriteRecords(role)).toBe(true);
    }
    expect(canWriteRecords("VIEWER")).toBe(false);
    expect(canWriteRecords("GUEST")).toBe(false);
    // No workspace selected yet — no writes.
    expect(canWriteRecords(null)).toBe(false);
  });
});
