import { describe, expect, it } from "vitest";

import { can, roleLevel } from "@/lib/rules/permissions";
import {
  rulesRoleForWorkspaceRole,
  WORKSPACE_ROLES,
} from "@/lib/auth/workspace-role";

describe("workspace role feeds the permission engine", () => {
  it("maps every workspace role to a role the engine knows", () => {
    // An unknown name scores 0 and is denied everything, which is exactly how
    // the bug presented: the raw enum was passed straight through.
    for (const role of WORKSPACE_ROLES) {
      const mapped = rulesRoleForWorkspaceRole(role);
      expect(mapped, `${role} has no mapping`).toBeTruthy();
      expect(roleLevel(mapped!), `${mapped} is unknown to the engine`).toBeGreaterThan(0);
    }
  });

  it("is why an owner was refused: the raw enum matches no role", () => {
    // `User.globalRole` is the uppercase enum "USER". The engine's vocabulary
    // is "User" — so the string it was handed matched nothing and scored 0.
    expect(roleLevel("USER")).toBe(0);
    expect(can({ role: "USER", resource: "sales.contacts.create", scope: "action" })).toBe(false);
  });

  it("lets an owner do what the Nest guards already allow", () => {
    const owner = rulesRoleForWorkspaceRole("OWNER")!;
    for (const resource of [
      "sales.contacts.create",
      "sales.leads.create",
      "activities.tasks.create",
    ]) {
      expect(can({ role: owner, resource, scope: "action" }), resource).toBe(true);
    }
  });

  it("keeps read-only roles read-only", () => {
    const viewer = rulesRoleForWorkspaceRole("VIEWER")!;
    expect(can({ role: viewer, resource: "sales.contacts.create", scope: "action" })).toBe(false);
  });

  it("ranks an owner above a member", () => {
    expect(roleLevel(rulesRoleForWorkspaceRole("OWNER")!)).toBeGreaterThan(
      roleLevel(rulesRoleForWorkspaceRole("MEMBER")!),
    );
  });
});
