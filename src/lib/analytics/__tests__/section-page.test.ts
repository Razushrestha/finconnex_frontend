import { beforeEach, describe, expect, it } from "vitest";
import { seedCrmFixtures } from "@/test-support/crm-fixtures";
import { computeSectionPage } from "@/lib/analytics/section-page";
import { ANALYTICS_SECTION_IDS } from "@/lib/analytics/library";

const july = new Date(2026, 6, 23, 12, 0, 0);

describe("analytics section pages", () => {
  beforeEach(() => seedCrmFixtures(july));

  it("builds the shared dashboard model for every section", () => {
    for (const id of ANALYTICS_SECTION_IDS) {
      const data = computeSectionPage(id, { dateRange: "all", owner: "All" }, july);
      expect(data.kpis).toHaveLength(6);
      expect(data.funnel.length).toBeGreaterThan(0);
      expect(data.trendTitle).toBeTruthy();
      expect(data.listTitle).toBeTruthy();
    }
  });

  it("keeps lead KPIs and a source breakdown", () => {
    const data = computeSectionPage("leads", { dateRange: "all", owner: "All" }, july);
    expect(data.kpis[0]?.id).toBe("new");
    expect(data.sliceTitle).toBe("Leads by source");
    expect(Number(data.kpis[0]?.value)).toBeGreaterThan(0);
  });
});
