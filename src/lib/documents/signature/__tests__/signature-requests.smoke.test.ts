import { describe, expect, it } from "vitest";
import {
  smokeSignatureRequestsMock,
  smokeSignatureRequestsWiring,
} from "@/lib/documents/signature/smoke";

describe("Signature Requests API smoke (CI)", () => {
  it("wires client, catalog, and UI", () => {
    smokeSignatureRequestsWiring();
  });

  it("mocks workspace-scoped signature-request routes", async () => {
    await smokeSignatureRequestsMock();
  });

  it("keeps SCREENSHOT_ENDPOINTS length at 5", async () => {
    const { SCREENSHOT_ENDPOINTS } = await import("@/lib/api/endpoints");
    expect(SCREENSHOT_ENDPOINTS).toHaveLength(5);
  });
});
