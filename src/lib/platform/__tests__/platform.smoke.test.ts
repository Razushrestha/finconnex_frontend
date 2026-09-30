import { describe, expect, it } from "vitest";
import {
  smokePlatformMock,
  smokePlatformWiring,
} from "@/lib/platform/smoke";
import {
  isPlatformAdminRole,
  isSuperAdminRole,
  platformRoleLabel,
} from "@/lib/auth/platform";

describe("Platform console", () => {
  it("treats Nest globalRole ADMIN and SUPER_ADMIN as platform admin", () => {
    expect(isPlatformAdminRole("ADMIN")).toBe(true);
    expect(isPlatformAdminRole("admin")).toBe(true);
    expect(isPlatformAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isSuperAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isSuperAdminRole("ADMIN")).toBe(false);
    expect(isPlatformAdminRole("MEMBER")).toBe(false);
    expect(platformRoleLabel("SUPER_ADMIN")).toBe("Super admin");
    expect(platformRoleLabel("ADMIN")).toBe("Platform admin");
  });

  it("wires login, BFF, platform API client, and console routes", () => {
    expect(() => smokePlatformWiring()).not.toThrow();
  });

  it("mocks Super Admin /v1/platform stats, users, and workspaces", async () => {
    await smokePlatformMock();
  });
});
