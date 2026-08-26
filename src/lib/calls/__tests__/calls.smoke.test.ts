import { describe, it } from "vitest";
import { smokeCallsMock, smokeCallsWiring } from "@/lib/calls/smoke";

describe("Calls CRM API", () => {
  it("wires Swagger call routes into the calls UI", () => {
    smokeCallsWiring();
  });

  it("mock client hits workspace-scoped call paths and unwraps data", async () => {
    await smokeCallsMock();
  });
});
