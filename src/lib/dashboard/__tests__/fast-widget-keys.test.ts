import { describe, expect, it } from "vitest";
import { DASHBOARD_ANALYTICS_WIDGETS } from "@/lib/dashboard/api";
import { dashboardFastWidgetKeys } from "@/lib/dashboard/fetch-live-stats";

describe("dashboardFastWidgetKeys", () => {
  it("uses analytics widget keys when the catalog is empty", () => {
    expect(dashboardFastWidgetKeys([])).toEqual([...DASHBOARD_ANALYTICS_WIDGETS]);
  });

  it("does not batch keys outside the analytics catalog", () => {
    const keys = dashboardFastWidgetKeys([
      "TOTAL_LEADS",
      "custom-a",
      "custom-b",
      "DEAL_STAGE_FUNNEL",
    ]);
    expect(keys).toEqual(["TOTAL_LEADS", "DEAL_STAGE_FUNNEL"]);
  });
});
