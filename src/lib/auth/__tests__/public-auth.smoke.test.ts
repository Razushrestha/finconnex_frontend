import { describe, expect, it } from "vitest";
import {
  smokePublicAuthMock,
  smokePublicAuthWiring,
} from "@/lib/auth/smoke";

describe("Public auth API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokePublicAuthWiring();
  });

  it("mocks public.auth routes", async () => {
    await smokePublicAuthMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
