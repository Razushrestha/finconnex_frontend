import { describe, expect, it } from "vitest";
import {
  smokeAnalyticsMock,
  smokeAnalyticsWiring,
} from "@/lib/analytics/smoke";
import { SECTION_LIVE_APIS } from "@/lib/analytics/hydrate";
import { ANALYTICS_SECTION_IDS } from "@/lib/analytics/library";

describe("analytics live APIs", () => {
  it("wires every section to its CRM routes", () => {
    smokeAnalyticsWiring();
    expect(Object.keys(SECTION_LIVE_APIS).sort()).toEqual(
      [...ANALYTICS_SECTION_IDS].sort(),
    );
  });

  it("hydrates leads from list + analytics widgets", async () => {
    await smokeAnalyticsMock();
  });
});
