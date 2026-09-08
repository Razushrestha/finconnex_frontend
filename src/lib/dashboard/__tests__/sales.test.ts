import { beforeEach, describe, expect, it } from "vitest";
import { seedCrmFixtures } from "@/test-support/crm-fixtures";
import { computeSalesDashboard } from "@/lib/dashboard/sales";
import { defaultDashboardFilters } from "@/lib/dashboard/layout";

const july = new Date(2026, 6, 23, 12, 0, 0);

describe("sales dashboard", () => {
  beforeEach(() => seedCrmFixtures());

  it("builds live sales KPIs, funnel, and ranking tables", () => {
    const data = computeSalesDashboard(
      { ...defaultDashboardFilters(), dateRange: "all" },
      july,
    );
    expect(data.funnel).toHaveLength(7);
    expect(data.pipelineValue).toBeGreaterThan(0);
    expect(data.topSources.length).toBeGreaterThan(0);
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.lostDeals).toBeGreaterThan(0);
  });
});
