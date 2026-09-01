import { describe, expect, it } from "vitest";
import { SCREENSHOT_ENDPOINTS } from "@/lib/api/endpoints";
import {
  smokeScreenshotMock,
  smokeScreenshotWiring,
} from "@/lib/crm/smoke-screenshot-apis";

describe("Screenshot CRM APIs", () => {
  it("catalog lists the five Swagger screenshot routes", () => {
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
    expect(SCREENSHOT_ENDPOINTS.map((e) => e.key).sort()).toEqual(
      [
        "adminDeleteUser",
        "adminWorkspaces",
        "analyticsWidget",
        "parentTimeline",
        "workspaceTimeline",
      ].sort(),
    );
  });

  it("frontend wiring matches those routes", () => {
    smokeScreenshotWiring();
  });

  it("mock clients hit each screenshot path once", async () => {
    await smokeScreenshotMock();
  });
});
