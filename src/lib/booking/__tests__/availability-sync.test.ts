import { describe, expect, it } from "vitest";
import { planLimitOverrides } from "@/lib/booking/availability-sync";
import type { AvailabilityLimitsValues } from "@/components/booking/AvailabilityLimitsStep";

const values = (
  customLimits: AvailabilityLimitsValues["customLimits"],
): AvailabilityLimitsValues =>
  ({
    customLimits,
  }) as AvailabilityLimitsValues;

describe("planLimitOverrides", () => {
  it("leaves a saved limit in place", () => {
    const plan = planLimitOverrides(
      [
        {
          id: "keep",
          date: "2026-10-07",
          isUnavailable: false,
          reason: "limit:2:1",
        },
      ],
      values([
        {
          id: "range",
          start: "2026-10-07",
          end: "2026-10-07",
          slotsPerEvent: "2",
          slotsPerCustomer: "1",
        },
      ]),
    );
    expect(plan.removeIds).toEqual([]);
    expect(plan.add).toEqual([]);
  });

  it("removes a dropped day and adds only the new one", () => {
    const plan = planLimitOverrides(
      [
        {
          id: "old",
          date: "2026-10-07",
          isUnavailable: false,
          reason: "limit:2:1",
        },
      ],
      values([
        {
          id: "range",
          start: "2026-10-08",
          end: "2026-10-08",
          slotsPerEvent: "2",
          slotsPerCustomer: "1",
        },
      ]),
    );
    expect(plan.removeIds).toEqual(["old"]);
    expect(plan.add.map((row) => row.date)).toEqual(["2026-10-08"]);
  });
});
