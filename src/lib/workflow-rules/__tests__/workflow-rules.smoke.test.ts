import { describe, expect, it } from "vitest";
import {
  smokeWorkflowRulesMock,
  smokeWorkflowRulesWiring,
} from "@/lib/workflow-rules/smoke";

describe("Workflow rules API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeWorkflowRulesWiring();
  });

  it("mocks workflow-rules list/create/get/patch/delete/suggest", async () => {
    await smokeWorkflowRulesMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
