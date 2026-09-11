import { describe, expect, it } from "vitest";
import { dashboardViewHref } from "@/lib/dashboard/views";

describe("dashboardViewHref", () => {
  it("sends executive overview to the dashboard root", () => {
    expect(dashboardViewHref("executive")).toBe("/");
  });

  it("puts other dashboards on the view query so Work Queue stays a list", () => {
    expect(dashboardViewHref("sales")).toBe("/?view=sales");
    expect(dashboardViewHref("performance")).toBe("/?view=performance");
    expect(dashboardViewHref("work-queue")).toBe("/?view=work-queue");
  });
});
