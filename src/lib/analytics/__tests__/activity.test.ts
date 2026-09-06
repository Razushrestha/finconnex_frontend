import { describe, expect, it } from "vitest";
import { computeActivityAnalytics, defaultActivityAnalyticsFilters } from "@/lib/analytics/activity";

const july = new Date(2026, 6, 23, 12, 0, 0);

describe("activity analytics", () => {
  it("builds first-response, duration, outcome, and timeline data from CRM stores", () => {
    const data = computeActivityAnalytics(
      { ...defaultActivityAnalyticsFilters(), dateRange: "all" },
      july,
    );

    expect(data.kpis.map((row) => row.id)).toEqual([
      "total",
      "response",
      "taskTime",
      "sla",
      "contact",
      "follow",
      "appt",
      "settle",
    ]);
    expect(data.response.within15).toBeGreaterThanOrEqual(0);
    expect(data.feed.length).toBeGreaterThan(0);
    expect(data.memberRows.length).toBeGreaterThan(0);
    expect(data.insights.length).toBeGreaterThan(0);
  });
});
