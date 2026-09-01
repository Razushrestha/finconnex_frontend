import { describe, expect, it } from "vitest";
import {
  smokeUserProfileMock,
  smokeUserProfileWiring,
} from "@/lib/user-profile/smoke";

describe("User profile API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeUserProfileWiring();
  });

  it("mocks user profile routes", async () => {
    await smokeUserProfileMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
