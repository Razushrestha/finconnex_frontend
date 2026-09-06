import { describe, expect, it } from "vitest";
import { computeCustomerAnalytics } from "@/lib/analytics/customers";

const july = new Date(2026, 6, 23, 12, 0, 0);

describe("customer analytics", () => {
  it("builds KPIs, funnel, sources, and lifetime table from CRM stores", () => {
    const data = computeCustomerAnalytics(
      { dateRange: "all", owner: "All", source: "All" },
      july,
    );

    expect(data.kpis.map((row) => row.id)).toEqual([
      "new",
      "conversion",
      "active",
      "repeat",
      "retention",
      "clv",
    ]);
    expect(Number(data.kpis[0]?.value)).toBeGreaterThan(0);
    expect(data.funnel[0]?.label).toBe("New Customers");
    expect(data.funnel[0]?.pct).toBe(100);
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.topCustomers.length).toBeGreaterThan(0);
    expect(data.distribution).toHaveLength(5);
    expect(data.engagement).toHaveLength(4);
  });
});
