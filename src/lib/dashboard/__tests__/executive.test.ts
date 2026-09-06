import { describe, expect, it } from "vitest";
import {
  computeExecutiveOverview,
  formatCompactMoney,
} from "@/lib/dashboard/executive";
import { defaultDashboardFilters } from "@/lib/dashboard/layout";

const july = new Date(2026, 6, 23, 12, 0, 0);

describe("executive overview", () => {
  it("builds a seven-stage funnel and live KPI totals from CRM stores", () => {
    const data = computeExecutiveOverview(
      { ...defaultDashboardFilters(), dateRange: "month" },
      july,
    );

    expect(data.funnel.map((row) => row.label)).toEqual([
      "New Lead",
      "In Conversation",
      "Appointment Booked",
      "Docs Requested",
      "Docs Submitted",
      "Approved",
      "Settled",
    ]);
    expect(data.newLeads).toBeGreaterThan(0);
    expect(data.activePipeline).toBeGreaterThan(0);
    expect(data.settlements).toBeGreaterThan(0);
    expect(data.commission).toBeGreaterThan(0);
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.alerts.length).toBeGreaterThan(0);
    expect(data.summary).toContain("settlement");
  });

  it("narrows totals when owner or loan type filters are applied", () => {
    const all = computeExecutiveOverview(
      { ...defaultDashboardFilters(), dateRange: "all" },
      july,
    );
    const john = computeExecutiveOverview(
      { ...defaultDashboardFilters(), dateRange: "all", owner: "John Smith" },
      july,
    );
    const refinance = computeExecutiveOverview(
      {
        ...defaultDashboardFilters(),
        dateRange: "all",
        loanType: "Refinance",
      },
      july,
    );

    expect(john.newLeads).toBeLessThanOrEqual(all.newLeads);
    expect(john.activePipeline).toBeLessThan(all.activePipeline);
    expect(refinance.activePipeline).toBeLessThan(all.activePipeline);
    expect(formatCompactMoney(1_200_000)).toBe("$1.2M");
  });
});
