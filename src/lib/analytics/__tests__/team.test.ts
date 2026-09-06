import { describe, expect, it } from "vitest";
import { computeTeamAnalytics, defaultTeamAnalyticsFilters, rankMembers } from "@/lib/analytics/team";

const july = new Date(2026, 6, 23, 12, 0, 0);

describe("team analytics", () => {
  it("builds team KPIs, productivity, and member rankings from CRM stores", () => {
    const data = computeTeamAnalytics(
      { ...defaultTeamAnalyticsFilters(), dateRange: "all" },
      july,
    );

    expect(data.primaryKpis).toHaveLength(6);
    expect(data.extraKpis).toHaveLength(4);
    expect(data.memberRows.length).toBeGreaterThan(0);
    expect(data.productivity.length).toBeGreaterThan(0);
    expect(data.stageSpeed.length).toBeGreaterThan(0);
    expect(data.heatmap.length).toBeGreaterThan(0);
    expect(rankMembers(data.memberRows, "revenue")[0]?.owner).toBeTruthy();
  });
});
