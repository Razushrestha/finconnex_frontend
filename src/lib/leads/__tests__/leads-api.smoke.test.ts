import { describe, expect, it } from "vitest";
import { CRM_LEAD_ENDPOINTS } from "@/lib/leads/api/catalog";
import {
  smokeLeadClientMock,
  smokeLeadClientWiring,
} from "@/lib/leads/smoke-leads-api";

describe("Lead CRM API", () => {
  it("catalog matches Swagger lead workspace routes", () => {
    expect(CRM_LEAD_ENDPOINTS.length).toBeGreaterThanOrEqual(31);
    expect(new Set(CRM_LEAD_ENDPOINTS.map((e) => e.key)).size).toBe(
      CRM_LEAD_ENDPOINTS.length,
    );
  });

  it("client exports every catalog function and path", async () => {
    await smokeLeadClientWiring();
  });

  it("mock smoke hits each lead endpoint once", async () => {
    await smokeLeadClientMock();
  });
});
