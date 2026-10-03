import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rules/actor", () => ({
  getRulesActor: () => ({ name: "Razu Shrestha", email: "razu@nepatronix.com" }),
}));

vi.mock("@/lib/user-profile/types", () => ({
  loadUserProfile: () => ({
    displayName: "",
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
  }),
}));

import { selfFromStores } from "@/lib/documents/signature/current-user";

describe("selfFromStores", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("uses the signed-in actor name and email", () => {
    expect(selfFromStores()).toEqual({
      name: "Razu Shrestha",
      email: "razu@nepatronix.com",
    });
  });
});
