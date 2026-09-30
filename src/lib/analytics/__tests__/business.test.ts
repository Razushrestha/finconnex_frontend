import { beforeEach, describe, expect, it } from "vitest";
import { seedCrmFixtures } from "@/test-support/crm-fixtures";
import { computeBusinessAnalytics } from "@/lib/analytics/business";

const july = new Date(2026, 6, 23, 12, 0, 0);

describe("business analytics", () => {
  beforeEach(() => seedCrmFixtures(july));

  it("builds growth KPIs, funnel, sources, and owner settlements from CRM stores", () => {
    const data = computeBusinessAnalytics({ dateRange: "all", owner: "All" }, july);

    expect(data.kpis.map((row) => row.id)).toEqual([
      "leads",
      "conversion",
      "revenue",
      "settlements",
      "win",
      "pipeline",
    ]);
    expect(Number(data.kpis[0]?.value)).toBeGreaterThan(0);
    expect(data.funnel[0]?.label).toBe("New leads");
    expect(data.funnel[0]?.pct).toBe(100);
    expect(data.funnel[data.funnel.length - 1]?.label).toBe("Settled");
    expect(data.owners.length).toBeGreaterThan(0);
    expect(data.trend.length).toBeGreaterThan(0);
  });
});
