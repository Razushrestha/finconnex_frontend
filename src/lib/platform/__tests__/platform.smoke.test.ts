import { describe, expect, it } from "vitest";
import { smokePlatformWiring } from "@/lib/platform/smoke";
import {
  isPlatformAdminRole,
  platformRoleLabel,
} from "@/lib/auth/platform";

describe("Platform console", () => {
  it("treats Nest globalRole ADMIN as platform admin", () => {
    expect(isPlatformAdminRole("ADMIN")).toBe(true);
    expect(isPlatformAdminRole("admin")).toBe(true);
    expect(isPlatformAdminRole("MEMBER")).toBe(false);
    expect(platformRoleLabel("ADMIN")).toBe("Platform admin");
  });

  it("wires login, BFF, and console routes", () => {
    expect(() => smokePlatformWiring()).not.toThrow();
  });
});
