import { describe, expect, it } from "vitest";
import {
  rangeForTimeFilter,
  toWorkQueueApiFilter,
} from "@/lib/work-queue/api";
import {
  smokeWorkQueueMock,
  smokeWorkQueueWiring,
} from "@/lib/work-queue/smoke";

describe("Work Queue API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeWorkQueueWiring();
  });

  it("mocks GET /v1/workspaces/:id/work-queue", async () => {
    await smokeWorkQueueMock();
  });

  it("maps time filters and status/priority to API query values", () => {
    expect(toWorkQueueApiFilter("In Progress")).toBe("IN_PROGRESS");
    expect(toWorkQueueApiFilter("High")).toBe("HIGH");
    expect(toWorkQueueApiFilter("all")).toBeUndefined();

    const overdue = rangeForTimeFilter("overdue", new Date("2026-08-31T12:00:00"));
    expect(overdue.to).toBeTruthy();
    expect(overdue.from).toBeTruthy();

    const specific = rangeForTimeFilter(
      "specific-date",
      new Date("2026-08-31T12:00:00"),
      new Date("2026-01-15T08:00:00"),
    );
    expect(specific.from).toBeTruthy();
    expect(specific.to).toBeTruthy();
    expect(new Date(specific.from!).getTime()).toBeLessThan(
      new Date(specific.to!).getTime(),
    );

    const todayOverdue = rangeForTimeFilter(
      "today-overdue",
      new Date("2026-08-31T12:00:00"),
    );
    expect(todayOverdue.to).toBeTruthy();
    expect(new Date(todayOverdue.from ?? 0).getFullYear()).toBeLessThan(2026);
    expect(new Date(todayOverdue.from ?? 0).getFullYear()).toBeGreaterThan(2015);
  });
});
